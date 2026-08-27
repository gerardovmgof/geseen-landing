// Carga los system prompts desde disco. Viven como Markdown en prompts/ para
// poder editar el guion de venta (y revisarlo en un diff legible) sin tocar
// código TypeScript.
//
// Esto es CONFIGURACIÓN: el motor (`lib/engine/agente.ts`) no sabe que estos
// archivos existen ni qué dicen, solo recibe las dos strings ya resueltas. Un
// segundo cliente reusa el motor tal cual y solo escribe sus propios .md.

import { readFileSync } from "node:fs";
import path from "node:path";

function cargar(archivo: string): string {
  const ruta = path.join(process.cwd(), "prompts", archivo);
  return readFileSync(ruta, "utf-8");
}

// Se leen una sola vez al arrancar el proceso: son archivos del despliegue,
// no cambian mientras el servidor corre. Si falta alguno, mejor que el
// arranque truene de inmediato a que el bot falle en silencio con el primer
// mensaje real de un lead.
export const PROMPT_CLIENTE = cargar("cliente.md");
export const PROMPT_ADMIN = cargar("admin.md");
