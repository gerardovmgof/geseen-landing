// Cliente de la WhatsApp Cloud API de Meta.
//
// Esto es MOTOR, no configuración: nada aquí sabe que el negocio es GESEEN.
// Un segundo cliente reusa este archivo tal cual y solo cambia `config/`.
//
// Diferencias contra la versión de Kaire (`~/Documents/CLAUDE/Kaire/src/lib/whatsapp.ts`),
// todas por fallos reales que ahí no están cubiertos:
//  1. Soporta plantillas — sin ellas no se puede escribir fuera de la ventana de 24h.
//  2. Los mensajes que no son texto se devuelven en vez de descartarse en silencio.
//  3. Los envíos devuelven un resultado tipado en vez de tronar, para que quien
//     llama pueda distinguir "fuera de ventana" de "token muerto" y avisar.
//  4. Verifica la firma del webhook.
//  5. Normaliza los teléfonos mexicanos (el "1" después del 52).

import crypto from "node:crypto";

const GRAPH_API_VERSION = "v21.0";

// ---- Códigos de error de Meta que sí hay que distinguir ----
const ERROR_TOKEN_INVALIDO = 190;
const ERROR_FUERA_DE_VENTANA = 131047;
const ERROR_NO_ENTREGABLE = 131026;

export type FalloEnvio = "fuera_de_ventana" | "token_invalido" | "no_entregable" | "otro";

export type ResultadoEnvio =
  | { ok: true }
  | { ok: false; motivo: FalloEnvio; detalle: string };

/**
 * Los números mexicanos llegan a veces como 521XXXXXXXXXX y a veces como
 * 52XXXXXXXXXX (el "1" es una herencia de la numeración vieja de celulares).
 * Si guardamos uno y comparamos contra el otro, el modo administrador deja de
 * reconocer a su propio dueño y el historial se parte en dos conversaciones
 * distintas para la misma persona. Todo entra y sale por aquí.
 */
export function normalizarTelefono(telefono: string): string {
  const soloDigitos = telefono.replace(/\D/g, "");
  if (soloDigitos.startsWith("521") && soloDigitos.length === 13) {
    return `52${soloDigitos.slice(3)}`;
  }
  return soloDigitos;
}

function credenciales(): { phoneNumberId: string; token: string } {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    throw new Error("Faltan WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN.");
  }
  return { phoneNumberId, token };
}

async function enviar(payload: Record<string, unknown>): Promise<ResultadoEnvio> {
  const { phoneNumberId, token } = credenciales();

  let res: Response;
  try {
    res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    });
  } catch (err) {
    return { ok: false, motivo: "otro", detalle: `Error de red: ${String(err)}` };
  }

  if (res.ok) return { ok: true };

  const cuerpo = await res.text();
  let codigo: number | undefined;
  try {
    codigo = JSON.parse(cuerpo)?.error?.code;
  } catch {
    // Si Meta devolvió algo que no es JSON, nos quedamos sin código pero el
    // texto crudo igual sirve para diagnosticar.
  }

  const motivo: FalloEnvio =
    codigo === ERROR_FUERA_DE_VENTANA
      ? "fuera_de_ventana"
      : codigo === ERROR_TOKEN_INVALIDO
        ? "token_invalido"
        : codigo === ERROR_NO_ENTREGABLE
          ? "no_entregable"
          : "otro";

  return { ok: false, motivo, detalle: `HTTP ${res.status}: ${cuerpo}` };
}

/**
 * Manda texto libre. Solo se entrega DENTRO de la ventana de 24 horas desde el
 * último mensaje del cliente. Fuera de ella devuelve `fuera_de_ventana` y hay
 * que usar una plantilla.
 */
export function mandarTexto(a: string, texto: string): Promise<ResultadoEnvio> {
  return enviar({ to: normalizarTelefono(a), type: "text", text: { body: texto } });
}

/**
 * Manda una plantilla aprobada. Es la ÚNICA forma de escribirle a alguien que
 * lleva más de 24 horas sin mandarnos nada.
 *
 * Los `parametros` llenan los {{1}}, {{2}}... del cuerpo de la plantilla, en orden.
 */
export function mandarPlantilla(
  a: string,
  nombre: string,
  parametros: string[] = [],
  idioma = process.env.WHATSAPP_TEMPLATE_LANG ?? "es_MX"
): Promise<ResultadoEnvio> {
  return enviar({
    to: normalizarTelefono(a),
    type: "template",
    template: {
      name: nombre,
      language: { code: idioma },
      ...(parametros.length > 0 && {
        components: [
          {
            type: "body",
            parameters: parametros.map((texto) => ({ type: "text", text: texto })),
          },
        ],
      }),
    },
  });
}

// ---- Entrada ----

export interface MensajeEntrante {
  messageId: string;
  de: string; // E.164 sin "+", ya normalizado
  timestamp: string;
  /**
   * `texto` es lo único que el modelo puede procesar. `no_soportado` son audios,
   * fotos, documentos, ubicaciones, stickers. NO se descartan: en México las
   * notas de voz son comunísimas, y un cliente que manda un audio y no recibe
   * nada asume que lo ignoraron. Van a escalamiento con humano.
   */
  tipo: "texto" | "no_soportado";
  texto: string;
  tipoOriginal: string;
}

interface MensajeCrudo {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface PayloadWebhook {
  entry?: Array<{ changes?: Array<{ value?: { messages?: MensajeCrudo[] } }> }>;
}

/**
 * Saca los mensajes entrantes del payload de Meta.
 *
 * Ignora las notificaciones de estado (`statuses`: entregado, leído), que no
 * traen la llave `messages`. Todo lo demás se devuelve, incluido lo que no
 * sabemos procesar — quien llama decide qué hacer, pero nunca se pierde.
 */
export function extraerMensajes(payload: PayloadWebhook): MensajeEntrante[] {
  const mensajes: MensajeEntrante[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value?.messages ?? []) {
        const esTexto = m.type === "text" && typeof m.text?.body === "string";
        mensajes.push({
          messageId: m.id,
          de: normalizarTelefono(m.from),
          timestamp: m.timestamp,
          tipo: esTexto ? "texto" : "no_soportado",
          texto: esTexto ? m.text!.body : "",
          tipoOriginal: m.type,
        });
      }
    }
  }

  return mensajes;
}

// ---- Seguridad ----

/**
 * Meta firma cada webhook con el App Secret. Sin verificarlo, cualquiera que
 * descubra la URL puede inyectar mensajes falsos y hacer que el bot le escriba
 * a quien quiera, con nuestro número y a nuestra cuenta.
 *
 * Hay que pasarle el cuerpo CRUDO, tal cual llegó. Si se parsea y se vuelve a
 * serializar, el hash cambia y la verificación falla siempre.
 */
export function firmaValida(cuerpoCrudo: string, encabezadoFirma: string | null): boolean {
  const secreto = process.env.META_APP_SECRET;
  if (!secreto) {
    console.error("META_APP_SECRET no está configurado: se rechaza el webhook.");
    return false;
  }
  if (!encabezadoFirma?.startsWith("sha256=")) return false;

  const esperado = crypto.createHmac("sha256", secreto).update(cuerpoCrudo, "utf8").digest();
  const recibido = Buffer.from(encabezadoFirma.slice("sha256=".length), "hex");

  // timingSafeEqual truena si los largos difieren, así que se compara antes.
  if (recibido.length !== esperado.length) return false;
  return crypto.timingSafeEqual(recibido, esperado);
}

/**
 * Le pega a la Graph API para saber si el token sigue vivo. Lo usa /api/health.
 * El código 190 de Meta significa token revocado o expirado — que es justo lo
 * que pasa a los ~60 días si alguien instaló producción con un token personal
 * en vez de uno de usuario de sistema.
 */
export async function tokenVivo(): Promise<{ vivo: boolean; detalle?: string }> {
  try {
    const { phoneNumberId, token } = credenciales();
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}?fields=id`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) return { vivo: true };
    return { vivo: false, detalle: `HTTP ${res.status}: ${await res.text()}` };
  } catch (err) {
    return { vivo: false, detalle: String(err) };
  }
}
