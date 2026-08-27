# Plan — correlacionar leads del formulario de Meta con el bot de WhatsApp

**Estado:** especificación cerrada, sin implementar.
**Fecha:** 2026-08-26
**Depende de:** el bot base (`README.md`, pasos 1-6) ya tiene que estar corriendo — este plan es una extensión, no reemplaza nada de lo que ya existe.

---

## El problema, verificado en vivo (no es teoría)

Los anuncios de leads (`ads/templates.mjs` → `LEAD_VARIANTS`) usan un formulario de Meta con 4 preguntas calificadoras (qué necesita, tamaño de negocio, presupuesto, urgencia) que termina en un botón "Chat on WhatsApp". Se probó ese flujo completo con un lead de prueba real (formulario "GESEEN - Leads calificados", form ID `2078678209703388`) y esto es lo que pasa, confirmado, no supuesto:

1. El botón abre un chat hacia el **número de GESEEN**, no lleva el teléfono del lead como parámetro.
2. Sí precarga un borrador de mensaje en WhatsApp, pero es un texto **genérico de Meta** ("Hello! Can I get more info on this?"), sin relación con las respuestas del formulario.
3. **Las 4 respuestas nunca llegan al chat.** Viven solo en el Centro de Leads de Meta (Graph API `GET /{leadgen_id}`), separadas por completo del mensaje de WhatsApp que llega después.
4. El teléfono se capturó en formato E.164 limpio: `+525614248036` (52 + 10 dígitos, sin el "1" extra de móvil) — coincide con el formato que usa WhatsApp Cloud API en el campo `from` del webhook. La correlación por teléfono debería funcionar sin normalización especial, pero **hay que confirmarlo con un lead real llegando por WhatsApp** (ver sección de pruebas).

Conclusión: sin este plan, cuando un lead calificado escribe, el bot (o Gerardo) no tiene forma de saber qué contestó — solo ve un mensaje en blanco o el borrador genérico de Meta. Hay que ir a buscar sus respuestas por separado y cruzarlas por teléfono.

## Qué ya existe y con qué encaja esto

El bot (`src/lib/engine/`) ya tiene exactamente la pieza que hace falta para esto — no es un sistema aparte:

- `state.ts` → `DatosLead` ya tiene `dolor` y `urgencia`, que mapean casi 1:1 a las preguntas 1 y 4 del formulario.
- `guardarDatos(telefono, datos)` ya mezcla sin destruir lo que había — se puede llamar **antes** de que el lead escriba, para dejar sus datos precargados en Redis.
- `agente.ts` → `construirSystemPromptCliente()` ya arma un bloque "Datos que ya se saben de este lead (no se los vuelvas a preguntar)" a partir de `conv.datos`. Si el webhook de Meta precarga `dolor` y `urgencia` antes del primer mensaje, el modelo **ya debería** dejar de preguntarlos, sin tocar `agente.ts`.
- `prompts/cliente.md` sección "Enganche" ya tiene el patrón "si el cliente ya dio contexto, no le preguntes lo que ya dijo" — solo hay que extenderlo explícitamente al caso del formulario, porque hoy el guion **siempre** pregunta el nombre primero sin condicionar a datos ya conocidos.
- El guion humano para este caso (branch por cada respuesta de "¿Qué necesitas resolver?") ya está escrito en `~/.claude/skills/geseen-whatsapp/references/voz-y-guion.md` → sección **M1b**. Es directamente reusable como base del prompt del bot — no hay que redactarlo de cero, hay que adaptarlo a instrucción de sistema.

## Cambios necesarios

### 1. `DatosLead` — dos campos nuevos (`state.ts`)

```ts
export interface DatosLead {
  nombre?: string;
  giro?: string;
  ciudad?: string;
  dolor?: string;
  comoLoResuelveHoy?: string;
  volumen?: string;
  urgencia?: string;
  servicioProbable?: string;
  // Nuevos — solo los llena el webhook de Meta, el bot nunca los pregunta:
  presupuestoDeclarado?: string;
  tamanoNegocioDeclarado?: string;
  origenFormulario?: boolean;
}
```

`origenFormulario` es la bandera que le dice al prompt "este lead ya viene precalificado, usa el guion corto".

### 2. Nuevo endpoint — webhook de `leadgen` de Meta

`src/app/api/meta-leads/webhook/route.ts`, mismo patrón que `whatsapp/webhook/route.ts` (verificación GET + firma + `after()` para responder rápido):

- **GET** — handshake de verificación con un token nuevo, `META_LEADGEN_VERIFY_TOKEN` (puede ser el mismo valor que `WHATSAPP_VERIFY_TOKEN` o uno distinto, decisión libre).
- **POST** — Meta manda `{ entry: [{ changes: [{ field: "leadgen", value: { leadgen_id, page_id, form_id, created_time } }] }] }`. Por cada `leadgen_id`:
  1. Verificar firma igual que el webhook de WhatsApp (`firmaValida`, reusar tal cual si el secreto de firma es el mismo App de Meta — confirmarlo).
  2. `GET https://graph.facebook.com/v21.0/{leadgen_id}?access_token={META_PAGE_ACCESS_TOKEN}` → devuelve `field_data: [{ name, values }]` con las 4 respuestas + `full_name`, `email`, `phone_number` (built-ins que van aparte de las preguntas custom, con `name` fijo).
  3. Mapear por `name` de cada pregunta (los nombres exactos del campo hay que sacarlos de una respuesta real de la API, no adivinarlos — verlo en la prueba de la sección de abajo) a los campos de `DatosLead`:
     - "¿Qué necesitas resolver?" → `dolor`
     - "¿Qué presupuesto tienes considerado?" → `presupuestoDeclarado`
     - "¿Para cuándo lo necesitas?" → `urgencia`
     - "¿Cuántas personas trabajan en tu negocio?" → `tamanoNegocioDeclarado`
     - `full_name` → `nombre` (decisión a confirmar: el nombre del formulario SÍ es texto que la persona tecleó, a diferencia del apodo de WhatsApp — cliente.md dice que el apodo de WhatsApp no cuenta pero no dice nada de este caso. Recomendación: sí precargarlo, y ajustar `cliente.md` para que no vuelva a preguntar el nombre cuando `origenFormulario` es `true` y `nombre` ya existe.)
  4. Normalizar el teléfono (`phone_number` del campo built-in) a como llega en el webhook de WhatsApp: quitar el `+`, dejar solo dígitos. Con el formato confirmado (`525614248036`, sin "1" extra), debería ser un simple `replace(/\D/g, "")`. **Pendiente de confirmar con un lead real** — ver pruebas.
  5. `guardarDatos(telefonoNormalizado, { ...datos, origenFormulario: true })`.

### 3. `prompts/cliente.md` — condicionar el Enganche

Añadir después de la sección "Enganche" actual (la que dice "pregunta su nombre primero"):

> Si `origenFormulario` es `true` en los datos ya conocidos: **no preguntes el nombre si ya está**, y en vez de la pregunta abierta de negocio, usa la burbuja de apertura que corresponda a `dolor` (tabla abajo). Si `dolor` no calza con ninguna fila (vino de la opción "sistema interno a la medida" o "no lo tengo claro"), usa la burbuja genérica de esa fila, no inventes una nueva.

Y pegar la tabla de branch-lines que ya está en `voz-y-guion.md` → M1b, adaptada a la voz del bot (más neutra, sin "soy Gerardo" porque el bot no finge ser persona — usar "vimos que..." en vez de "vi que...").

Esto es edición de prompt en markdown, no de código — bajo riesgo, alto impacto.

### 4. Meta — configuración de una sola vez (fuera de código)

1. En el Meta App Dashboard del proyecto: producto **Webhooks** → suscribir el campo `leadgen` a nivel de Página, apuntando a `https://<dominio-del-bot>/api/meta-leads/webhook`.
2. Vía Graph API: `POST /{page-id}/subscribed_apps?subscribed_fields=leadgen` con el Page Access Token.
3. Confirmar que el token tiene el permiso `leads_retrieval` (además de `pages_manage_ads`/`pages_read_engagement` que ya debe tener por los otros usos de Ads).
4. Variables de entorno nuevas en `.env.local` / Vercel:
   ```
   META_PAGE_ACCESS_TOKEN=
   META_LEADGEN_VERIFY_TOKEN=
   META_APP_SECRET=          # puede ya existir si se reusa el mismo App que WhatsApp
   ```

### 5. Pruebas — en este orden, antes de dar por hecho nada

1. **Confirmar el nombre exacto de los campos de `field_data`.** Se puede hacer sin webhook: desde Graph API Explorer o `curl`, pedir `GET /{leadgen_id}` del lead de prueba que ya existe (form `2078678209703388`, un solo lead) y ver los `name` reales de cada pregunta.
2. **Correlación real de teléfono.** Mandar un mensaje de WhatsApp de prueba al número de GESEEN desde un celular real (no el flujo de "Chat on WhatsApp", solo escribir directo), ver qué formato trae `from` en el payload del webhook de WhatsApp que ya está corriendo (`whatsapp/webhook/route.ts`, un `console.log` temporal basta), y compararlo dígito por dígito contra el `phone_number` que devuelve el Graph API del lead. Si no calzan exacto, ahí se ajusta la normalización — no antes, no a ciegas.
3. Someter un lead de prueba real (`Test form` en el formulario, como se hizo en esta sesión) **y** simular que llega su mensaje de WhatsApp (puede ser el propio Gerardo escribiéndole al número del bot), y confirmar que el bot abre con la burbuja de branch correcta en vez de la pregunta genérica.

## Lo que NO hay que hacer

- No hace falta una base de datos nueva. Redis ya está.
- No hace falta que el bot llame a Meta en tiempo real cuando llega el mensaje de WhatsApp — los datos ya están precargados en Redis desde que se sometió el formulario, antes de que la persona escriba.
- No cambiar `agente.ts` a menos que la prueba 3 muestre que el modelo no respeta el bloque "no lo vuelvas a preguntar" de forma confiable — empezar solo con el cambio de prompt (`cliente.md`), es la superficie de cambio más chica.
