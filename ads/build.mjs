// Genera los anuncios de GESEEN como PNG listos para subir a Meta/LinkedIn.
// Uso: npm run ads
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { FORMATS } from "./theme.mjs";
import {
  VARIANTS,
  WA_VARIANTS,
  CATALOG,
  buildAd,
  buildCatalogCard,
  buildCover,
} from "./templates.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
const DOMAIN = "geseen-landing.vercel.app";

function font(file, name, weight, style = "normal") {
  return {
    name,
    data: readFileSync(join(HERE, "fonts", file)),
    weight,
    style,
  };
}

const fonts = [
  font("Geist-Regular.ttf", "Geist", 400),
  font("Geist-Medium.ttf", "Geist", 500),
  font("Geist-SemiBold.ttf", "Geist", 600),
  font("GeistMono-Regular.ttf", "Geist Mono", 400),
  font("InstrumentSerif-Italic.ttf", "Instrument Serif", 400, "italic"),
];

const isotype = readFileSync(join(HERE, "..", "public", "isotype-white.png"));
const isotypeDataUri = `data:image/png;base64,${isotype.toString("base64")}`;

mkdirSync(OUT, { recursive: true });

async function toPng(markup, width, height) {
  const svg = await satori(markup, { width, height, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: width } })
    .render()
    .asPng();
}

let count = 0;
for (const variant of [...VARIANTS, ...WA_VARIANTS]) {
  for (const [formatName, format] of Object.entries(FORMATS)) {
    const markup = buildAd({
      variant,
      format: formatName,
      isotypeDataUri,
      domain: DOMAIN,
    });

    const png = await toPng(markup, format.width, format.height);

    const file = `${variant.id}-${formatName}.png`;
    writeFileSync(join(OUT, file), png);
    console.log(`✓ ${file}  ${format.width}x${format.height}  (${format.label})`);
    count++;
  }
}

// Fichas del catálogo de WhatsApp Business: siempre cuadradas.
for (const [index, item] of CATALOG.entries()) {
  const markup = buildCatalogCard({ item, index, isotypeDataUri });
  const png = await toPng(markup, 1080, 1080);
  const file = `${item.id}.png`;
  writeFileSync(join(OUT, file), png);
  console.log(`✓ ${file}  1080x1080  (catálogo WhatsApp)`);
  count++;
}

// Portada del perfil de WhatsApp Business.
const coverPng = await toPng(buildCover({ isotypeDataUri }), 1125, 600);
writeFileSync(join(OUT, "wa-portada.png"), coverPng);
console.log("✓ wa-portada.png  1125x600  (portada WhatsApp Business)");
count++;

console.log(`\n${count} imágenes generadas en ads/out/`);
