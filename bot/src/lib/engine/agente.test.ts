// Pruebas de las funciones puras de agente.ts: las que fallan en silencio si
// se rompen porque no truenan, solo dan el resultado equivocado.
//
// Lo que NO se prueba acá: el loop de tool use contra DeepSeek. Probarlo de
// verdad significa o mockear el modelo (frágil, no dice nada del prompt real)
// o llamar la API real (cuesta dinero y no es determinista). Kaire, que ya
// resolvió este mismo patrón, tampoco tiene pruebas unitarias de su loop —
// se verifica con conversaciones reales contra el modelo real. Ver el paso 8
// del README: correr las tres conversaciones de ventas/leads.md contra el bot
// antes de conectarlo a un número vivo. Eso requiere DEEPSEEK_API_KEY, que
// todavía no existe.

import { describe, expect, it } from "vitest";
import { dividirEnBurbujas, formatoRelativo, resolverEscalacion } from "./agente";

describe("resolverEscalacion", () => {
  it("pasar_a_cotizacion arma el aviso con el resumen y deja al lead calificado", () => {
    const r = resolverEscalacion("pasar_a_cotizacion", { resumen: "LEAD — taquería" }, "525500000000");
    expect(r?.estadoFinal).toBe("calificado");
    expect(r?.avisoOwner?.mensaje).toContain("LEAD — taquería");
    expect(r?.avisoOwner?.mensaje).toContain("525500000000");
    expect(r?.avisoOwner?.resumenCorto).toContain("525500000000");
  });

  it("pasar_a_cotizacion sin resumen no truena, deja un marcador visible", () => {
    const r = resolverEscalacion("pasar_a_cotizacion", {}, "525500000000");
    expect(r?.avisoOwner?.mensaje).toContain("(sin resumen)");
  });

  it("pasar_con_gerardo arma el aviso con el motivo y deja esperando_humano", () => {
    const r = resolverEscalacion("pasar_con_gerardo", { motivo: "pidió precio dos veces" }, "525500000000");
    expect(r?.estadoFinal).toBe("esperando_humano");
    expect(r?.avisoOwner?.mensaje).toContain("pidió precio dos veces");
  });

  it("pasar_con_gerardo sin motivo cae a 'sin especificar', no a undefined en el texto", () => {
    const r = resolverEscalacion("pasar_con_gerardo", {}, "525500000000");
    expect(r?.avisoOwner?.mensaje).toContain("sin especificar");
  });

  it("descartar_lead deja descartado y SIN avisoOwner — un 'no, gracias' no interrumpe a Gerardo", () => {
    const r = resolverEscalacion("descartar_lead", { motivo: "no le interesó" }, "525500000000");
    expect(r?.estadoFinal).toBe("descartado");
    expect(r?.avisoOwner).toBeUndefined();
  });

  it("una herramienta que no es de cierre (guardar_datos_lead) no es una escalación", () => {
    expect(resolverEscalacion("guardar_datos_lead", { nombre: "Roberto" }, "525500000000")).toBeNull();
  });
});

describe("dividirEnBurbujas", () => {
  it("una línea por burbuja", () => {
    expect(dividirEnBurbujas("Hola, mucho gusto.\n¿Con quién tengo el gusto?")).toEqual([
      "Hola, mucho gusto.",
      "¿Con quién tengo el gusto?",
    ]);
  });

  it("descarta líneas en blanco entre burbujas", () => {
    expect(dividirEnBurbujas("Primera.\n\n\nSegunda.")).toEqual(["Primera.", "Segunda."]);
  });

  it("recorta espacios sueltos al inicio y final de cada línea", () => {
    expect(dividirEnBurbujas("  con espacios  \n\tcon tab\t")).toEqual(["con espacios", "con tab"]);
  });

  it("texto vacío da cero burbujas, no una burbuja vacía", () => {
    expect(dividirEnBurbujas("")).toEqual([]);
    expect(dividirEnBurbujas("   \n   ")).toEqual([]);
  });
});

describe("formatoRelativo", () => {
  const haceMs = (ms: number) => new Date(Date.now() - ms).toISOString();

  it("menos de 1 minuto: 'justo ahora'", () => {
    expect(formatoRelativo(haceMs(30_000))).toBe("justo ahora");
  });

  it("minutos: 'hace N min'", () => {
    expect(formatoRelativo(haceMs(10 * 60_000))).toBe("hace 10 min");
  });

  it("el borde de 60 minutos ya es horas, no '60 min'", () => {
    expect(formatoRelativo(haceMs(60 * 60_000))).toBe("hace 1 h");
  });

  it("horas: 'hace N h'", () => {
    expect(formatoRelativo(haceMs(5 * 60 * 60_000))).toBe("hace 5 h");
  });

  it("el borde de 24 horas ya es 'ayer', no '24 h'", () => {
    expect(formatoRelativo(haceMs(24 * 60 * 60_000))).toBe("ayer");
  });

  it("dos días o más: 'hace N días', no 'ayer' repetido", () => {
    expect(formatoRelativo(haceMs(3 * 24 * 60 * 60_000))).toBe("hace 3 días");
  });
});

describe("dividirEnBurbujas — comillas envolventes", () => {
  it("quita las comillas que envuelven la burbuja entera", () => {
    // El modelo copia las líneas de ejemplo del prompt con comillas incluidas.
    // Sin esto al cliente le llega `"¡Hola Roberto!"` y se ve absurdo.
    expect(dividirEnBurbujas('"¡Hola Roberto! Gracias por escribir a GESEEN."')).toEqual([
      "¡Hola Roberto! Gracias por escribir a GESEEN.",
    ]);
  });

  it("quita también comillas tipográficas", () => {
    expect(dividirEnBurbujas("“Vimos que buscas vender sin comisión.”")).toEqual([
      "Vimos que buscas vender sin comisión.",
    ]);
  });

  it("respeta una cita legítima a media frase", () => {
    expect(dividirEnBurbujas('Me dijiste "no tengo capital" y lo entiendo.')).toEqual([
      'Me dijiste "no tengo capital" y lo entiendo.',
    ]);
  });

  it("no toca una burbuja normal", () => {
    expect(dividirEnBurbujas("¿A qué se dedica tu negocio?")).toEqual([
      "¿A qué se dedica tu negocio?",
    ]);
  });

  it("limpia cada línea por separado", () => {
    expect(dividirEnBurbujas('"Hola."\n"¿Cómo vas?"')).toEqual(["Hola.", "¿Cómo vas?"]);
  });
});
