// Chequeo de salud para un monitor EXTERNO (UptimeRobot, Better Stack,
// healthchecks.io — todos tienen plan gratis). Apuntarle uno cada 5 minutos.
//
// Por qué externo y no un cron interno: si el hosting se cae, el cron interno
// tampoco corre. Un sistema no puede vigilarse a sí mismo cuando está muerto.
//
// Devuelve 200 si todo bien, 503 si algo está roto. El caso que más importa
// atrapar es el token de Meta vencido: si se instaló producción con un token
// personal en vez de uno de usuario de sistema, a los ~60 días el bot deja de
// contestar en silencio y nadie se acuerda por qué.

import { redisVivo } from "@/lib/engine/state";
import { tokenVivo } from "@/lib/engine/whatsapp";

export const dynamic = "force-dynamic";

const VARIABLES_REQUERIDAS = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_VERIFY_TOKEN",
  "META_APP_SECRET",
  "DEEPSEEK_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "OWNER_PHONE_NUMBER",
] as const;

// Consultar el health seguido no debe multiplicar las llamadas a Meta.
const TTL_CACHE_MS = 60_000;
let cache: { en: number; cuerpo: unknown; ok: boolean } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.en < TTL_CACHE_MS) {
    return Response.json(cache.cuerpo, { status: cache.ok ? 200 : 503 });
  }

  const faltantes = VARIABLES_REQUERIDAS.filter((v) => !process.env[v]);
  const [redis, meta] = await Promise.all([redisVivo(), tokenVivo()]);

  const ok = faltantes.length === 0 && redis.vivo && meta.vivo;
  const cuerpo = {
    ok,
    revisado: new Date().toISOString(),
    checks: {
      variables: faltantes.length === 0 ? "ok" : `faltan: ${faltantes.join(", ")}`,
      redis: redis.vivo ? "ok" : `caído: ${redis.detalle}`,
      whatsapp: meta.vivo ? "ok" : `token inválido o revocado: ${meta.detalle}`,
    },
  };

  cache = { en: Date.now(), cuerpo, ok };
  return Response.json(cuerpo, { status: ok ? 200 : 503 });
}
