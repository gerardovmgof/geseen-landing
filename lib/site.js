// Único archivo a editar cuando tengan el número de WhatsApp y correo reales.
export const SITE = {
  whatsapp: "5214424070368",
  email: "geseensolutions@gmail.com",
  waMessage: {
    es: "Hola GESEEN, quiero platicar sobre un proyecto.",
    en: "Hi GESEEN, I'd like to talk about a project.",
  },
};

export function waLink(lang) {
  const text = encodeURIComponent(SITE.waMessage[lang] ?? SITE.waMessage.es);
  return `https://wa.me/${SITE.whatsapp}?text=${text}`;
}

export function mailLink() {
  return `mailto:${SITE.email}`;
}
