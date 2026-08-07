// Tokens de la landing, con valores literales: Satori no resuelve variables CSS.
export const COLORS = {
  bg: "#0A0A0B",
  surface: "#121214",
  surface2: "#1A1A1E",
  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.18)",
  text: "#F5F5F4",
  textDim: "#9C9CA6",
  textFaint: "#5C5C66",
  accent: "#7C86FF",
  accentSoft: "rgba(124,134,255,0.14)",
  whatsapp: "#25D366",
};

export const FONTS = {
  sans: "Geist",
  mono: "Geist Mono",
  serif: "Instrument Serif",
};

// Formatos de anuncio soportados (px reales que piden Meta/LinkedIn).
export const FORMATS = {
  square: { width: 1080, height: 1080, label: "IG/FB feed" },
  story: { width: 1080, height: 1920, label: "Stories/Reels" },
  link: { width: 1200, height: 628, label: "FB/LinkedIn link ad" },
};
