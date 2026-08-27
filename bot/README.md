# Bot de ventas de WhatsApp — GESEEN Solutions

Bot que atiende el WhatsApp Business de GESEEN, califica leads que llegan de los anuncios de Meta, y le entrega a Gerardo un resumen listo para que Sebastián cotice.

**Estado:** especificación cerrada, sin implementar.
**Fecha:** 2026-08-11

---

## Decisiones tomadas

| Decisión | Elegido | Por qué |
|---|---|---|
| Modelo | **DeepSeek** (`deepseek-chat` / V3) | Costo. Compatible con el formato de OpenAI, incluido function calling. |
| Canal cliente | **WhatsApp Cloud API** de Meta | Oficial, estable, ya probado en [Kaire](../../Kaire). |
| Canal equipo | **WhatsApp 1:1 con Gerardo** | La Groups API existe pero exige Official Business Account y que el bot cree el grupo — no puede entrar a "Claudeando". |
| Estado | **Upstash Redis** | Key-value, sin esquema ni migraciones, plan gratis. No consume slots de Supabase. |
| Patrón | **Tool use** (function calling) | Tomado de Kaire. Más robusto que pedirle JSON: llamar la herramienta *es* la acción, el modelo no puede "olvidarla". |
| Autonomía | Automático **con escalamiento** | El bot corre el guion solo y se detiene cuando algo se sale de él. |
| Identidad | Neutro, sin nombre propio | Contesta como GESEEN. No finge ser una persona. Si preguntan si es bot, lo dice. |

---

## Qué se reusa de Kaire

Kaire (`~/Documents/CLAUDE/Kaire`) ya resolvió la plomería. Lo que se copia casi tal cual:

| De Kaire | Para qué | Cambios |
|---|---|---|
| `src/lib/whatsapp.ts` | Cliente de la Cloud API y parseo del webhook | Agregar soporte de plantillas y de mensajes no-texto |
| `src/app/api/whatsapp/webhook/route.ts` | Dedup, chequeo de pausa, manejo de errores | Cambiar Supabase por Redis |
| `src/lib/conversations.ts` | Historial, `bot_paused`, deduplicación | Reescribir sobre Redis |
| `notifyBotFailure()` | Si el modelo truena: pausa el chat y avisa al cliente | Agregar aviso a Gerardo |
| Patrón `OWNER_PHONE_NUMBER` | Modo administrador por chat | Adaptado a ventas |

**Lo que NO se reusa:** todo lo de agenda (`appointments.ts`, `scheduling.ts`, `admin.ts`), el panel web, y Supabase.

### Tres huecos de Kaire que aquí hay que tapar

1. **Los mensajes que no son texto se descartan en silencio.** `extractIncomingMessages` filtra `type === "text"`. Si un lead manda una nota de voz — cosa común en México — el bot no contesta nada y nadie se entera. Aquí: audio, imagen o documento → escalar con Gerardo.
2. **No hay manejo de la ventana de 24 horas.** Meta solo deja mandar texto libre dentro de las 24h desde el último mensaje del cliente. Kaire no usa plantillas en ningún lado. Aquí es crítico en dos puntos: el aviso a Gerardo y el seguimiento a leads fríos.
3. **`pasar_con_la_duena` no avisa a nadie**, solo pausa. Kaire se apoya en su panel web. Aquí no hay panel, así que el aviso a Gerardo es obligatorio.

---

## La ventana de 24 horas

El punto más frágil de todo el diseño. Meta solo permite mensajes de texto libre **dentro de las 24 horas** desde el último mensaje que envió *la otra persona*. Fuera de esa ventana solo pasan plantillas aprobadas.

Nos pega en tres lugares:

| Situación | Solución |
|---|---|
| Avisarle a Gerardo que hay un lead calificado | **Plantilla aprobada** (categoría UTILITY). Cuando Gerardo responde, se abre su ventana de 24h y ya puede platicar libre con el bot en modo admin. |
| Seguimiento a un lead frío a las 48h | **Plantilla aprobada**. Texto libre simplemente no se entrega. |
| Gerardo pide "mándale un mensaje al cliente" y el cliente lleva días sin escribir | El bot debe **avisarle a Gerardo que no se puede** en vez de fallar callado. |

Las plantillas se dan de alta una vez en el WhatsApp Manager de Meta y se aprueban en minutos u horas si son de categoría UTILITY.

---

## Herramientas del bot

### Modo cliente

| Herramienta | Qué hace |
|---|---|
| `guardar_datos_lead` | Guarda lo que se ha aprendido del lead. Acumulativo. |
| `pasar_a_cotizacion` | Lead calificado. Pausa el bot y le manda el resumen a Gerardo. |
| `pasar_con_gerardo` | Algo se salió del guion y se necesita una persona ahora. Pausa el bot y avisa. |
| `descartar_lead` | El cliente dijo que no. Pausa el bot y registra, sin aviso urgente. |

### Modo administrador (solo desde `OWNER_PHONE_NUMBER`)

| Herramienta | Qué hace |
|---|---|
| `listar_leads` | Lista las conversaciones activas con su estado y último mensaje. |
| `ver_conversacion` | Muestra el historial completo de un lead. |
| `mandar_mensaje_a_cliente` | Le escribe a un lead lo que Gerardo indique (preguntarle algo, reenviar la cotización). |
| `reactivar_bot` | Vuelve a encender el bot en una conversación pausada. |
| `pausar_bot` | Apaga el bot en una conversación. |

Los prompts viven en [`prompts/cliente.md`](prompts/cliente.md) y [`prompts/admin.md`](prompts/admin.md).

---

## Estado en Redis

Dos patrones de llave, nada más:

```
conv:{telefono}   → { historial: [...], pausado: bool, datos: {...}, ultimo_mensaje_at }   TTL 60 días
msg:{messageId}   → 1                                                                       TTL 48 horas
```

`msg:` es la deduplicación: Meta reintenta los webhooks y sin esto el bot contesta doble.

---

## Dónde vive

La landing de GESEEN (`../`) es un sitio estático (`output: "export"` en `next.config.mjs`), y **las API routes no existen en export estático**. El bot va como app aparte en esta carpeta, con su propio proyecto en Vercel. La landing no se toca.

---

## Plan de implementación

1. **Scaffold** — Next.js en `bot/`, sin export estático. Variables de entorno.
2. **Capa de WhatsApp** — copiar `whatsapp.ts` de Kaire, agregar plantillas y detección de mensajes no-texto.
3. **Capa de estado** — `conversations.ts` reescrito sobre Upstash Redis.
4. **Capa del modelo** — cliente de DeepSeek con el loop de tool use (adaptado de `runConversationTurn` de Kaire).
5. **Herramientas de cliente** — las 4, con sus efectos.
6. **Modo administrador** — ruteo por `OWNER_PHONE_NUMBER` y las 5 herramientas.
7. **Plantillas de Meta** — dar de alta y esperar aprobación (bloquea el paso 8).
8. **Pruebas en seco** — correr las conversaciones reales de `../ventas/leads.md` contra el bot antes de conectarlo a un número vivo.
9. **Coexistencia** — verificar que el número real puede tener Cloud API y app de WhatsApp Business a la vez, para que Gerardo siga pudiendo contestar a mano.

**El paso 8 no es opcional.** Antes de que este bot le escriba a un lead real, tiene que pasar las tres conversaciones que ya tuvimos: el arranque genérico, el señor de la verdura que no tenía capital, y el rechazo cortés que un bot ingenuo habría seguido persiguiendo.
