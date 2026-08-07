import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { LanguageProvider } from "@/lib/language-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
});

export const metadata = {
  title: "GESEEN Solutions — Software a la medida",
  description:
    "Diseño, desarrollo y automatización con inteligencia artificial para negocios que quieren dar el siguiente paso.",
  openGraph: {
    title: "GESEEN Solutions",
    description: "Something you haven't ever seen",
    images: ["/geseen-black.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text font-sans">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
