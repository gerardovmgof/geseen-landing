// PASO 4 — el loop de tool use contra DeepSeek.
//
// Manda el system prompt + historial a DeepSeek (API compatible con OpenAI),
// ejecuta las herramientas que pida, le devuelve el resultado, y repite hasta
// que dé texto final. Dos modos, cada uno con su propio prompt y sus propias
// herramientas: cliente (calificar leads) y administrador (Gerardo).
//
// Esto SÍ es motor: no sabe nada del catálogo de servicios de GESEEN ni de su
// tono de marca — eso vive en `config/prompts.ts`. Lo que sí conoce son los
// conceptos genéricos de cualquier bot de calificación B2B por WhatsApp:
// guardar datos de un lead, pasarlo a cotización, escalarlo, descartarlo, y
// del lado del administrador, listar/consultar/pausar/reactivar conversaciones.
//
// Si algo sale mal a medio turno (DeepSeek no contesta, JSON roto, se agotan
// los intentos), la conducta segura es SIEMPRE escalar con Gerardo, nunca
// inventar una respuesta ni dejar al cliente sin nada.

import OpenAI from "openai";
import type { EstadoHorario } from "@/lib/config/negocio";
import { PROMPT_ADMIN, PROMPT_CLIENTE } from "@/lib/config/prompts";
import { mandarTexto } from "@/lib/engine/whatsapp";
import {
  agregarAlHistorial,
  buscarLeads,
  dentroDeVentana24h,
  guardarDatos,
  listarConversaciones,
  obtenerConversacion,
  setPausado,
  type Conversacion,
  type DatosLead,
  type EstadoLead,
  type TurnoConversacion,
} from "@/lib/engine/state";

const MODELO = "deepseek-chat";
const MAX_TOKENS = 700;
// Suficiente para varias `guardar_datos_lead` sueltas más una herramienta de
// cierre y el texto final. Si se agota, algo salió raro y toca escalar, no
// seguir insistiendo — cada vuelta extra es una llamada a la API que pagamos.
const MAX_TOOL_ITERATIONS = 6;

const FALLBACK_CLIENTE =
  "Perdón, tuve un problema para contestarte. En un momento te ayuda alguien del equipo.";
const FALLBACK_ADMIN =
  "No pude procesar eso. Si es urgente, mejor revísalo directo en el chat con el cliente.";

export interface TurnoAgente {
  /** Burbujas a mandarle al cliente, en orden. Vacío = no contestar nada. */
  respuesta: string[];
  /** Si la conversación queda en manos de un humano (el bot se pausa). */
  escalar: boolean;
  /** A qué estado queda el lead. Solo se usa si `escalar` es true. */
  estadoFinal?: EstadoLead;
  /** Si hay que avisarle a Gerardo, y con qué texto. `undefined` = no avisar. */
  avisoOwner?: { mensaje: string; resumenCorto: string };
}

let clienteDeepSeekCache: OpenAI | null = null;

/** Igual que `redis()` en state.ts: perezoso, para no tronar al importar el módulo. */
function clienteDeepSeek(): OpenAI {
  if (clienteDeepSeekCache) return clienteDeepSeekCache;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("Falta DEEPSEEK_API_KEY.");
  clienteDeepSeekCache = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
  return clienteDeepSeekCache;
}

// ---- Herramientas — modo cliente ----

const HERRAMIENTAS_CLIENTE: OpenAI.ChatCompletionFunctionTool[] = [
  {
    type: "function",
    function: {
      name: "guardar_datos_lead",
      description:
        "Guarda lo que acabas de aprender del lead. Acumulativo: manda solo los campos nuevos de este turno, no repitas los que ya guardaste antes. Llámala en cuanto aprendas algo, sin esperar a tener todo.",
      parameters: {
        type: "object",
        properties: {
          nombre: { type: "string", description: "Cómo se llama la persona." },
          giro: { type: "string", description: "A qué se dedica el negocio." },
          ciudad: { type: "string" },
          dolor: { type: "string", description: "Qué le quita tiempo, qué se le cae, qué hace a mano." },
          como_lo_resuelve_hoy: { type: "string", description: "Cuaderno, Excel, WhatsApp personal, nada." },
          volumen: { type: "string", description: "Cuántos pedidos/citas/mensajes al día, y quién los atiende." },
          urgencia: { type: "string", description: "Para cuándo lo quiere." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pasar_a_cotizacion",
      description:
        "El lead califica: tienes al menos nombre, giro, dolor y volumen. Pausa la conversación y le manda a Gerardo el resumen ya armado para que el equipo cotice.",
      parameters: {
        type: "object",
        properties: {
          resumen: {
            type: "string",
            description:
              "Texto plano con el formato de la sección 9 del prompt: LEAD — [nombre del negocio o giro], luego Contacto/Giro/Ciudad/Qué le duele/Cómo lo resuelve hoy/Volumen/Urgencia/Servicio que le queda/Presupuesto que mencionó/Notas. Lo que no sepas, pon 'no lo dijo'. No lo inventes.",
          },
        },
        required: ["resumen"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pasar_con_gerardo",
      description:
        "Algo se salió del guion y hace falta una persona ahora: insistió en precio, pidió hablar con alguien, se molestó, preguntó algo técnico que no puedes responder sin inventar, mandó audio/imagen/documento, habló de pagos o contratos, o tienes cualquier duda genuina. Pausa la conversación y avisa a Gerardo.",
      parameters: {
        type: "object",
        properties: {
          motivo: { type: "string", description: "Por qué se escala, en una frase corta." },
        },
        required: ["motivo"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "descartar_lead",
      description:
        "El cliente dijo que no ('gracias por su opinión', 'lo voy a pensar', 'ahorita no'). Cierra sin insistir, sin ofrecer otra cosa, sin preguntar por qué.",
      parameters: {
        type: "object",
        properties: {
          motivo: { type: "string", description: "Por qué se descarta, en una frase corta." },
        },
        required: ["motivo"],
        additionalProperties: false,
      },
    },
  },
];

// ---- Herramientas — modo administrador ----

const HERRAMIENTAS_ADMIN: OpenAI.ChatCompletionFunctionTool[] = [
  {
    type: "function",
    function: {
      name: "listar_leads",
      description:
        "Lista las conversaciones más recientes con su estado, giro y hace cuánto escribieron. Úsala para 'cómo van los leads', 'qué hay', 'quién está activo'.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "ver_conversacion",
      description:
        "Busca un lead por nombre o teléfono y trae su historial completo. Si hay más de una coincidencia, te devuelve la lista de candidatos para que le preguntes a Gerardo cuál es antes de actuar.",
      parameters: {
        type: "object",
        properties: {
          identificador: {
            type: "string",
            description: "Nombre del lead (o parte de él) o fragmento de su teléfono.",
          },
        },
        required: ["identificador"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mandar_mensaje_a_cliente",
      description:
        "Le manda un mensaje de texto a un lead, tal cual lo dicta Gerardo. No reactiva el bot — si quiere que el bot retome la conversación, hay que llamar reactivar_bot aparte.",
      parameters: {
        type: "object",
        properties: {
          identificador: { type: "string", description: "Nombre o fragmento de teléfono del lead." },
          mensaje: { type: "string", description: "Texto exacto a mandar." },
        },
        required: ["identificador", "mensaje"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reactivar_bot",
      description: "Vuelve a encender el bot en la conversación de un lead pausado.",
      parameters: {
        type: "object",
        properties: { identificador: { type: "string", description: "Nombre o fragmento de teléfono." } },
        required: ["identificador"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pausar_bot",
      description: "Apaga el bot para un lead: deja de contestarle en automático hasta que se reactive.",
      parameters: {
        type: "object",
        properties: { identificador: { type: "string", description: "Nombre o fragmento de teléfono." } },
        required: ["identificador"],
        additionalProperties: false,
      },
    },
  },
];

// ---- Turno — modo cliente ----

/**
 * Frases que suenan a "ya lo pasé"/"ya te escalé" sin haber llamado ninguna
 * herramienta en el mismo turno. Es el mismo fallo que ya se vio en producción
 * en Kaire (el modelo prometía un cambio y nunca lo ejecutaba): salvaguarda de
 * código, no solo de prompt, porque instruir "llama la herramienta" no basta
 * por sí solo. Solo se revisa cuando NO hubo tool_calls — con herramienta de
 * por medio, esta misma frase es exactamente la respuesta correcta.
 */
const REGEX_FALSA_CONFIRMACION =
  /\b(ya (te |lo )?(pas[eé]|escal[eé])|ya qued[oó] (registrad[oa]|pasad[oa]|anotad[oa])|en un momento te (contacta|escribe|responde)|el equipo (ya )?te (contacta|escribe|responde)|ya (le )?avis[eé] al equipo)\b/i;

const AVISO_FALSA_CONFIRMACION =
  "(Aviso automático: no llamaste ninguna herramienta en tu respuesta anterior, así que no se guardó ni se escaló nada. Si de verdad quieres pasar la conversación, llama a la herramienta correspondiente ahora mismo.)";

export async function correrTurno(
  telefono: string,
  texto: string,
  horario: EstadoHorario
): Promise<TurnoAgente> {
  const conv = await obtenerConversacion(telefono);

  const mensajes: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: construirSystemPromptCliente(conv.datos, horario) },
    ...conv.historial.map(aMensajeOpenAI),
    { role: "user", content: texto },
  ];

  let escalacion: { estadoFinal: EstadoLead; avisoOwner?: { mensaje: string; resumenCorto: string } } | null =
    null;
  let avisoDado = false;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const mensaje = await pedirCompletado(mensajes, HERRAMIENTAS_CLIENTE);
    if (!mensaje) break;

    const llamadas = (mensaje.tool_calls ?? []).filter(esLlamadaAFuncion);

    if (llamadas.length === 0) {
      const textoFinal = mensaje.content ?? "";

      if (!avisoDado && !escalacion && REGEX_FALSA_CONFIRMACION.test(textoFinal)) {
        avisoDado = true;
        mensajes.push({ role: "assistant", content: textoFinal });
        mensajes.push({ role: "user", content: AVISO_FALSA_CONFIRMACION });
        continue;
      }

      const burbujas = dividirEnBurbujas(textoFinal);
      if (burbujas.length > 0) {
        return { respuesta: burbujas, escalar: Boolean(escalacion), ...escalacion };
      }
      break; // sin tool_calls y sin texto: no hay nada que hacer, se cae al fallback de abajo
    }

    mensajes.push({ role: "assistant", content: mensaje.content, tool_calls: mensaje.tool_calls });

    for (const llamada of llamadas) {
      const args = parsearArgumentos(llamada.function.arguments);
      const salida = await ejecutarHerramientaCliente(llamada.function.name, args, telefono);
      mensajes.push({ role: "tool", tool_call_id: llamada.id, content: JSON.stringify(salida) });

      const nuevaEscalacion = resolverEscalacion(llamada.function.name, args, telefono);
      if (nuevaEscalacion) escalacion = nuevaEscalacion;
    }
  }

  // Se acabaron los intentos sin texto final utilizable. Si ya se había
  // decidido escalar (ej. llamó pasar_con_gerardo pero luego no dio texto de
  // cierre), se respeta esa decisión tal cual — incluido que descartar_lead
  // no lleva aviso a Gerardo. Solo se avisa de un fallo del bot cuando NINGUNA
  // herramienta de cierre llegó a ejecutarse.
  return {
    respuesta: [FALLBACK_CLIENTE],
    escalar: true,
    estadoFinal: escalacion?.estadoFinal ?? "esperando_humano",
    avisoOwner: escalacion
      ? escalacion.avisoOwner
      : avisoFallo(telefono, "se agotaron los turnos de herramientas sin una respuesta final"),
  };
}

/**
 * Exportada solo para prueba unitaria (`agente.test.ts`): mapea una llamada a
 * herramienta de cierre → estado final + qué avisarle a Gerardo, sin tocar
 * red ni Redis. Es la pieza que decide si un descarte avisa o no — un bug acá
 * es silencioso (nadie ve el aviso de más, o falta el aviso importante) hasta
 * que alguien nota que Gerardo recibió spam de descartes o se le pasó un lead
 * calificado.
 */
export function resolverEscalacion(
  nombreHerramienta: string,
  args: Record<string, unknown>,
  telefono: string
): { estadoFinal: EstadoLead; avisoOwner?: { mensaje: string; resumenCorto: string } } | null {
  switch (nombreHerramienta) {
    case "pasar_a_cotizacion": {
      const resumen = typeof args.resumen === "string" && args.resumen ? args.resumen : "(sin resumen)";
      return {
        estadoFinal: "calificado",
        avisoOwner: {
          mensaje: `Lead calificado — ${telefono}\n\n${resumen}`,
          resumenCorto: `Lead calificado: ${telefono}`,
        },
      };
    }
    case "pasar_con_gerardo": {
      const motivo = typeof args.motivo === "string" && args.motivo ? args.motivo : "sin especificar";
      return {
        estadoFinal: "esperando_humano",
        avisoOwner: {
          mensaje: `Conversación con ${telefono} escalada. Motivo: ${motivo}.`,
          resumenCorto: `Lead ${telefono} escalado: ${motivo}`,
        },
      };
    }
    case "descartar_lead":
      // Sin aviso urgente: el descarte queda registrado en el estado, no hace
      // falta interrumpir a Gerardo por un "no, gracias".
      return { estadoFinal: "descartado" };
    default:
      return null;
  }
}

async function ejecutarHerramientaCliente(
  nombre: string,
  args: Record<string, unknown>,
  telefono: string
): Promise<unknown> {
  switch (nombre) {
    case "guardar_datos_lead": {
      const datos: DatosLead = {};
      if (esTexto(args.nombre)) datos.nombre = args.nombre;
      if (esTexto(args.giro)) datos.giro = args.giro;
      if (esTexto(args.ciudad)) datos.ciudad = args.ciudad;
      if (esTexto(args.dolor)) datos.dolor = args.dolor;
      if (esTexto(args.como_lo_resuelve_hoy)) datos.comoLoResuelveHoy = args.como_lo_resuelve_hoy;
      if (esTexto(args.volumen)) datos.volumen = args.volumen;
      if (esTexto(args.urgencia)) datos.urgencia = args.urgencia;
      const guardado = await guardarDatos(telefono, datos);
      return { ok: true, datos: guardado };
    }
    // Estas tres solo confirman al modelo que se registró la llamada. El
    // efecto real (pausar, avisar a Gerardo) se aplica UNA vez, en route.ts,
    // después de que el turno completo termina — no aquí, para no aplicarlo
    // dos veces si el modelo repitiera la llamada.
    case "pasar_a_cotizacion":
    case "pasar_con_gerardo":
    case "descartar_lead":
      return { ok: true };
    default:
      return { error: `Herramienta desconocida: ${nombre}` };
  }
}

function construirSystemPromptCliente(datos: DatosLead, horario: EstadoHorario): string {
  // Ojo: hay que aceptar booleanos, no solo strings. `origenFormulario` es
  // booleano y si se filtra aquí nunca llega al modelo — la condición del
  // guion corto en cliente.md no se activaría jamás y el bot volvería a
  // preguntar lo que el formulario ya contestó.
  const datosConocidos = Object.entries(datos)
    .filter((entrada): entrada is [string, string | boolean] => {
      const valor = entrada[1];
      if (typeof valor === "boolean") return true;
      return typeof valor === "string" && valor.length > 0;
    })
    .map(([clave, valor]) => `- ${clave}: ${valor}`)
    .join("\n");

  return `${PROMPT_CLIENTE}

---

## Contexto de este turno (ya resuelto en código — no lo recalcules ni lo cuestiones)

bot_activo: ${horario.botActivo}
equipo_disponible: ${horario.equipoDisponible}
cuando_contestan: "${horario.cuandoContestan}"

Datos que ya se saben de este lead (no se los vuelvas a preguntar):
${datosConocidos || "(ninguno todavía)"}`;
}

// ---- Turno — modo administrador ----

export async function correrTurnoAdmin(telefono: string, texto: string): Promise<TurnoAgente> {
  const conv = await obtenerConversacion(telefono);

  const mensajes: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: PROMPT_ADMIN },
    ...conv.historial.map(aMensajeOpenAI),
    { role: "user", content: texto },
  ];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const mensaje = await pedirCompletado(mensajes, HERRAMIENTAS_ADMIN);
    if (!mensaje) break;

    const llamadas = (mensaje.tool_calls ?? []).filter(esLlamadaAFuncion);

    if (llamadas.length === 0) {
      const burbujas = dividirEnBurbujas(mensaje.content ?? "");
      return { respuesta: burbujas.length > 0 ? burbujas : [FALLBACK_ADMIN], escalar: false };
    }

    mensajes.push({ role: "assistant", content: mensaje.content, tool_calls: mensaje.tool_calls });

    for (const llamada of llamadas) {
      const args = parsearArgumentos(llamada.function.arguments);
      const salida = await ejecutarHerramientaAdmin(llamada.function.name, args);
      mensajes.push({ role: "tool", tool_call_id: llamada.id, content: JSON.stringify(salida) });
    }
  }

  return { respuesta: [FALLBACK_ADMIN], escalar: false };
}

async function ejecutarHerramientaAdmin(nombre: string, args: Record<string, unknown>): Promise<unknown> {
  switch (nombre) {
    case "listar_leads": {
      const leads = await listarConversaciones(20);
      return {
        leads: leads.map((c) => ({
          telefono: c.telefono,
          nombre: c.datos.nombre ?? null,
          giro: c.datos.giro ?? null,
          estado: c.estado,
          pausado: c.pausado,
          ultima_actividad: formatoRelativo(c.ultimaActividad),
          ultimo_mensaje: c.historial.at(-1)?.contenido.slice(0, 140) ?? null,
        })),
      };
    }

    case "ver_conversacion": {
      const resultado = await resolverUnLead(args.identificador);
      if ("error" in resultado || "candidatos" in resultado) return resultado;
      const c = resultado.lead;
      return {
        telefono: c.telefono,
        datos: c.datos,
        estado: c.estado,
        pausado: c.pausado,
        historial: c.historial.map((t) => ({ rol: t.rol, contenido: t.contenido, en: t.en })),
      };
    }

    case "mandar_mensaje_a_cliente": {
      const resultado = await resolverUnLead(args.identificador);
      if ("error" in resultado || "candidatos" in resultado) return resultado;
      const c = resultado.lead;

      const mensaje = esTexto(args.mensaje) ? args.mensaje : "";
      if (!mensaje) return { error: "Falta el texto del mensaje." };

      if (!(await dentroDeVentana24h(c.telefono))) {
        return {
          error: "fuera_de_ventana",
          telefono: c.telefono,
          detalle: "Lleva más de 24h sin escribir. Solo se puede mandar por plantilla aprobada, o esperar a que él escriba primero.",
        };
      }

      const envio = await mandarTexto(c.telefono, mensaje);
      if (!envio.ok) return { error: envio.motivo, detalle: envio.detalle };

      await agregarAlHistorial(c.telefono, [
        { rol: "assistant", contenido: mensaje, en: new Date().toISOString() },
      ]);
      return { ok: true, telefono: c.telefono };
    }

    case "reactivar_bot": {
      const resultado = await resolverUnLead(args.identificador);
      if ("error" in resultado || "candidatos" in resultado) return resultado;
      await setPausado(resultado.lead.telefono, false);
      return { ok: true, telefono: resultado.lead.telefono };
    }

    case "pausar_bot": {
      const resultado = await resolverUnLead(args.identificador);
      if ("error" in resultado || "candidatos" in resultado) return resultado;
      await setPausado(resultado.lead.telefono, true, "esperando_humano");
      return { ok: true, telefono: resultado.lead.telefono };
    }

    default:
      return { error: `Herramienta desconocida: ${nombre}` };
  }
}

/**
 * Resuelve un `identificador` (nombre o fragmento de teléfono) a exactamente
 * un lead. Comparten esta lógica las cuatro herramientas de admin que actúan
 * sobre un lead específico, para que la ambigüedad se maneje siempre igual:
 * nunca se adivina, se le pregunta a Gerardo.
 */
async function resolverUnLead(
  identificadorCrudo: unknown
): Promise<{ lead: Conversacion } | { error: string } | { candidatos: unknown[] }> {
  const identificador = esTexto(identificadorCrudo) ? identificadorCrudo : "";
  if (!identificador) return { error: "Falta el identificador (nombre o teléfono) del lead." };

  const encontrados = await buscarLeads(identificador);
  if (encontrados.length === 0) return { error: "No encontré ningún lead con ese nombre o teléfono." };
  if (encontrados.length > 1) return { candidatos: encontrados.map(resumenCandidato) };
  return { lead: encontrados[0] };
}

function resumenCandidato(c: Conversacion) {
  return { telefono: c.telefono, nombre: c.datos.nombre ?? null, giro: c.datos.giro ?? null, estado: c.estado };
}

// ---- Compartido ----

async function pedirCompletado(
  mensajes: OpenAI.ChatCompletionMessageParam[],
  herramientas: OpenAI.ChatCompletionFunctionTool[]
): Promise<OpenAI.ChatCompletionMessage | null> {
  const completado = await clienteDeepSeek().chat.completions.create({
    model: MODELO,
    max_tokens: MAX_TOKENS,
    messages: mensajes,
    tools: herramientas,
  });
  return completado.choices[0]?.message ?? null;
}

function esLlamadaAFuncion(
  llamada: OpenAI.ChatCompletionMessageToolCall
): llamada is OpenAI.ChatCompletionMessageFunctionToolCall {
  return llamada.type === "function";
}

function esTexto(valor: unknown): valor is string {
  return typeof valor === "string" && valor.length > 0;
}

/** Los argumentos de una tool call vienen como string; el modelo no siempre da JSON válido. */
function parsearArgumentos(json: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Cada línea del texto final es una burbuja de WhatsApp separada. Exportada para prueba unitaria. */
export function dividirEnBurbujas(texto: string): string[] {
  return texto
    .split("\n")
    .map((linea) => quitarComillasEnvolventes(linea.trim()))
    .filter(Boolean);
}

/**
 * Quita las comillas que envuelven una burbuja entera.
 *
 * Pasa de verdad: el prompt trae líneas de ejemplo y el modelo a veces las copia
 * CON las comillas, así que al cliente le llegaría `"¡Hola Roberto!"` — se ve
 * absurdo y delata al bot. Se vio en la prueba de integración del guion del
 * formulario.
 *
 * Es guardarraíl de código, no solo de prompt: instruirle "sin comillas" baja la
 * frecuencia pero no la elimina. Solo quita el par que envuelve TODA la línea;
 * una comilla legítima a media frase se respeta.
 */
function quitarComillasEnvolventes(linea: string): string {
  const pares: Array<[string, string]> = [
    ['"', '"'],
    ["“", "”"],
    ["'", "'"],
  ];
  for (const [abre, cierra] of pares) {
    if (linea.length >= 2 && linea.startsWith(abre) && linea.endsWith(cierra)) {
      const interior = linea.slice(abre.length, -cierra.length);
      // Si adentro hay más comillas del mismo tipo, no era un envoltorio:
      // era una cita real y hay que dejarla en paz.
      if (!interior.includes(abre) && !interior.includes(cierra)) return interior.trim();
    }
  }
  return linea;
}

function aMensajeOpenAI(turno: TurnoConversacion): OpenAI.ChatCompletionMessageParam {
  return turno.rol === "user"
    ? { role: "user", content: turno.contenido }
    : { role: "assistant", content: turno.contenido };
}

/** Exportada para prueba unitaria: los límites (1 min, 60 min, 24h) son donde se rompe en silencio. */
export function formatoRelativo(iso: string): string {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutos < 1) return "justo ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "ayer" : `hace ${dias} días`;
}

function avisoFallo(telefono: string, motivo: string): { mensaje: string; resumenCorto: string } {
  return {
    mensaje: `El bot no pudo resolver la conversación con ${telefono} (${motivo}). Quedó pausada.`,
    resumenCorto: `Bot atorado con ${telefono}`,
  };
}
