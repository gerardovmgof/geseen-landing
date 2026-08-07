# Generador de anuncios GESEEN

Genera los creativos de los anuncios como PNG, usando la misma tipografía,
colores e isotipo de la landing. Hecho con [Satori](https://github.com/vercel/satori).

## Cómo generarlos

```bash
npm run ads
```

Los PNG salen en `ads/out/` (esa carpeta no se sube a git — se regenera
corriendo el comando). Cada variante se exporta en 3 formatos:

| Formato | Medidas | Dónde va |
|---|---|---|
| `square` | 1080×1080 | Feed de Instagram y Facebook |
| `story` | 1080×1920 | Stories y Reels |
| `link` | 1200×628 | Anuncio con link en Facebook y LinkedIn |

## Cómo cambiar los textos

Todo el copy vive en `templates.mjs`, en la lista `VARIANTS`. Para agregar un
anuncio nuevo, copia uno de los bloques existentes y cámbiale el texto:

```js
{
  id: "mi-anuncio",          // nombre del archivo que se genera
  eyebrow: "CATEGORÍA",      // texto chico de arriba, en mayúsculas
  headline: "El titular.",   // el mensaje principal
  sub: "Una línea de apoyo.",
  cta: "Botón",
}
```

Vuelve a correr `npm run ads` y aparecen los 3 formatos nuevos.

Dos opciones extra para darle otro aire a una variante:
`headlineSerif: true` pone el titular en la serif itálica de la marca, y
`subSerif: true` hace lo mismo con la línea de apoyo.

## Notas

- Los colores están en `theme.mjs` con valores literales, porque Satori no
  entiende las variables CSS que usa la landing. Si cambian la paleta del
  sitio, hay que actualizarlos aquí también.
- Satori solo soporta flexbox (nada de CSS grid) y un subconjunto de CSS.
- Las fuentes están en `fonts/` como TTF porque Satori no lee los woff2 que
  genera `next/font`.
- En el formato `story` el contenido se mantiene alejado de los bordes a
  propósito: Instagram tapa la parte de arriba y abajo con su interfaz.
