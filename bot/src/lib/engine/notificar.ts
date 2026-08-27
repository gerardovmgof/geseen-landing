// Avisos al responsable humano.
//
// Regla que viene de un fallo real en Kaire: escalar tiene que NOTIFICAR, no
// solo pausar. `pasar_con_la_duena` en Kaire pausa la conversación y ya — la
// dueña se entera entrando al panel web. Aquí no hay panel, así que pausar sin
// avisar es equivalente a perder al cliente.
//
// El problema: si Gerardo lleva más de 24h sin escribirle al bot, Meta no deja
// mandarle texto libre. Por eso el aviso sale por plantilla aprobada, que sí
// pasa siempre. Cuando él responde, se abre su ventana de 24h y ya puede
// platicar libre con el bot en modo administrador.

import { mandarPlantilla, mandarTexto, type ResultadoEnvio } from "@/lib/engine/whatsapp";
import { dentroDeVentana24h } from "@/lib/engine/state";

/**
 * Le avisa a Gerardo. Intenta texto libre si la ventana está abierta (se lee
 * mejor y no gasta plantilla) y cae a plantilla si no.
 *
 * `resumenCorto` es lo que va en el {{1}} de la plantilla: Meta no acepta saltos
 * de línea ni tabs en los parámetros, así que se aplana.
 */
export async function avisarAOwner(mensaje: string, resumenCorto: string): Promise<ResultadoEnvio> {
  const owner = process.env.OWNER_PHONE_NUMBER;
  if (!owner) {
    console.error("OWNER_PHONE_NUMBER no configurado: no hay a quién avisarle.");
    return { ok: false, motivo: "otro", detalle: "OWNER_PHONE_NUMBER no configurado" };
  }

  if (await dentroDeVentana24h(owner)) {
    const resultado = await mandarTexto(owner, mensaje);
    if (resultado.ok) return resultado;
    // La ventana local decía que sí pero Meta dijo que no. La verdad la tiene
    // Meta, así que se reintenta por plantilla en vez de darlo por perdido.
    if (resultado.motivo !== "fuera_de_ventana") return resultado;
  }

  const plantilla = process.env.WHATSAPP_TEMPLATE_AVISO_LEAD ?? "aviso_lead_nuevo";
  const resultado = await mandarPlantilla(owner, plantilla, [aplanar(resumenCorto)]);

  if (!resultado.ok) {
    // Último recurso: que quede en los logs del servidor. Si esto pasa seguido,
    // el monitor externo de /api/health es lo que lo va a delatar.
    console.error(`No se pudo avisarle a Gerardo (${resultado.motivo}): ${resultado.detalle}`);
    console.error(`Mensaje que se perdió: ${mensaje}`);
  }
  return resultado;
}

/** Meta rechaza parámetros de plantilla con saltos de línea, tabs o espacios dobles. */
function aplanar(texto: string): string {
  return texto.replace(/\s+/g, " ").trim().slice(0, 1000);
}
