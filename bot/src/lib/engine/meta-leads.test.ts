// Pruebas del mapeo de leads del formulario de Meta.
//
// Todo aquí corre sin credenciales ni red: `mapearLead` y `extraerAvisosDeLead`
// son funciones puras. Lo que NO se puede probar aquí es si los `name` reales
// que manda Meta calzan con las reglas — eso necesita un lead real de la Graph
// API (prueba 1 de PLAN-LEADS-META.md, bloqueada por falta de token).
//
// Por eso la prueba de "campo desconocido" es la importante: documenta que un
// nombre que no reconocemos NO se pierde, cae en `sinMapear` y sale en los logs.

import { describe, expect, it } from "vitest";
import {
  extraerAvisosDeLead,
  mapearLead,
  normalizarEtiqueta,
  normalizarTelefonoLead,
  type CampoLead,
} from "./meta-leads";
import { normalizarTelefono } from "./whatsapp";

/** Forma plausible de lo que devuelve `GET /{leadgen_id}` para el formulario de GESEEN. */
const LEAD_COMPLETO: CampoLead[] = [
  { name: "full_name", values: ["Roberto Mendoza"] },
  { name: "phone_number", values: ["+525614248036"] },
  { name: "email", values: ["roberto@taqueria.mx"] },
  { name: "¿que_necesitas_resolver?", values: ["Que contesten y agenden por mí"] },
  { name: "¿que_presupuesto_tienes_considerado?", values: ["$10,000 - $20,000"] },
  { name: "¿para_cuando_lo_necesitas?", values: ["Este mes"] },
  { name: "¿cuantas_personas_trabajan_en_tu_negocio?", values: ["1 a 5"] },
];

describe("mapearLead", () => {
  it("mapea las 4 preguntas y los campos de fábrica", () => {
    const { telefono, datos, sinMapear } = mapearLead(LEAD_COMPLETO);

    expect(telefono).toBe("525614248036");
    expect(datos.nombre).toBe("Roberto Mendoza");
    expect(datos.dolor).toBe("Que contesten y agenden por mí");
    expect(datos.presupuestoDeclarado).toBe("$10,000 - $20,000");
    expect(datos.urgencia).toBe("Este mes");
    expect(datos.tamanoNegocioDeclarado).toBe("1 a 5");
    expect(sinMapear).toEqual([]);
  });

  it("siempre marca origenFormulario, que es lo que activa el guion corto", () => {
    expect(mapearLead(LEAD_COMPLETO).datos.origenFormulario).toBe(true);
    // Incluso si el formulario llega vacío: el origen es un hecho del canal,
    // no depende de que la persona haya contestado algo.
    expect(mapearLead([]).datos.origenFormulario).toBe(true);
  });

  it("el correo se ignora a propósito, no cae en sinMapear", () => {
    const { sinMapear } = mapearLead([{ name: "email", values: ["x@y.mx"] }]);
    expect(sinMapear).toEqual([]);
  });

  it("un campo que no reconocemos NO se pierde: cae en sinMapear", () => {
    // Este es el caso que protege contra los nombres reales sin confirmar.
    const { datos, sinMapear } = mapearLead([
      { name: "pregunta_que_nadie_previo", values: ["algo importante"] },
    ]);

    expect(sinMapear).toEqual([{ name: "pregunta_que_nadie_previo", values: ["algo importante"] }]);
    expect(datos.dolor).toBeUndefined();
  });

  it("tolera variantes del nombre de la pregunta sin acentos ni signos", () => {
    const { datos } = mapearLead([
      { name: "Que necesitas resolver", values: ["Vender sin comisión"] },
      { name: "PRESUPUESTO ESTIMADO", values: ["Menos de $10,000"] },
    ]);
    expect(datos.dolor).toBe("Vender sin comisión");
    expect(datos.presupuestoDeclarado).toBe("Menos de $10,000");
  });

  it("arma el nombre con first_name + last_name si no hay full_name", () => {
    const { datos } = mapearLead([
      { name: "first_name", values: ["Marisol"] },
      { name: "last_name", values: ["Vega"] },
    ]);
    expect(datos.nombre).toBe("Marisol Vega");
  });

  it("ignora campos vacíos en vez de guardarlos en blanco", () => {
    const { datos, telefono } = mapearLead([
      { name: "full_name", values: [""] },
      { name: "phone_number", values: [] },
    ]);
    expect(datos.nombre).toBeUndefined();
    expect(telefono).toBeNull();
  });

  it("junta respuestas de opción múltiple en una sola línea", () => {
    const { datos } = mapearLead([
      { name: "¿que_necesitas_resolver?", values: ["Vender sin comisión", "Cotizar"] },
    ]);
    expect(datos.dolor).toBe("Vender sin comisión, Cotizar");
  });
});

describe("correlación de teléfono", () => {
  it("las dos formas del número mexicano colapsan en la misma llave", () => {
    // Sin esto, el lead del formulario y el mensaje de WhatsApp quedarían en
    // dos conversaciones distintas y el bot no vería lo que ya contestó.
    expect(normalizarTelefonoLead("+525614248036")).toBe("525614248036");
    expect(normalizarTelefonoLead("5215614248036")).toBe("525614248036");
    expect(normalizarTelefonoLead("+52 1 561 424 8036")).toBe("525614248036");
  });

  it("coincide exactamente con la normalización del webhook de WhatsApp", () => {
    // El módulo de leads duplica la lógica a propósito para no depender del de
    // WhatsApp. Esta prueba es la que evita que se separen en silencio.
    for (const numero of [
      "+525614248036",
      "5215614248036",
      "525614248036",
      "+52 1 442 123 4567",
      "5214421234567",
      "13055551234",
    ]) {
      expect(normalizarTelefonoLead(numero)).toBe(normalizarTelefono(numero));
    }
  });
});

describe("normalizarEtiqueta", () => {
  it("quita acentos, signos y guiones bajos", () => {
    expect(normalizarEtiqueta("¿Para_cuándo lo necesitas?")).toBe("para cuando lo necesitas");
  });
});

describe("extraerAvisosDeLead", () => {
  it("saca el leadgen_id del payload de Meta", () => {
    const avisos = extraerAvisosDeLead({
      entry: [
        {
          changes: [
            {
              field: "leadgen",
              value: { leadgen_id: "9988", form_id: "2078678209703388", page_id: "555" },
            },
          ],
        },
      ],
    });
    expect(avisos).toEqual([
      { leadgenId: "9988", formId: "2078678209703388", pageId: "555" },
    ]);
  });

  it("ignora cambios que no son de leadgen", () => {
    // La misma suscripción de Página puede mandar otros eventos por esta URL.
    const avisos = extraerAvisosDeLead({
      entry: [{ changes: [{ field: "feed", value: { leadgen_id: "no-deberia-pasar" } }] }],
    });
    expect(avisos).toEqual([]);
  });

  it("no truena con un payload vacío o raro", () => {
    expect(extraerAvisosDeLead({})).toEqual([]);
    expect(extraerAvisosDeLead({ entry: [{}] })).toEqual([]);
    expect(extraerAvisosDeLead({ entry: [{ changes: [{ field: "leadgen", value: {} }] }] })).toEqual([]);
  });
});
