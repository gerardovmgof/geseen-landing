// Chequeo periódico de leads que llenaron el formulario y nunca escribieron.
//
// El problema que resuelve: el bot solo despierta cuando llega un mensaje de
// WhatsApp. Si alguien llena el formulario del anuncio y no llega a escribir,
// sus datos quedan precargados en Redis y NADIE se entera nunca. Ese lead está
// pagado con dinero de anuncios y se pierde en silencio.
//
// Qué hace: junta los pendientes y le manda UNA lista a Gerardo. No les escribe
// a ellos.
//
// Por qué no les escribe el bot directamente: quien llenó el formulario pero no
// mandó mensaje NUNCA abrió la ventana de 24 horas de Meta, así que un texto
// libre no se entrega. Haría falta una plantilla aprobada aparte, con costo por
// mensaje y riesgo de spam. Avisarle a Gerardo no cuesta nada extra y él decide
// a quién vale la pena perseguir.

import { avisarAOwner } from "@/lib/engine/notificar";
import { listarLeadsSinMensaje, marcarAvisoSinMensaje, type Conversacion } from "@/lib/engine/state";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cuánto esperar antes de considerar que un lead "no escribió". Alguien puede
 * llenar el formulario y escribir cinco minutos después — avisar de inmediato
 * sería molestar por nada.
 */
const GRACIA_MS = 60 * 60 * 1000; // 1 hora

/** Tope por corrida, para que un pico de leads no genere un mensaje ilegible. */
const MAX_POR_AVISO = 10;

export async function GET(request: Request) {
  // Vercel Cron manda CRON_SECRET como Bearer. Sin esto, cualquiera que
  // descubra la URL puede dispararlo y gastar avisos.
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let pendientes: Conversacion[];
  try {
    pendientes = await listarLeadsSinMensaje(GRACIA_MS);
  } catch (err) {
    console.error("No se pudieron listar los leads pendientes:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }

  if (pendientes.length === 0) {
    return Response.json({ ok: true, pendientes: 0, avisados: 0 });
  }

  const aAvisar = pendientes.slice(0, MAX_POR_AVISO);
  const resultado = await avisarAOwner(
    construirMensaje(aAvisar, pendientes.length),
    `${pendientes.length} lead(s) del formulario sin escribir todavia`
  );

  if (!resultado.ok) {
    // Si el aviso no salió, NO se marcan como avisados: que lo reintente la
    // siguiente corrida en vez de perderlos para siempre.
    console.error(`No se pudo avisar de los leads pendientes: ${resultado.detalle}`);
    return Response.json({ ok: false, pendientes: pendientes.length, avisados: 0 }, { status: 502 });
  }

  for (const conv of aAvisar) {
    await marcarAvisoSinMensaje(conv.telefono).catch((err) =>
      // Peor caso: se repite el lead en la siguiente corrida. Molesto, no grave.
      console.error(`No se pudo marcar como avisado a ${conv.telefono}:`, err)
    );
  }

  return Response.json({ ok: true, pendientes: pendientes.length, avisados: aAvisar.length });
}

function construirMensaje(leads: Conversacion[], total: number): string {
  const lineas = leads.map((conv) => {
    const d = conv.datos;
    const quien = d.nombre ? `${d.nombre} (${conv.telefono})` : conv.telefono;
    const detalle = [d.dolor, d.presupuestoDeclarado, d.urgencia].filter(Boolean).join(" · ");
    return detalle ? `• ${quien} — ${detalle}` : `• ${quien}`;
  });

  const encabezado =
    leads.length === 1
      ? "Un lead llenó el formulario y no ha escrito por WhatsApp:"
      : `${leads.length} leads llenaron el formulario y no han escrito por WhatsApp:`;

  const pie =
    total > leads.length
      ? `\n\nHay ${total - leads.length} más en la misma situación.`
      : "";

  return `${encabezado}\n\n${lineas.join("\n")}${pie}\n\nSus respuestas ya están guardadas: si escriben, el bot ya sabe qué necesitan.`;
}
