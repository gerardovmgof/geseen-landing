// Traducción de un lead del formulario de Meta a los datos que entiende el bot.
//
// Contexto (verificado en vivo, ver PLAN-LEADS-META.md): el botón "Chat on
// WhatsApp" del formulario NO lleva las respuestas al chat. Viven solo en el
// Centro de Leads de Meta. Este módulo las trae y las deja precargadas en Redis
// ANTES de que la persona escriba, para que el bot no vuelva a preguntar lo que
// ya contestó.
//
// Está separado del endpoint a propósito: todo aquí son funciones puras, así se
// pueden probar sin credenciales de Meta ni webhook corriendo.

import type { DatosLead } from "@/lib/engine/state";

const GRAPH_API_VERSION = "v21.0";

/** Un campo tal como lo devuelve `GET /{leadgen_id}`. */
export interface CampoLead {
  name: string;
  values: string[];
}

export interface LeadMapeado {
  /** Ya normalizado como llega en el webhook de WhatsApp, o `null` si no vino. */
  telefono: string | null;
  datos: DatosLead;
  /**
   * Campos que llegaron pero no supimos a dónde mandar. NUNCA se descartan en
   * silencio: los nombres reales de las preguntas los genera Meta y no están
   * confirmados todavía (ver "Pruebas" en PLAN-LEADS-META.md). Si algo cae aquí,
   * el endpoint lo registra en los logs para poder ajustar las reglas.
   */
  sinMapear: CampoLead[];
}

/**
 * Nombre de campo tal cual, solo en minúsculas. Para los campos INTEGRADOS de
 * Meta (`phone_number`, `full_name`...), que son constantes exactas CON guión
 * bajo. Ojo: no se puede usar `normalizarEtiqueta` aquí porque esa convierte
 * los guiones bajos en espacios y `phone_number` dejaría de coincidir.
 */
function nombreExacto(texto: string): string {
  return texto.trim().toLowerCase();
}

/** Minúsculas y sin acentos, para comparar contra las reglas sin depender de tildes. */
export function normalizarEtiqueta(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u00bf?\u00a1!]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Nombres fijos de los campos que Meta incluye de fábrica en todo formulario.
 * Estos SÍ son constantes documentadas — no hay que adivinarlos.
 */
const CAMPOS_INTEGRADOS = {
  telefono: ["phone_number"],
  nombre: ["full_name"],
  nombrePila: ["first_name"],
  apellido: ["last_name"],
  correo: ["email"],
} as const;

/**
 * Reglas para las 4 preguntas personalizadas del formulario "GESEEN - Leads
 * calificados". Meta genera el `name` a partir del texto de la pregunta, y ese
 * nombre exacto NO está confirmado todavía — por eso se busca por palabras
 * clave en vez de por igualdad exacta. Lo que no calce cae en `sinMapear` y se
 * ve en los logs, nunca se pierde.
 */
const REGLAS: Array<{ campo: keyof DatosLead; claves: string[] }> = [
  { campo: "dolor", claves: ["necesitas resolver", "que necesitas", "resolver"] },
  { campo: "presupuestoDeclarado", claves: ["presupuesto"] },
  { campo: "urgencia", claves: ["para cuando", "cuando lo necesitas", "urgencia"] },
  {
    campo: "tamanoNegocioDeclarado",
    claves: ["cuantas personas", "personas trabajan", "tamano de tu negocio", "empleados"],
  },
];

/**
 * Los números mexicanos llegan a veces con el "1" extra después del 52
 * (`5215614248036`) y a veces sin él (`525614248036`). El formulario capturó
 * `+525614248036`, pero WhatsApp puede mandar la otra forma para la misma
 * persona. Si no colapsan a lo mismo, la correlación falla en silencio y el
 * lead llega como desconocido.
 *
 * Esta es la MISMA lógica que `normalizarTelefono` de `whatsapp.ts`, duplicada
 * a propósito para que este módulo no dependa del de WhatsApp. Las dos tienen
 * que dar idéntico resultado — hay una prueba que lo verifica.
 */
export function normalizarTelefonoLead(telefono: string): string {
  const soloDigitos = telefono.replace(/\D/g, "");
  if (soloDigitos.startsWith("521") && soloDigitos.length === 13) {
    return `52${soloDigitos.slice(3)}`;
  }
  return soloDigitos;
}

/** Convierte el `field_data` crudo de Meta en datos del bot. */
export function mapearLead(fieldData: CampoLead[]): LeadMapeado {
  const datos: DatosLead = { origenFormulario: true };
  const sinMapear: CampoLead[] = [];
  let telefono: string | null = null;
  let nombrePila: string | null = null;
  let apellido: string | null = null;

  for (const campo of fieldData) {
    const valor = (campo.values ?? []).filter(Boolean).join(", ").trim();
    if (!valor) continue;

    // Dos normalizaciones distintas a propósito: los campos integrados son
    // constantes exactas con guión bajo, las preguntas custom se buscan por
    // palabras clave sin acentos.
    const exacto = nombreExacto(campo.name ?? "");
    const nombreCampo = normalizarEtiqueta(campo.name ?? "");

    if (CAMPOS_INTEGRADOS.telefono.includes(exacto as "phone_number")) {
      telefono = normalizarTelefonoLead(valor);
      continue;
    }
    if (CAMPOS_INTEGRADOS.nombre.includes(exacto as "full_name")) {
      datos.nombre = valor;
      continue;
    }
    if (CAMPOS_INTEGRADOS.nombrePila.includes(exacto as "first_name")) {
      nombrePila = valor;
      continue;
    }
    if (CAMPOS_INTEGRADOS.apellido.includes(exacto as "last_name")) {
      apellido = valor;
      continue;
    }
    // El correo no tiene lugar en DatosLead y el bot no lo usa para nada:
    // se ignora a propósito en vez de arrastrarlo sin razón.
    if (CAMPOS_INTEGRADOS.correo.includes(exacto as "email")) continue;

    const regla = REGLAS.find((r) => r.claves.some((clave) => nombreCampo.includes(clave)));
    if (regla) {
      (datos as Record<string, unknown>)[regla.campo] = valor;
    } else {
      sinMapear.push({ name: campo.name, values: campo.values });
    }
  }

  // Si el formulario usó nombre y apellido por separado en vez de full_name.
  if (!datos.nombre && (nombrePila || apellido)) {
    datos.nombre = [nombrePila, apellido].filter(Boolean).join(" ");
  }

  return { telefono, datos, sinMapear };
}

/** Trae un lead del Centro de Leads de Meta. Requiere permiso `leads_retrieval`. */
export async function traerLead(leadgenId: string): Promise<CampoLead[]> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("Falta META_PAGE_ACCESS_TOKEN.");

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${leadgenId}?fields=field_data,created_time&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Graph API rechazó el lead ${leadgenId} (HTTP ${res.status}): ${await res.text()}`);
  }

  const cuerpo = (await res.json()) as { field_data?: CampoLead[] };
  return cuerpo.field_data ?? [];
}

// ---- Payload del webhook ----

export interface AvisoLead {
  leadgenId: string;
  formId?: string;
  pageId?: string;
}

interface PayloadLeadgen {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: { leadgen_id?: string; form_id?: string; page_id?: string };
    }>;
  }>;
}

/**
 * Saca los avisos de lead del payload de Meta. Ignora cualquier `change` que no
 * sea del campo `leadgen` — una misma suscripción de Página puede mandar otros
 * eventos por la misma URL.
 */
export function extraerAvisosDeLead(payload: PayloadLeadgen): AvisoLead[] {
  const avisos: AvisoLead[] = [];
  for (const entry of payload.entry ?? []) {
    for (const cambio of entry.changes ?? []) {
      if (cambio.field !== "leadgen") continue;
      const id = cambio.value?.leadgen_id;
      if (!id) continue;
      avisos.push({ leadgenId: id, formId: cambio.value?.form_id, pageId: cambio.value?.page_id });
    }
  }
  return avisos;
}
