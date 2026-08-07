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
          backgroundColor: COLORS.accent,
          color: "#FFFFFF",
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
