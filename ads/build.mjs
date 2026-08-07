// Genera los anuncios de GESEEN como PNG listos para subir a Meta/LinkedIn.
// Uso: npm run ads
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { FORMATS } from "./theme.mjs";
import { VARIANTS, buildAd } from "./templates.mjs";

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

let count = 0;
for (const variant of VARIANTS) {
  for (const [formatName, format] of Object.entries(FORMATS)) {
    const markup = buildAd({
      variant,
      format: formatName,
      isotypeDataUri,
      domain: DOMAIN,
    });

    const svg = await satori(markup, {
      width: format.width,
      height: format.height,
      fonts,
    });

    const png = new Resvg(svg, {
      fitTo: { mode: "width", value: format.width },
    })
      .render()
      .asPng();

    const file = `${variant.id}-${formatName}.png`;
    writeFileSync(join(OUT, file), png);
    console.log(`✓ ${file}  ${format.width}x${format.height}  (${format.label})`);
    count++;
  }
}

console.log(`\n${count} anuncios generados en ads/out/`);
