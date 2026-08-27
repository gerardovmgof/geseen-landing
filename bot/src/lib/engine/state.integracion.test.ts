// Prueba de integración contra el Redis REAL de Upstash.
//
// A diferencia de las otras pruebas, esta sí sale a la red. Se salta sola si no
// hay credenciales cargadas, para que no truene en un entorno donde no aplique.
//
// Correr con:  npx vitest run state.integracion

import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Vitest no carga .env.local (eso lo hace Next). Se carga a mano.
function cargarEnv(): void {
  try {
    const archivo = readFileSync(path.resolve(__dirname, "../../../.env.local"), "utf8");
    for (const linea of archivo.split("\n")) {
      const limpia = linea.trim();
      if (!limpia || limpia.startsWith("#")) continue;
      const igual = limpia.indexOf("=");
      if (igual === -1) continue;
      const clave = limpia.slice(0, igual).trim();
      const valor = limpia.slice(igual + 1).trim();
      if (valor && !process.env[clave]) process.env[clave] = valor;
    }
  } catch {
    // Sin archivo, las pruebas se saltan solas.
  }
}

cargarEnv();

const hayCredenciales = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

// Número de prueba que no existe en la vida real (rango reservado).
const TEL = "525500000000";

describe.skipIf(!hayCredenciales)("estado contra Upstash real", () => {
  let estado: typeof import("./state");

  beforeAll(async () => {
    // Import dinámico: el cliente de Redis lee las variables al construirse, así
    // que hay que cargarlas antes de importar el módulo.
    estado = await import("./state");
  });

  afterAll(async () => {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    await redis.del(`conv:${TEL}`);
    await redis.zrem("leads", TEL);
  });

  it("responde al ping", async () => {
    expect(await estado.redisVivo()).toEqual({ vivo: true });
  });

  it("la deduplicación deja pasar el mensaje una sola vez", async () => {
    const id = `prueba-${TEL}-${process.pid}`;
    expect(await estado.marcarMensajeProcesado(id)).toBe(true);
    // El reintento de Meta con el mismo id no debe pasar.
    expect(await estado.marcarMensajeProcesado(id)).toBe(false);
  });

  it("los datos del lead se acumulan sin borrar lo anterior", async () => {
    await estado.guardarDatos(TEL, { nombre: "Roberto" });
    await estado.guardarDatos(TEL, { giro: "taquería" });
    // Un campo vacío no debe borrar lo que ya se sabía.
    const datos = await estado.guardarDatos(TEL, { nombre: "" });

    expect(datos.nombre).toBe("Roberto");
    expect(datos.giro).toBe("taquería");
  });

  it("guardar datos mueve el lead a 'calificando'", async () => {
    expect((await estado.obtenerConversacion(TEL)).estado).toBe("calificando");
  });

  it("la pausa sobrevive entre lecturas", async () => {
    expect(await estado.estaPausado(TEL)).toBe(false);
    await estado.setPausado(TEL, true, "esperando_humano");
    expect(await estado.estaPausado(TEL)).toBe(true);
    await estado.setPausado(TEL, false, "calificando");
  });

  it("el historial se recorta a los últimos 20 turnos", async () => {
    const turnos = Array.from({ length: 25 }, (_, i) => ({
      rol: "user" as const,
      contenido: `mensaje ${i}`,
      en: new Date().toISOString(),
    }));
    await estado.agregarAlHistorial(TEL, turnos);

    const conv = await estado.obtenerConversacion(TEL);
    expect(conv.historial).toHaveLength(20);
    expect(conv.historial[19].contenido).toBe("mensaje 24");
  });

  it("la ventana de 24h se abre cuando escribe el cliente", async () => {
    await estado.registrarMensajeDelCliente(TEL);
    expect(await estado.dentroDeVentana24h(TEL)).toBe(true);
  });

  it("el lead aparece en el listado del modo administrador", async () => {
    const leads = await estado.listarConversaciones(50);
    expect(leads.some((l) => l.telefono === TEL)).toBe(true);
  });

  it("buscarLeads encuentra por nombre y por fragmento de teléfono", async () => {
    // TEL ya quedó con nombre: "Roberto" de una prueba anterior en este archivo.
    const porNombre = await estado.buscarLeads("roberto");
    expect(porNombre.some((c) => c.telefono === TEL)).toBe(true);

    const porTelefono = await estado.buscarLeads(TEL.slice(-4));
    expect(porTelefono.some((c) => c.telefono === TEL)).toBe(true);
  });

  it("buscarLeads no inventa coincidencias que no existen", async () => {
    const sinCoincidencia = await estado.buscarLeads("nombre-que-nadie-tiene-jamas");
    expect(sinCoincidencia).toHaveLength(0);
  });
});
