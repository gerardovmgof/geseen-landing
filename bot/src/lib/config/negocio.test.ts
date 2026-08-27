// Pruebas de las dos funciones puras que fallan en silencio si se rompen:
// el horario (el bot contestaría a las 3am, o no contestaría en todo el día)
// y la normalización de teléfonos (el modo admin dejaría de reconocer a Gerardo).
//
// CDMX es UTC-6 todo el año — México eliminó el horario de verano en 2022.
// Las fechas van en UTC, así que hay que sumarle 6 horas a la hora local.

import { describe, expect, it } from "vitest";
import { estadoHorario } from "./negocio";
import { normalizarTelefono } from "@/lib/engine/whatsapp";

const cdmx = (iso: string) => new Date(`${iso}Z`);

describe("estadoHorario", () => {
  it("martes 10:00 — todo abierto", () => {
    const r = estadoHorario(cdmx("2026-08-11T16:00:00"));
    expect(r).toEqual({ botActivo: true, equipoDisponible: true, cuandoContestan: "en un momento" });
  });

  it("martes 21:00 — el bot sigue, el equipo ya no (el caso del taquero)", () => {
    const r = estadoHorario(cdmx("2026-08-12T03:00:00"));
    expect(r.botActivo).toBe(true);
    expect(r.equipoDisponible).toBe(false);
    expect(r.cuandoContestan).toBe("mañana");
  });

  it("martes 23:40 — cerrado hasta para el bot", () => {
    const r = estadoHorario(cdmx("2026-08-12T05:40:00"));
    expect(r.botActivo).toBe(false);
    expect(r.cuandoContestan).toBe("mañana");
  });

  it("martes 7:00 — antes de abrir", () => {
    expect(estadoHorario(cdmx("2026-08-11T13:00:00")).botActivo).toBe(false);
  });

  it("viernes en la noche manda al lunes, no al sábado", () => {
    // El equipo abre medio día el sábado, pero prometer "mañana" un viernes
    // a las 21:00 es prometer algo que probablemente no pasa.
    const r = estadoHorario(cdmx("2026-08-15T03:00:00"));
    expect(r.botActivo).toBe(true);
    expect(r.cuandoContestan).toBe("el lunes");
  });

  it("sábado 16:00 — bot sí, equipo ya cerró", () => {
    const r = estadoHorario(cdmx("2026-08-15T22:00:00"));
    expect(r.botActivo).toBe(true);
    expect(r.equipoDisponible).toBe(false);
    expect(r.cuandoContestan).toBe("el lunes");
  });

  it("domingo mediodía — bot sí, equipo cerrado", () => {
    const r = estadoHorario(cdmx("2026-08-09T18:00:00"));
    expect(r.botActivo).toBe(true);
    expect(r.equipoDisponible).toBe(false);
    expect(r.cuandoContestan).toBe("el lunes");
  });

  it("domingo 21:00 — ya cerró hasta el bot", () => {
    expect(estadoHorario(cdmx("2026-08-10T03:00:00")).botActivo).toBe(false);
  });

  it("día festivo entre semana — cerrado aunque sea miércoles", () => {
    // 16 de septiembre de 2026 cae en miércoles.
    const r = estadoHorario(cdmx("2026-09-16T16:00:00"));
    expect(r.botActivo).toBe(false);
    expect(r.equipoDisponible).toBe(false);
  });
});

describe("normalizarTelefono", () => {
  it("quita el 1 de los celulares mexicanos", () => {
    // WhatsApp manda el mismo número de las dos formas según el caso. Si se
    // guarda una y se compara contra la otra, el historial se parte en dos y
    // el modo administrador deja de reconocer a Gerardo.
    expect(normalizarTelefono("5215642480361")).toBe("525642480361");
    expect(normalizarTelefono("525642480361")).toBe("525642480361");
  });

  it("las dos formas del mismo número colapsan en una", () => {
    expect(normalizarTelefono("5215642480361")).toBe(normalizarTelefono("525642480361"));
  });

  it("limpia el formato humano", () => {
    expect(normalizarTelefono("+52 1 564 248 0361")).toBe("525642480361");
  });

  it("no toca números de otros países que empiezan con 521", () => {
    // 521... de 12 dígitos no es el patrón mexicano de 13, se deja igual.
    expect(normalizarTelefono("521234567890")).toBe("521234567890");
  });
});
