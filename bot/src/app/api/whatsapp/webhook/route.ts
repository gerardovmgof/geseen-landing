// Webhook de la WhatsApp Cloud API.
//
// GET  → handshake de verificación cuando se registra la URL en Meta.
// POST → mensajes entrantes.
//
// Dos cosas que hay que respetar sí o sí:
//  1. Contestarle 200 a Meta RÁPIDO. Si tardamos, Meta reintenta y llegan
//     duplicados. Por eso el trabajo real va en `after()`: la respuesta sale
//     de inmediato y el procesamiento sigue después.
//  2. Verificar la firma. Sin eso, cualquiera que descubra la URL puede
//     inyectar mensajes falsos y hacer que el bot le escriba a quien sea,
//     con nuestro número y a nuestra cuenta.

import { after } from "next/server";
import {
  extraerMensajes,
  firmaValida,
  mandarTexto,
  type MensajeEntrante,
} from "@/lib/engine/whatsapp";
import {
  agregarAlHistorial,
  estaPausado,
  marcarMensajeProcesado,
  registrarMensajeDelCliente,
  setPausado,
} from "@/lib/engine/state";
import { avisarAOwner } from "@/lib/engine/notificar";
import { correrTurno, correrTurnoAdmin } from "@/lib/engine/agente";
import { esOwner, estadoHorario, mensajeFueraDeHorario } from "@/lib/config/negocio";

export const dynamic = "force-dynamic";

// ---- Verificación de la URL ----

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN;

  if (params.get("hub.mode") === "subscribe" && esperado && params.get("hub.verify_token") === esperado) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// ---- Mensajes entrantes ----

export async function POST(request: Request) {
  const cuerpoCrudo = await request.text();

  if (!firmaValida(cuerpoCrudo, request.headers.get("x-hub-signature-256"))) {
    return new Response("Firma inválida", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(cuerpoCrudo);
  } catch {
    // Contestamos 200 igual: si devolvemos error, Meta reintenta para siempre
    // un payload que nunca vamos a poder parsear.
    console.error("Payload de webhook ilegible:", cuerpoCrudo.slice(0, 500));
    return new Response("OK", { status: 200 });
  }

  const mensajes = extraerMensajes(payload as Parameters<typeof extraerMensajes>[0]);

  after(async () => {
    for (const mensaje of mensajes) {
      try {
        await procesar(mensaje);
      } catch (err) {
        console.error(`Error procesando ${mensaje.messageId} de ${mensaje.de}:`, err);
        await fallar(mensaje.de);
      }
    }
  });

  return new Response("OK", { status: 200 });
}

async function procesar(mensaje: MensajeEntrante): Promise<void> {
  // Meta reintenta los webhooks. Sin esto el bot contesta doble.
  if (!(await marcarMensajeProcesado(mensaje.messageId))) return;

  const { de } = mensaje;
  await registrarMensajeDelCliente(de);

  // --- Modo administrador (Gerardo) ---
  if (esOwner(de)) {
    const turno = await correrTurnoAdmin(de, mensaje.texto);
    await responder(de, turno.respuesta);
    await agregarAlHistorial(de, [
      { rol: "user", contenido: mensaje.texto, en: new Date().toISOString() },
      { rol: "assistant", contenido: turno.respuesta.join("\n"), en: new Date().toISOString() },
    ]);
    return;
  }

  // --- Un humano ya tomó esta conversación ---
  if (await estaPausado(de)) return;

  // --- Audio, foto, documento: no se pueden procesar, pero NUNCA se ignoran ---
  // Un cliente que manda una nota de voz y no recibe nada asume que lo dejamos
  // en visto. En México las notas de voz son comunísimas.
  if (mensaje.tipo === "no_soportado") {
    await responder(de, [
      "Perdón, no puedo escuchar audios ni abrir archivos por aquí.",
      "Déjame pasarlo con alguien del equipo para que te atienda bien.",
    ]);
    await setPausado(de, true, "esperando_humano");
    await avisarAOwner(
      `${de} mandó un ${mensaje.tipoOriginal} que el bot no puede procesar. La conversación quedó pausada.`,
      `${de} mando un ${mensaje.tipoOriginal}, requiere atencion humana`
    );
    return;
  }

  // --- Fuera del horario del bot: un solo mensaje y se queda quieto ---
  const horario = estadoHorario();
  if (!horario.botActivo) {
    await responder(de, mensajeFueraDeHorario(horario.cuandoContestan));
    return;
  }

  // --- Turno normal ---
  const turno = await correrTurno(de, mensaje.texto, horario);
  await responder(de, turno.respuesta);

  await agregarAlHistorial(de, [
    { rol: "user", contenido: mensaje.texto, en: new Date().toISOString() },
    { rol: "assistant", contenido: turno.respuesta.join("\n"), en: new Date().toISOString() },
  ]);

  if (turno.escalar) {
    await setPausado(de, true, turno.estadoFinal ?? "esperando_humano");
    // `avisoOwner` viene vacío a propósito para los descartes: un "no,
    // gracias" no necesita interrumpir a Gerardo.
    if (turno.avisoOwner) {
      await avisarAOwner(turno.avisoOwner.mensaje, turno.avisoOwner.resumenCorto);
    }
  }
}

/** Manda cada burbuja como mensaje aparte, en orden. */
async function responder(a: string, burbujas: string[]): Promise<void> {
  for (const burbuja of burbujas) {
    const resultado = await mandarTexto(a, burbuja);
    if (!resultado.ok) {
      // No se sigue mandando el resto: si la primera burbuja no salió, las
      // siguientes llegarían sin contexto y se leerían raro.
      console.error(`No se pudo mandar a ${a} (${resultado.motivo}): ${resultado.detalle}`);
      return;
    }
  }
}

/**
 * Si algo truena a media conversación: pausar y avisar. Cada paso es
 * independiente — si Meta también está caído no hay forma de avisarle al
 * cliente, pero la conversación debe quedar pausada de todos modos para que
 * el bot no siga contestando sobre un estado roto.
 */
async function fallar(telefono: string): Promise<void> {
  await setPausado(telefono, true, "esperando_humano").catch((err) =>
    console.error(`Tampoco se pudo pausar ${telefono}:`, err)
  );
  await mandarTexto(
    telefono,
    "Perdón, tuve un problema para contestarte. En un momento te ayuda alguien del equipo."
  ).catch(() => {});
  await avisarAOwner(
    `Falló el bot con ${telefono}. La conversación quedó pausada.`,
    `Fallo del bot con ${telefono}`
  ).catch(() => {});
}
