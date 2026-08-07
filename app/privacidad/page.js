import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Aviso de Privacidad — GESEEN Solutions",
  description:
    "Aviso de privacidad de GESEEN Solutions conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.",
};

// Documento legal: se mantiene en español aunque el resto del sitio sea
// bilingüe, porque la ley aplicable es mexicana y el texto vinculante es este.
const ACTUALIZADO = "6 de agosto de 2026";

// TODO legal: completar antes de activar el Meta Pixel o publicar campañas.
const RESPONSABLE = "[NOMBRE COMPLETO DEL RESPONSABLE]";
const DOMICILIO = "[CALLE Y NÚMERO, COLONIA, C.P., QUERÉTARO, QRO., MÉXICO]";

function Seccion({ titulo, children }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight text-text">
        {titulo}
      </h2>
      <div className="mt-3 flex flex-col gap-3 text-text-dim leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function Privacidad() {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2">
            <img src="/isotype-white.png" alt="" className="h-6 w-auto" />
            <span className="font-mono text-sm tracking-wide">GESEEN</span>
          </Link>
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-wide text-text-faint transition-colors hover:text-text"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <p className="font-mono text-xs text-text-faint">[ LEGAL ]</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl">
          Aviso de Privacidad
        </h1>
        <p className="mt-4 text-text-dim leading-relaxed">
          Este aviso se emite conforme a la Ley Federal de Protección de Datos
          Personales en Posesión de los Particulares, su Reglamento y demás
          normativa aplicable en los Estados Unidos Mexicanos.
        </p>
        <p className="mt-2 font-mono text-xs text-text-faint">
          Última actualización: {ACTUALIZADO}
        </p>

        <Seccion titulo="1. Identidad y domicilio del responsable">
          <p>
            {RESPONSABLE}, quien opera comercialmente bajo el nombre{" "}
            <strong className="text-text">GESEEN Solutions</strong>, con
            domicilio en {DOMICILIO}, es el responsable del uso y protección de
            tus datos personales.
          </p>
          <p>
            Para cualquier asunto relacionado con este aviso puedes escribir a{" "}
            <a
              href={`mailto:${SITE.email}`}
              className="text-accent underline underline-offset-4"
            >
              {SITE.email}
            </a>
            .
          </p>
        </Seccion>

        <Seccion titulo="2. Datos personales que recabamos">
          <p>
            Recabamos únicamente los datos que tú nos proporcionas de forma
            directa cuando nos contactas por WhatsApp o por correo electrónico:
            tu nombre, tu número telefónico, tu correo electrónico y la
            información sobre tu negocio o proyecto que decidas compartirnos.
          </p>
          <p>
            De manera automática, al navegar el sitio se recaban datos de
            identificación técnica y de navegación, como tu dirección IP, el
            tipo de dispositivo y navegador, y las páginas que visitas.
          </p>
          <p>
            <strong className="text-text">
              No recabamos datos personales sensibles
            </strong>{" "}
            ni datos financieros o patrimoniales a través de este sitio. Este
            sitio no procesa pagos ni solicita contraseñas.
          </p>
        </Seccion>

        <Seccion titulo="3. Finalidades del tratamiento">
          <p>
            <strong className="text-text">Finalidades primarias</strong>, que
            son necesarias para la relación con nosotros: responder a tus
            solicitudes de información, elaborar propuestas y cotizaciones,
            prestarte los servicios que contrates y darles seguimiento, así
            como cumplir con las obligaciones legales que nos correspondan.
          </p>
          <p>
            <strong className="text-text">Finalidades secundarias</strong>, que
            no son necesarias y a las que puedes negarte sin que ello afecte
            los servicios que solicitas: enviarte información sobre nuestros
            servicios, medir la efectividad de nuestra publicidad y mostrarte
            anuncios relevantes en plataformas de terceros.
          </p>
          <p>
            Si no deseas que tus datos se usen para las finalidades
            secundarias, escríbenos a {SITE.email} y lo atenderemos.
          </p>
        </Seccion>

        <Seccion titulo="4. Cookies y tecnologías de rastreo">
          <p>
            Este sitio utiliza almacenamiento local del navegador para recordar
            el idioma que elegiste. Esa información permanece en tu dispositivo
            y no se envía a ningún servidor.
          </p>
          <p>
            Asimismo, podemos utilizar el píxel de Meta (Facebook), una
            herramienta que emplea cookies y tecnologías similares para medir
            la efectividad de nuestra publicidad y para mostrar anuncios a
            personas con intereses similares. Esta herramienta puede recabar tu
            dirección IP, información de tu navegador y las acciones que
            realizas en el sitio.
          </p>
          <p>
            Puedes deshabilitar las cookies desde la configuración de tu
            navegador, y administrar tus preferencias de publicidad
            directamente en la configuración de tu cuenta de Facebook o
            Instagram.
          </p>
        </Seccion>

        <Seccion titulo="5. Transferencias de datos">
          <p>
            No vendemos ni comercializamos tus datos personales. Para poder
            operar, tus datos se almacenan y procesan en servicios de terceros
            que pueden ubicarse fuera de México, principalmente en los Estados
            Unidos de América:
          </p>
          <ul className="ml-5 list-disc flex flex-col gap-2">
            <li>
              <strong className="text-text">Vercel Inc.</strong>, para el
              alojamiento de este sitio web.
            </li>
            <li>
              <strong className="text-text">Meta Platforms, Inc.</strong>, para
              la comunicación por WhatsApp y para la medición y entrega de
              nuestra publicidad.
            </li>
            <li>
              <strong className="text-text">Google LLC</strong>, para el
              servicio de correo electrónico.
            </li>
          </ul>
          <p>
            Al proporcionarnos tus datos consientes estas transferencias, las
            cuales son necesarias para atender tu solicitud.
          </p>
        </Seccion>

        <Seccion titulo="6. Tus derechos ARCO">
          <p>
            Tienes derecho a conocer qué datos personales tenemos de ti, para
            qué los usamos y las condiciones de ese uso
            (<strong className="text-text">Acceso</strong>); a solicitar la
            corrección de tu información cuando esté desactualizada, sea
            inexacta o incompleta
            (<strong className="text-text">Rectificación</strong>); a pedir que
            eliminemos tu información cuando consideres que no se está usando
            conforme a este aviso
            (<strong className="text-text">Cancelación</strong>); y a oponerte
            al uso de tus datos para fines específicos
            (<strong className="text-text">Oposición</strong>).
          </p>
          <p>
            Para ejercer cualquiera de estos derechos, envía tu solicitud a{" "}
            <a
              href={`mailto:${SITE.email}`}
              className="text-accent underline underline-offset-4"
            >
              {SITE.email}
            </a>{" "}
            indicando tu nombre, un medio de contacto para responderte, una
            descripción clara de lo que solicitas y un documento que acredite
            tu identidad.
          </p>
          <p>
            Responderemos en un plazo máximo de 20 días hábiles. De resultar
            procedente, la solicitud se hará efectiva dentro de los 15 días
            hábiles siguientes a la respuesta.
          </p>
        </Seccion>

        <Seccion titulo="7. Revocación del consentimiento">
          <p>
            Puedes revocar en cualquier momento el consentimiento que nos
            otorgaste para el tratamiento de tus datos personales, escribiendo
            a {SITE.email}. Ten en cuenta que, por obligaciones legales o por
            la existencia de una relación contractual vigente, es posible que
            no podamos atender la revocación de forma inmediata.
          </p>
        </Seccion>

        <Seccion titulo="8. Cambios a este aviso">
          <p>
            Este aviso puede modificarse para reflejar cambios en nuestros
            servicios, en nuestras prácticas de privacidad o en la legislación
            aplicable. Cualquier modificación se publicará en esta misma
            página, con la fecha de actualización correspondiente, por lo que
            te recomendamos consultarla periódicamente.
          </p>
        </Seccion>

        <Seccion titulo="9. Autoridad en materia de protección de datos">
          <p>
            Si consideras que tu derecho a la protección de datos personales ha
            sido vulnerado, puedes acudir ante la autoridad competente en
            materia de protección de datos personales en México para presentar
            la denuncia o queja que corresponda.
          </p>
        </Seccion>
      </main>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-3xl text-center text-xs text-text-faint">
          GESEEN Solutions · © 2026 · Todos los derechos reservados.
        </div>
      </footer>
    </>
  );
}
