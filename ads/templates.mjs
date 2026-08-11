import { COLORS, FONTS } from "./theme.mjs";

// Satori acepta elementos de React o este mismo shape en objeto plano.
// `h` evita necesitar JSX en un script de Node.
export function h(type, style = {}, ...children) {
  const kids = children.flat().filter((c) => c !== null && c !== undefined);
  return {
    type,
    props: {
      style,
      ...(kids.length ? { children: kids.length === 1 ? kids[0] : kids } : {}),
    },
  };
}

// Proporción real del isotipo recortado (public/isotype-white.png).
const ISOTYPE_RATIO = 72 / 202;

// Satori exige src/width/height como props en <img>, no como estilos.
export function isotypeImg(src, height, style = {}) {
  return {
    type: "img",
    props: {
      src,
      height,
      width: Math.round(height * ISOTYPE_RATIO),
      style,
    },
  };
}

// Texto de los anuncios. Agregar una variante = agregar un objeto aquí.
export const VARIANTS = [
  {
    id: "cuaderno",
    eyebrow: "AUTOMATIZACIÓN",
    headline: "¿Sigues apuntando los pedidos en un cuaderno?",
    sub: "Te construimos el sistema que lo hace solo.",
    cta: "Cuéntanos tu proyecto",
  },
  {
    id: "catalogo",
    eyebrow: "E-COMMERCE + WHATSAPP",
    headline: "Tu catálogo en línea. Los pedidos, por WhatsApp.",
    sub: "Sin comisiones por venta y sin apps que instalar.",
    cta: "Pide una demo",
  },
  {
    id: "bot",
    eyebrow: "BOTS CON IA",
    headline: "Un asistente que contesta y agenda citas por ti.",
    sub: "Todo el día, sin que nadie esté pegado al chat.",
    cta: "Quiero uno",
  },
  {
    id: "marca",
    eyebrow: "GESEEN SOLUTIONS",
    headline: "Software a la medida para hacer crecer tu negocio.",
    sub: "Something you haven't ever seen",
    subSerif: true,
    cta: "Conócenos",
  },
  {
    id: "imaginacion",
    eyebrow: "PROYECTOS A LA MEDIDA",
    headline: "El límite es tu imaginación.",
    headlineSerif: true,
    sub: "Si lo puedes describir, lo podemos construir.",
    cta: "Platiquemos",
  },
];

// Anuncios para campañas "Clic para WhatsApp": el objetivo no es que visiten
// el sitio, sino que abran una conversación. Copy de baja fricción y CTA en
// verde, respetando la regla de la landing (verde = solo WhatsApp).
export const WA_VARIANTS = [
  {
    id: "wa-consulta",
    eyebrow: "CONSULTA SIN COSTO",
    headline: "Cuéntanos qué necesita tu negocio. Te decimos si se puede.",
    sub: "Respondemos el mismo día. Sin compromiso.",
    cta: "Escríbenos por WhatsApp",
    whatsapp: true,
  },
  {
    id: "wa-cotiza",
    eyebrow: "COTIZACIÓN",
    headline: "¿Cuánto costaría automatizar tu negocio?",
    sub: "Mándanos un mensaje y te lo decimos.",
    cta: "Preguntar por WhatsApp",
    whatsapp: true,
  },
  {
    id: "wa-idea",
    eyebrow: "PROYECTOS A LA MEDIDA",
    headline: "¿Tienes una idea? Nosotros la construimos.",
    sub: "Escríbenos y la aterrizamos contigo.",
    cta: "Mándanos un mensaje",
    whatsapp: true,
  },
  {
    id: "wa-bot",
    eyebrow: "BOTS CON IA",
    headline: "Tu WhatsApp puede vender y agendar solo.",
    sub: "Te mostramos cómo funciona, por WhatsApp.",
    cta: "Ver cómo funciona",
    whatsapp: true,
  },
  {
    id: "wa-cuaderno",
    eyebrow: "AUTOMATIZACIÓN",
    headline: "Deja el cuaderno. Nosotros lo digitalizamos.",
    sub: "Escríbenos y te decimos por dónde empezar.",
    cta: "Empezar por WhatsApp",
    whatsapp: true,
  },
];

// Artículos del catálogo de WhatsApp Business. Se ven chicos y en cuadrícula,
// así que el nombre manda y todo lo demás se reduce al mínimo.
export const CATALOG = [
  {
    id: "cat-01-web",
    nombre: "Sitios y aplicaciones web",
    linea: "Rápidos y hechos a tu medida.",
  },
  {
    id: "cat-02-catalogo",
    nombre: "Catálogo con pedidos por WhatsApp",
    linea: "El pedido llega directo a tu chat.",
  },
  {
    id: "cat-03-bot",
    nombre: "Bot de WhatsApp con IA",
    linea: "Contesta y agenda citas solo.",
  },
  {
    id: "cat-04-automatizacion",
    nombre: "Automatización con IA",
    linea: "Lo repetitivo, hecho solo.",
  },
  {
    id: "cat-05-qr",
    nombre: "Menú digital QR",
    linea: "Se abre al escanear el código.",
  },
  {
    id: "cat-06-panel",
    nombre: "Panel de administración",
    linea: "Controla tu negocio tú mismo.",
  },
];

// Ficha cuadrada de catálogo: número gigante de fondo como elemento gráfico
// y el nombre del servicio al frente, legible aunque se vea en miniatura.
export function buildCatalogCard({ item, index, isotypeDataUri }) {
  return h(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      position: "relative",
      width: "100%",
      height: "100%",
      backgroundColor: COLORS.bg,
      backgroundImage: `radial-gradient(circle at 78% 22%, ${COLORS.accentSoft} 0%, transparent 50%)`,
      padding: 72,
      fontFamily: FONTS.sans,
    },

    // Número de fondo, grande y tenue
    h(
      "div",
      {
        position: "absolute",
        top: 120,
        right: 72,
        fontFamily: FONTS.mono,
        fontSize: 300,
        color: COLORS.surface2,
        lineHeight: 1,
      },
      String(index + 1).padStart(2, "0")
    ),

    h(
      "div",
      { display: "flex", alignItems: "center" },
      isotypeImg(isotypeDataUri, 52, { marginRight: 16 }),
      h(
        "div",
        {
          fontFamily: FONTS.mono,
          fontSize: 22,
          color: COLORS.text,
          letterSpacing: 2,
        },
        "GESEEN"
      )
    ),

    h(
      "div",
      { display: "flex", flexDirection: "column" },
      h(
        "div",
        {
          width: 64,
          height: 3,
          backgroundColor: COLORS.accent,
          marginBottom: 32,
        }
      ),
      h(
        "div",
        {
          fontSize: 68,
          fontWeight: 600,
          color: COLORS.text,
          lineHeight: 1.08,
          letterSpacing: -1.5,
        },
        item.nombre
      ),
      h(
        "div",
        { fontSize: 30, color: COLORS.textDim, marginTop: 20 },
        item.linea
      )
    )
  );
}

// Foto de perfil para redes (cuadrada, recortada en círculo por la plataforma).
// Solo el isotipo, sin wordmark: el lockup completo (como el que ya tenían en
// WhatsApp) no cabe legible dentro de un círculo pequeño.
//
// El isotipo es un trazo angosto (proporción ~0.36:1), así que aunque se
// agrande no llena el cuadro a los lados. Para que no se sienta como margen
// muerto, un anillo delgado en el acento marca la zona segura del círculo
// (92% del lienzo) y un resplandor radial le da profundidad al fondo — el
// isotipo queda al 80% de alto, con margen real pero de aspecto intencional.
export function buildProfileIcon({ isotypeDataUri, size = 1200 }) {
  const isoHeight = Math.round(size * 0.8);
  const ringSize = Math.round(size * 0.92);

  return h(
    "div",
    {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      width: "100%",
      height: "100%",
      backgroundColor: COLORS.bg,
      backgroundImage: `radial-gradient(circle at 50% 50%, ${COLORS.accentSoft} 0%, transparent 68%)`,
    },
    h("div", {
      position: "absolute",
      width: ringSize,
      height: ringSize,
      borderRadius: 9999,
      border: "3px solid rgba(124,134,255,0.35)",
    }),
    isotypeImg(isotypeDataUri, isoHeight)
  );
}

// Portada del perfil de WhatsApp Business (1125x600).
//
// Deliberadamente sin texto ni logo centrado: WhatsApp monta la foto de perfil
// justo en el centro y recorta los bordes distinto en cada dispositivo, así que
// cualquier elemento "importante" acaba tapado o cortado. En su lugar va una
// textura de marca que se lee bien con cualquier recorte.
export function buildCover({ isotypeDataUri }) {
  const TILES = 96;

  return h(
    "div",
    {
      display: "flex",
      position: "relative",
      width: "100%",
      height: "100%",
      backgroundColor: COLORS.bg,
      overflow: "hidden",
    },

    // Retícula de isotipos, muy tenue: el patrón sobrevive cualquier recorte.
    h(
      "div",
      {
        display: "flex",
        flexWrap: "wrap",
        alignContent: "flex-start",
        width: "100%",
        height: "100%",
        paddingTop: 34,
        paddingLeft: 34,
      },
      Array.from({ length: TILES }, (_, i) =>
        isotypeImg(isotypeDataUri, 56, {
          opacity: 0.16,
          marginRight: 62,
          marginBottom: 34,
        })
      )
    ),

    // Resplandor de acento fuera del centro, para que la foto de perfil no lo tape.
    h("div", {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundImage:
        "radial-gradient(circle at 16% 28%, rgba(124,134,255,0.32) 0%, transparent 44%), radial-gradient(circle at 86% 76%, rgba(124,134,255,0.26) 0%, transparent 42%)",
    })
  );
}

// Portadas de página (Facebook Page / LinkedIn Company Page). Ambas plataformas
// montan el logo/foto de perfil sobre la esquina inferior izquierda de la
// portada, así que el contenido real vive del centro hacia la derecha; a la
// izquierda va un isotipo gigante y tenuísimo, puramente decorativo — si el
// logo lo tapa no importa, no lleva información.
function coverBackdrop(isotypeDataUri, ghostHeight) {
  return [
    h("div", {
      position: "absolute",
      inset: 0,
      backgroundImage: `radial-gradient(circle at 72% 35%, ${COLORS.accentSoft} 0%, transparent 55%)`,
    }),
    isotypeImg(isotypeDataUri, ghostHeight, {
      position: "absolute",
      left: Math.round(ghostHeight * -0.12),
      bottom: Math.round(ghostHeight * -0.18),
      opacity: 0.07,
    }),
  ];
}

// Facebook Page cover. Se renderiza a 1702x630 (2x de 851x315, tamaño que
// recomienda Facebook) para que se vea nítida en pantallas retina.
export function buildFacebookCover({ isotypeDataUri }) {
  return h(
    "div",
    {
      display: "flex",
      position: "relative",
      width: "100%",
      height: "100%",
      backgroundColor: COLORS.bg,
      overflow: "hidden",
      fontFamily: FONTS.sans,
    },
    ...coverBackdrop(isotypeDataUri, 1500),

    h(
      "div",
      {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        justifyContent: "center",
        position: "relative",
        width: "100%",
        height: "100%",
        paddingRight: 96,
        paddingLeft: 96,
      },
      h(
        "div",
        {
          fontFamily: FONTS.mono,
          fontSize: 24,
          color: COLORS.accent,
          letterSpacing: 3,
          marginBottom: 20,
        },
        "[ GESEEN SOLUTIONS ]"
      ),
      h(
        "div",
        { display: "flex", alignItems: "center" },
        isotypeImg(isotypeDataUri, 100, { marginRight: 22 }),
        h(
          "div",
          {
            fontSize: 76,
            fontWeight: 600,
            color: COLORS.text,
            letterSpacing: -2,
          },
          "GESEEN"
        )
      ),
      h(
        "div",
        {
          fontFamily: FONTS.serif,
          fontStyle: "italic",
          fontSize: 34,
          color: COLORS.textDim,
          marginTop: 18,
        },
        "Something you haven't ever seen"
      ),
      h(
        "div",
        {
          display: "flex",
          alignItems: "center",
          marginTop: 34,
        },
        h("div", { width: 48, height: 2, backgroundColor: COLORS.accent, marginRight: 20 }),
        h(
          "div",
          {
            fontFamily: FONTS.mono,
            fontSize: 20,
            color: COLORS.textFaint,
            letterSpacing: 3,
          },
          "WEB · E-COMMERCE · WHATSAPP · IA"
        )
      )
    )
  );
}

// LinkedIn Company Page cover. Franja muy angosta (1128x191 real; se renderiza
// a 2256x382, 2x). No hay espacio para un bloque de varias líneas, así que
// todo va en un solo renglón horizontal.
export function buildLinkedInCover({ isotypeDataUri }) {
  return h(
    "div",
    {
      display: "flex",
      position: "relative",
      width: "100%",
      height: "100%",
      backgroundColor: COLORS.bg,
      overflow: "hidden",
      fontFamily: FONTS.sans,
    },
    ...coverBackdrop(isotypeDataUri, 900),

    h(
      "div",
      {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        position: "relative",
        width: "100%",
        height: "100%",
        paddingRight: 90,
      },
      isotypeImg(isotypeDataUri, 128, { marginRight: 24 }),
      h(
        "div",
        {
          fontSize: 68,
          fontWeight: 600,
          color: COLORS.text,
          letterSpacing: -1.5,
        },
        "GESEEN"
      ),
      h("div", {
        width: 2,
        height: 60,
        backgroundColor: COLORS.borderStrong,
        marginLeft: 32,
        marginRight: 32,
      }),
      h(
        "div",
        {
          fontFamily: FONTS.serif,
          fontStyle: "italic",
          fontSize: 38,
          color: COLORS.textDim,
        },
        "Something you haven't ever seen"
      )
    )
  );
}

// Escalas por formato: cada lienzo necesita su propio ritmo tipográfico.
// padTop/padBottom extra en story: Instagram tapa ~14% arriba y ~20% abajo
// con su propia interfaz, así que el contenido se mantiene en la zona segura.
const SCALE = {
  square: { pad: 80, iso: 64, eyebrow: 24, headline: 76, sub: 32, cta: 28 },
  story: {
    pad: 90,
    padTop: 260,
    padBottom: 360,
    iso: 80,
    eyebrow: 28,
    headline: 88,
    sub: 36,
    cta: 30,
  },
  link: { pad: 64, iso: 48, eyebrow: 20, headline: 54, sub: 26, cta: 24 },
};

export function buildAd({ variant, format, isotypeDataUri, domain }) {
  const s = SCALE[format];

  return h(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      width: "100%",
      height: "100%",
      backgroundColor: COLORS.bg,
      backgroundImage: `radial-gradient(circle at 22% 18%, ${COLORS.accentSoft} 0%, transparent 45%), radial-gradient(circle at 85% 92%, ${COLORS.accentSoft} 0%, transparent 40%)`,
      paddingLeft: s.pad,
      paddingRight: s.pad,
      paddingTop: s.padTop ?? s.pad,
      paddingBottom: s.padBottom ?? s.pad,
      fontFamily: FONTS.sans,
    },

    // Encabezado: isotipo + wordmark
    h(
      "div",
      { display: "flex", alignItems: "center" },
      isotypeImg(isotypeDataUri, s.iso, { marginRight: 18 }),
      h(
        "div",
        {
          fontFamily: FONTS.mono,
          fontSize: s.eyebrow,
          color: COLORS.text,
          letterSpacing: 2,
        },
        "GESEEN"
      )
    ),

    // Cuerpo: eyebrow + headline + sub, centrado en el espacio sobrante
    h(
      "div",
      {
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        justifyContent: "center",
      },
      h(
        "div",
        {
          fontFamily: FONTS.mono,
          fontSize: s.eyebrow,
          color: COLORS.accent,
          letterSpacing: 2,
          marginBottom: 24,
        },
        `[ ${variant.eyebrow} ]`
      ),
      h(
        "div",
        {
          fontFamily: variant.headlineSerif ? FONTS.serif : FONTS.sans,
          fontStyle: variant.headlineSerif ? "italic" : "normal",
          fontWeight: variant.headlineSerif ? 400 : 600,
          fontSize: s.headline,
          color: COLORS.text,
          lineHeight: 1.08,
          letterSpacing: -1.5,
        },
        variant.headline
      ),
      h(
        "div",
        {
          fontFamily: variant.subSerif ? FONTS.serif : FONTS.sans,
          fontStyle: variant.subSerif ? "italic" : "normal",
          fontSize: s.sub,
          color: COLORS.textDim,
          marginTop: 28,
          lineHeight: 1.35,
        },
        variant.sub
      )
    ),

    // Pie: CTA + dominio
    h(
      "div",
      { display: "flex", alignItems: "center", justifyContent: "space-between" },
      h(
        "div",
        {
          display: "flex",
          backgroundColor: variant.whatsapp ? COLORS.whatsapp : COLORS.accent,
          color: variant.whatsapp ? "#0A0A0B" : "#FFFFFF",
          fontSize: s.cta,
          fontWeight: 500,
          paddingTop: 18,
          paddingBottom: 18,
          paddingLeft: 34,
          paddingRight: 34,
          borderRadius: 999,
        },
        variant.cta
      ),
      h(
        "div",
        {
          fontFamily: FONTS.mono,
          fontSize: s.cta,
          color: COLORS.textFaint,
        },
        domain
      )
    )
  );
}
