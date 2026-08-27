import path from "node:path";
import type { NextConfig } from "next";

// A diferencia de la landing de GESEEN (que es `output: "export"`, estática),
// este proyecto SÍ necesita servidor: el webhook de WhatsApp es una API route.
const nextConfig: NextConfig = {
  // La landing vive en la carpeta de arriba y tiene su propio package-lock.json.
  // Sin esto, Turbopack lo detecta y avisa que no sabe cuál es la raíz.
  turbopack: { root: path.resolve(__dirname) },
  // `lib/config/prompts.ts` lee prompts/*.md con fs.readFileSync. El tracing
  // automático de Vercel normalmente los detecta solo, pero se listan a mano
  // para no depender de que la detección estática los encuentre siempre.
  outputFileTracingIncludes: {
    "/api/whatsapp/webhook": ["./prompts/**/*"],
  },
};

export default nextConfig;
