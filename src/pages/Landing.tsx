import { BusPath } from "@/components/portfolio/BusPath";
import { Hero } from "@/components/portfolio/Hero";
import { JourneyScene } from "@/components/portfolio/JourneyScene";
import { SiteFooter } from "@/components/portfolio/SiteFooter";
import { SiteHeader } from "@/components/portfolio/SiteHeader";
import { WinsBook } from "@/components/portfolio/WinsBook";

/**
 * priyanshubishtme — a scrollable portfolio in four parts:
 * the hero and its ticket, the 3D bus journey, the dotted route through
 * education and experience, the wins book, and the footer.
 *
 * Deliberately a plain element at the root: no transformed ancestor, so the
 * fixed header and the sticky 3D viewport both behave.
 */
export default function Landing() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <JourneyScene />
        <BusPath />
        <WinsBook />
      </main>
      <SiteFooter />
    </div>
  );
}
