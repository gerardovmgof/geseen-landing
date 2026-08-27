// Webhook de leads (`leadgen`) de Meta.
//
// Cuando alguien somete el formulario del anuncio, Meta avisa aquí. Traemos sus
// respuestas del Centro de Leads y las dejamos precargadas en Redis con su
// teléfono como llave. Después, cuando esa persona escribe por WhatsApp, el bot
// ya sabe qué contestó y no se lo vuelve a preguntar.
//
// Mismo patrón que `api/whatsapp/webhook/route.ts`: verificación GET, firma
// obligatoria en POST, y `after()` para contestarle 200 a Meta de inmediato.
//
// Nota sobre la firma: se reusa `firmaValida` porque ambos webhooks cuelgan de
// la MISMA app de Meta, y Meta firma con el App Secret de la app, no del
// producto. Si algún día los leads se mueven a otra app, esto necesita su
// propio secreto.

import { after } from "next/server";
import { firmaValida } from "@/lib/engine/whatsapp";
import { guardarDatos, marcarMensajeProcesado } from "@/lib/engine/state";
import {
  extraerAvisosDeLead,
  mapearLead,
  traerLead,
  type AvisoLead,
} from "@/lib/engine/meta-leads";

export const dynamic = "force-dynamic";

// ---- Verificación de la URL ----

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const esperado = process.env.META_LEADGEN_VERIFY_TOKEN;

  if (params.get("hub.mode") === "subscribe" && esperado && params.get("hub.verify_token") === esperado) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// ---- Leads entrantes ----

export async function POST(request: Request) {
  const cuerpoCrudo = await request.text();

  if (!firmaValida(cuerpoCrudo, request.headers.get("x-hub-signature-256"))) {
    return new Response("Firma inválida", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(cuerpoCrudo);
  } catch {
    // 200 a propósito: si devolvemos error, Meta reintenta para siempre un
    // payload que nunca vamos a poder parsear.
    console.error("Payload de leadgen ilegible:", cuerpoCrudo.slice(0, 500));
    return new Response("OK", { status: 200 });
  }

  const avisos = extraerAvisosDeLead(payload as Parameters<typeof extraerAvisosDeLead>[0]);

  after(async () => {
    for (const aviso of avisos) {
      try {
        await procesarLead(aviso);
      } catch (err) {
        // Aquí no hay a quién contestarle: la persona todavía no ha escrito por
        // WhatsApp. Si esto falla, el lead simplemente llegará sin precargar y
        // el bot lo calificará desde cero — degradado, no roto.
        console.error(`No se pudo procesar el lead ${aviso.leadgenId}:`, err);
      }
    }
  });

  return new Response("OK", { status: 200 });
}

async function procesarLead(aviso: AvisoLead): Promise<void> {
  // Meta reintenta los webhooks igual que con los mensajes. Sin esto, un mismo
  // lead se procesaría varias veces (inofensivo porque `guardarDatos` mezcla,
  // pero gasta llamadas a la Graph API sin razón).
  if (!(await marcarMensajeProcesado(`lead-${aviso.leadgenId}`))) return;

  const fieldData = await traerLead(aviso.leadgenId);
  const { telefono, datos, sinMapear } = mapearLead(fieldData);

  if (sinMapear.length > 0) {
    // Los nombres reales de las preguntas los genera Meta y no están
    // confirmados (ver "Pruebas" en PLAN-LEADS-META.md). Si algo cae aquí, hay
    // que ajustar REGLAS en meta-leads.ts — pero se ve, no se pierde callado.
    console.warn(
      `Lead ${aviso.leadgenId}: campos sin mapear →`,
      sinMapear.map((c) => c.name).join(", ")
    );
  }

  if (!telefono) {
    console.error(
      `Lead ${aviso.leadgenId} sin teléfono: no hay forma de correlacionarlo con WhatsApp. Campos recibidos: ${fieldData.map((c) => c.name).join(", ")}`
    );
    return;
  }

  await guardarDatos(telefono, datos);
  console.info(
    `Lead ${aviso.leadgenId} precargado para ${telefono} (${Object.keys(datos).join(", ")})`
  );
}
