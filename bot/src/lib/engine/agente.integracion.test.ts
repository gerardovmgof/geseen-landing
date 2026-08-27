// Prueba de integración del agente contra DeepSeek REAL.
//
// Hace llamadas de verdad al modelo y escribe en el Redis real, así que cuesta
// (fracciones de centavo) y se salta sola si no hay credenciales.
//
// Correr con:  npx vitest run agente.integracion
//
// El escenario B es el importante: verifica que un lead que vino del formulario
// de Meta NO reciba la apertura genérica, sino la burbuja del branch que le
// toca. Es la prueba 3 de PLAN-LEADS-META.md sin las patas de Meta y WhatsApp
// en vivo — lo más cerca que se puede llegar sin esas credenciales.

import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

function cargarEnv(): void {
  try {
    const archivo = readFileSync(path.resolve(__dirname, "../../../.env.local"), "utf8");
    for (const linea of archivo.split("\n")) {
      const l = linea.trim();
      if (!l || l.startsWith("#")) continue;
      const i = l.indexOf("=");
      if (i === -1) continue;
      const clave = l.slice(0, i).trim();
      const valor = l.slice(i + 1).trim();
      if (valor && !process.env[clave]) process.env[clave] = valor;
    }
  } catch {
    // Sin archivo, las pruebas se saltan solas.
  }
}

cargarEnv();

const hayCredenciales = Boolean(
  process.env.DEEPSEEK_API_KEY &&
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
);

const HORARIO = { botActivo: true, equipoDisponible: true, cuandoContestan: "en un momento" };
const ORGANICO = "525500000010";
const DEL_FORMULARIO = "525500000011";

describe.skipIf(!hayCredenciales)("agente contra DeepSeek real", () => {
  afterAll(async () => {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    for (const tel of [ORGANICO, DEL_FORMULARIO]) {
      await redis.del(`conv:${tel}`);
      await redis.zrem("leads", tel);
    }
  });

  it(
    "lead normal: saluda y pide el nombre",
    async () => {
      const { correrTurno } = await import("./agente");
      const turno = await correrTurno(
        ORGANICO,
        "Hola, vi su anuncio y me interesa saber más sobre sus soluciones",
        HORARIO
      );

      const texto = turno.respuesta.join(" ").toLowerCase();
      console.log("\n  [A] respuesta:", turno.respuesta);

      expect(turno.respuesta.length).toBeGreaterThan(0);
      expect(turno.escalar).toBe(false);
      expect(texto).toMatch(/gusto|nombre|con qui[eé]n/);
    },
    60_000
  );

  it(
    "lead del formulario: NO repregunta lo que ya contestó y abre con su branch",
    async () => {
      const { guardarDatos } = await import("./state");
      const { correrTurno } = await import("./agente");

      // Lo que habría dejado el webhook de leads antes de que la persona escriba.
      await guardarDatos(DEL_FORMULARIO, {
        origenFormulario: true,
        nombre: "Roberto",
        dolor: "Que contesten y agenden por mí",
        presupuestoDeclarado: "$10,000 - $20,000",
        urgencia: "Este mes",
        tamanoNegocioDeclarado: "1 a 5",
      });

      const turno = await correrTurno(DEL_FORMULARIO, "Hola", HORARIO);
      const texto = turno.respuesta.join(" ").toLowerCase();
      console.log("\n  [B] respuesta:", turno.respuesta);

      // Lo crítico: el formulario ya dio nombre, presupuesto y urgencia.
      // Volver a preguntarlos hace obvio que nadie leyó lo que contestó.
      expect(texto).not.toMatch(/con qui[eé]n tengo el gusto|c[oó]mo te llamas|tu nombre/);
      expect(texto).not.toMatch(/presupuesto/);
      expect(texto).not.toMatch(/para cu[aá]ndo lo necesitas/);
    },
    60_000
  );
});
