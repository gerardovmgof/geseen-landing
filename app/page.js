import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Portfolio from "@/components/Portfolio";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import WaveDivider from "@/components/decor/WaveDivider";
import ScrollProgress from "@/components/ui/ScrollProgress";
import BackToTop from "@/components/ui/BackToTop";

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Services />
        <WaveDivider />
        <Portfolio />
        <WaveDivider />
        <Contact />
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}
