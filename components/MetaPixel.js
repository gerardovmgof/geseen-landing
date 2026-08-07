"use client";

import Script from "next/script";
import { SITE } from "@/lib/site";

// Sin ID configurado el pixel no se monta, así que en local y antes de
// tener cuenta en Meta no se carga nada ni se rastrea a nadie.
export default function MetaPixel() {
  if (!SITE.metaPixelId) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${SITE.metaPixelId}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${SITE.metaPixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}

// Se dispara al tocar un botón de contacto: es la conversión que de verdad
// importa medir, y sin esto Meta no puede optimizar hacia quien sí escribe.
export function trackContact(method) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", "Contact", { contact_method: method });
}
