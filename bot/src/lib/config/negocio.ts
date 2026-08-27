// Configuración del negocio. TODO lo específico de GESEEN vive aquí.
//
// El motor (`lib/engine/`) no importa nada de este archivo al revés: un segundo
// cliente copia el motor tal cual y solo escribe su propio `negocio.ts` y sus
// propios prompts. Esa separación es la diferencia entre vender el segundo bot
// como configuración o como desarrollo desde cero.

import { normalizarTelefono } from "@/lib/engine/whatsapp";

export const ZONA_HORARIA = "America/Mexico_City";

/** 0 = domingo. Minutos desde medianoche. `null` = cerrado ese día. */
type Franja = { abre: number; cierra: number } | null;

const hm = (hora: number, minuto = 0) => hora * 60 + minuto;

/**
 * El bot abre más que el equipo a propósito. El mercado principal de GESEEN son
 * restaurantes y negocios de comida en Querétaro (estudio INEGI: 80% restaurantes,
 * 81% micro-negocios de 0 a 5 personas). Esa gente está hasta el cuello a la hora
 * de la comida y de la cena, y revisa el celular cuando ya cerró. Un dueño de
 * taquería escribiendo a las 22:00 es de los mejores leads que van a llegar.
 */
const HORARIO_BOT: Franja[] = [
  { abre: hm(10), cierra: hm(20) }, // domingo
  { abre: hm(8), cierra: hm(22, 30) }, // lunes
  { abre: hm(8), cierra: hm(22, 30) },
  { abre: hm(8), cierra: hm(22, 30) },
  { abre: hm(8), cierra: hm(22, 30) },
  { abre: hm(8), cierra: hm(22, 30) }, // viernes
  { abre: hm(8), cierra: hm(22, 30) }, // sábado
];

/** Cuándo puede entrar una persona de verdad a contestar. */
const HORARIO_EQUIPO: Franja[] = [
  null, // domingo, cerrado
  { abre: hm(9), cierra: hm(19) },
  { abre: hm(9), cierra: hm(19) },
  { abre: hm(9), cierra: hm(19) },
  { abre: hm(9), cierra: hm(19) },
  { abre: hm(9), cierra: hm(19) }, // viernes
  { abre: hm(10), cierra: hm(14) }, // sábado
];

/** Festivos oficiales de México en los que no contesta nadie. Formato YYYY-MM-DD. */
const FESTIVOS = new Set([
  "2026-09-16", // Independencia
  "2026-11-16", // Revolución (tercer lunes)
  "2026-12-25",
  "2027-01-01",
  "2027-02-01", // Constitución (primer lunes)
  "2027-03-15", // Natalicio de Juárez (tercer lunes)
  "2027-05-01",
]);

export interface EstadoHorario {
  botActivo: boolean;
  equipoDisponible: boolean;
  /** Frase lista para meter en el mensaje: "en un momento", "mañana", "el lunes". */
  cuandoContestan: string;
}

/**
 * Resuelve el horario en código, NUNCA en el prompt. Los modelos de lenguaje no
 * saben qué hora es y calculan fechas mal; el prompt solo recibe banderas ya
 * resueltas.
 */
export function estadoHorario(ahora = new Date()): EstadoHorario {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(ahora);

  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  const fecha = `${parte("year")}-${parte("month")}-${parte("day")}`;
  // "24" aparece a medianoche con hour12:false en algunos entornos.
  const hora = Number(parte("hour")) % 24;
  const minutos = hora * 60 + Number(parte("minute"));

  const diaSemana = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parte("weekday"));
  const esFestivo = FESTIVOS.has(fecha);

  const franjaBot = esFestivo ? null : HORARIO_BOT[diaSemana];
  const franjaEquipo = esFestivo ? null : HORARIO_EQUIPO[diaSemana];

  const dentro = (f: Franja) => f !== null && minutos >= f.abre && minutos < f.cierra;
  const botActivo = dentro(franjaBot);
  const equipoDisponible = dentro(franjaEquipo);

  return { botActivo, equipoDisponible, cuandoContestan: proximaRespuesta(diaSemana, equipoDisponible) };
}

function proximaRespuesta(diaSemana: number, equipoDisponible: boolean): string {
  if (equipoDisponible) return "en un momento";
  // Sábado después de las 14:00 y domingo caen en lunes.
  if (diaSemana === 6 || diaSemana === 0) return "el lunes";
  // Viernes en la noche también cae en lunes: el sábado el equipo solo abre medio día.
  if (diaSemana === 5) return "el lunes";
  return "mañana";
}

/** ¿Este mensaje viene de Gerardo? Si sí, entra en modo administrador. */
export function esOwner(telefono: string): boolean {
  const owner = process.env.OWNER_PHONE_NUMBER;
  if (!owner) return false;
  return normalizarTelefono(telefono) === normalizarTelefono(owner);
}

/** Mensaje único cuando alguien escribe fuera del horario del bot. */
export function mensajeFueraDeHorario(cuandoContestan: string): string[] {
  return [
    "¡Hola! Gracias por escribir a GESEEN.",
    `Ahorita ya cerramos, pero ${cuandoContestan} te contestamos con calma.`,
  ];
}
