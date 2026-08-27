// Estado de las conversaciones, sobre Upstash Redis.
//
// Esto es MOTOR: no sabe nada del negocio. Reemplaza a `conversations.ts` de
// Kaire, que estaba sobre Supabase/Postgres. Aquí no hay esquema ni migraciones,
// solo dos patrones de llave y un índice.
//
//   conv:{telefono}  → hash de la conversación   TTL 60 días
//   msg:{messageId}  → marca de procesado        TTL 48 horas
//   leads            → sorted set por última actividad (para listar en admin)
//
// Por qué hace falta guardar algo (y no se puede "sin base de datos"):
//  - El webhook entrega UN mensaje a la vez y la Cloud API no tiene endpoint
//    para leer el historial. Sin esto el bot tiene amnesia en cada mensaje.
//  - Meta reintenta los webhooks. Sin `msg:` el bot contesta doble.
//  - La bandera de pausa tiene que sobrevivir entre mensajes, o el bot sigue
//    escribiendo encima del humano que ya entró.

import { Redis } from "@upstash/redis";

const TTL_CONVERSACION = 60 * 60 * 24 * 60; // 60 días
const TTL_MENSAJE = 60 * 60 * 48; // 48 horas: cubre de sobra los reintentos de Meta
const MAX_TURNOS = 20; // recorta el contexto que se le manda al modelo

let clienteCache: Redis | null = null;

function redis(): Redis {
  if (clienteCache) return clienteCache;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Faltan UPSTASH_REDIS_REST_URL o UPSTASH_REDIS_REST_TOKEN.");
  }
  clienteCache = new Redis({ url, token });
  return clienteCache;
}

// ---- Tipos ----

export interface TurnoConversacion {
  rol: "user" | "assistant";
  contenido: string;
  en: string; // ISO
}

export interface DatosLead {
  nombre?: string;
  giro?: string;
  ciudad?: string;
  dolor?: string;
  comoLoResuelveHoy?: string;
  volumen?: string;
  urgencia?: string;
  servicioProbable?: string;
  /**
   * Los tres de abajo solo los llena el webhook de leads de Meta
   * (`/api/meta-leads/webhook`), nunca el bot preguntando. Llegan ANTES del
   * primer mensaje de WhatsApp, cuando la persona somete el formulario del
   * anuncio.
   */
  presupuestoDeclarado?: string;
  tamanoNegocioDeclarado?: string;
  /** Bandera para que el prompt use el guion corto en vez de la apertura normal. */
  origenFormulario?: boolean;
}

export type EstadoLead = "nuevo" | "calificando" | "calificado" | "esperando_humano" | "descartado";

export interface Conversacion {
  telefono: string;
  historial: TurnoConversacion[];
  datos: DatosLead;
  pausado: boolean;
  estado: EstadoLead;
  ultimaActividad: string; // ISO
  /**
   * Último mensaje recibido DEL cliente. De aquí sale si seguimos dentro de la
   * ventana de 24h de Meta. Ojo: es una estimación local — la verdad la tiene
   * Meta, y por eso `mandarTexto` igual puede devolver `fuera_de_ventana`.
   */
  ultimoMensajeCliente: string | null;
  /**
   * Cuándo se le avisó a Gerardo que este lead llenó el formulario y nunca
   * escribió. Sirve para no repetirle el mismo lead cada hora — se avisa una
   * vez y ya. `null` = todavía no se ha avisado.
   */
  avisoSinMensajeEnviado?: string | null;
}

function conversacionVacia(telefono: string): Conversacion {
  return {
    telefono,
    historial: [],
    datos: {},
    pausado: false,
    estado: "nuevo",
    ultimaActividad: new Date().toISOString(),
    ultimoMensajeCliente: null,
  };
}

const llaveConv = (telefono: string) => `conv:${telefono}`;

// ---- Deduplicación ----

/**
 * Marca un messageId como procesado. Devuelve `false` si ya se había procesado
 * (reintento de Meta), y en ese caso hay que ignorar el mensaje por completo.
 *
 * Es atómico: `SET NX` solo escribe si la llave no existía, así que dos webhooks
 * simultáneos con el mismo id no pueden pasar los dos.
 */
export async function marcarMensajeProcesado(messageId: string): Promise<boolean> {
  const resultado = await redis().set(`msg:${messageId}`, 1, { nx: true, ex: TTL_MENSAJE });
  return resultado === "OK";
}

// ---- Conversación ----

export async function obtenerConversacion(telefono: string): Promise<Conversacion> {
  const guardada = await redis().get<Conversacion>(llaveConv(telefono));
  return guardada ?? conversacionVacia(telefono);
}

async function guardar(conv: Conversacion): Promise<void> {
  conv.ultimaActividad = new Date().toISOString();
  const cliente = redis();
  await cliente.set(llaveConv(conv.telefono), conv, { ex: TTL_CONVERSACION });
  // Índice para poder listar los leads en modo administrador sin hacer SCAN.
  await cliente.zadd("leads", { score: Date.now(), member: conv.telefono });
}

/**
 * Agrega turnos al historial y lo recorta, para no mandarle al modelo una
 * conversación cada vez más larga (cuesta dinero y degrada la respuesta).
 */
export async function agregarAlHistorial(
  telefono: string,
  turnos: TurnoConversacion[]
): Promise<void> {
  const conv = await obtenerConversacion(telefono);
  conv.historial = [...conv.historial, ...turnos].slice(-MAX_TURNOS);
  await guardar(conv);
}

/** Registra que el cliente escribió: reabre la ventana de 24h de Meta. */
export async function registrarMensajeDelCliente(telefono: string): Promise<void> {
  const conv = await obtenerConversacion(telefono);
  conv.ultimoMensajeCliente = new Date().toISOString();
  await guardar(conv);
}

/** Mezcla datos nuevos sobre los que ya había. Nunca borra lo ya conocido. */
export async function guardarDatos(telefono: string, datos: DatosLead): Promise<DatosLead> {
  const conv = await obtenerConversacion(telefono);
  for (const [clave, valor] of Object.entries(datos)) {
    if (valor !== null && valor !== undefined && valor !== "") {
      (conv.datos as Record<string, unknown>)[clave] = valor;
    }
  }
  if (conv.estado === "nuevo") conv.estado = "calificando";
  await guardar(conv);
  return conv.datos;
}

export async function estaPausado(telefono: string): Promise<boolean> {
  return (await obtenerConversacion(telefono)).pausado;
}

export async function setPausado(
  telefono: string,
  pausado: boolean,
  estado?: EstadoLead
): Promise<void> {
  const conv = await obtenerConversacion(telefono);
  conv.pausado = pausado;
  if (estado) conv.estado = estado;
  await guardar(conv);
}

/**
 * ¿Seguimos dentro de la ventana de 24h para escribirle a este número?
 * Es una estimación local para poder avisar ANTES de intentar el envío; el
 * veredicto real lo da Meta al momento de mandar.
 */
export async function dentroDeVentana24h(telefono: string): Promise<boolean> {
  const conv = await obtenerConversacion(telefono);
  if (!conv.ultimoMensajeCliente) return false;
  const transcurrido = Date.now() - new Date(conv.ultimoMensajeCliente).getTime();
  return transcurrido < 24 * 60 * 60 * 1000;
}

/** Lista los leads más recientes primero. Para `listar_leads` del modo admin. */
export async function listarConversaciones(limite = 20): Promise<Conversacion[]> {
  const cliente = redis();
  const telefonos = await cliente.zrange<string[]>("leads", 0, limite - 1, { rev: true });

  const conversaciones: Conversacion[] = [];
  for (const telefono of telefonos) {
    const conv = await cliente.get<Conversacion>(llaveConv(telefono));
    if (conv) {
      conversaciones.push(conv);
    } else {
      // La conversación expiró por TTL pero el índice sobrevivió. Se limpia sola.
      await cliente.zrem("leads", telefono);
    }
  }
  return conversaciones;
}

/**
 * Leads que llenaron el formulario de Meta y NUNCA escribieron por WhatsApp.
 *
 * Sin esto quedarían invisibles para siempre: sus datos están precargados en
 * Redis pero nadie se entera de que existen, porque el bot solo despierta
 * cuando llega un mensaje.
 *
 * Tres filtros, en este orden:
 *  - vino del formulario y no hay ni un mensaje suyo
 *  - ya pasó el periodo de gracia (alguien puede llenar el formulario y
 *    escribir cinco minutos después — no hay que molestar a Gerardo por eso)
 *  - no se avisó antes (si no, sería el mismo lead cada hora, para siempre)
 */
export async function listarLeadsSinMensaje(
  graciaMs: number,
  limite = 200
): Promise<Conversacion[]> {
  const cliente = redis();
  const telefonos = await cliente.zrange<string[]>("leads", 0, limite - 1, { rev: true });
  const ahora = Date.now();
  const pendientes: Conversacion[] = [];

  for (const telefono of telefonos) {
    const conv = await cliente.get<Conversacion>(llaveConv(telefono));
    if (!conv) continue;
    if (!conv.datos?.origenFormulario) continue;
    if (conv.ultimoMensajeCliente) continue;
    if (conv.avisoSinMensajeEnviado) continue;
    if (ahora - new Date(conv.ultimaActividad).getTime() < graciaMs) continue;
    pendientes.push(conv);
  }

  return pendientes;
}

/** Deja constancia de que ya se avisó de este lead, para no repetirlo. */
export async function marcarAvisoSinMensaje(telefono: string): Promise<void> {
  const conv = await obtenerConversacion(telefono);
  conv.avisoSinMensajeEnviado = new Date().toISOString();
  await guardar(conv);
}

/**
 * Busca leads por nombre (substring, sin mayúsculas) o por fragmento de
 * teléfono. Para el modo administrador: Gerardo referencia leads como
 * "Roberto" o "el del 442", nunca con el teléfono completo.
 *
 * Devuelve todos los que calzan — 0, 1 o varios — y quien llama decide qué
 * hacer con la ambigüedad. Nunca hay que adivinar cuál es "el correcto".
 */
export async function buscarLeads(query: string): Promise<Conversacion[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const qDigits = q.replace(/\D/g, "");

  // 200 cubre de sobra el volumen esperado; si algún día no alcanza, el
  // síntoma es visible (el admin deja de encontrar leads viejos), no silencioso.
  const candidatos = await listarConversaciones(200);

  return candidatos.filter((c) => {
    const nombre = c.datos.nombre?.toLowerCase() ?? "";
    const coincideNombre = nombre.length > 0 && nombre.includes(q);
    const coincideTelefono = qDigits.length >= 4 && c.telefono.includes(qDigits);
    return coincideNombre || coincideTelefono;
  });
}

/** Chequeo de salud: confirma que Redis responde. Lo usa /api/health. */
export async function redisVivo(): Promise<{ vivo: boolean; detalle?: string }> {
  try {
    await redis().ping();
    return { vivo: true };
  } catch (err) {
    return { vivo: false, detalle: String(err) };
  }
}
