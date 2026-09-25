import { footerLinks, profile } from "@/data/profile";
import { ArrowUpRight } from "lucide-react";

/** Footer: contact, links, and the small print. */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="relative scroll-mt-20 border-t border-border">
      {/* Sunset wash across the closing section. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(255,196,107,0.14), rgba(240,112,58,0.12) 45%, rgba(171,63,124,0.16))",
        }}
      />
      <div className="relative mx-auto w-full max-w-6xl px-5 pt-20 pb-10 sm:px-8">
        <div className="grid gap-14 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
          <div>
            <p className="label-mono text-clay">Section 04 · Contact</p>
            <h2 className="mt-4 font-display text-3xl leading-10 tracking-[-0.02em] text-balance sm:text-4xl sm:leading-12">
              {profile.notesIntro}
            </h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">
              {profile.notesOutro}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-2 rounded-[3px] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[#fff6ea] shadow-[0_18px_40px_-24px_rgba(171,63,124,0.8)] transition-transform hover:-translate-y-0.5"
                style={{ backgroundImage: "linear-gradient(120deg, #f0703a, #d4466e 70%, #ab3f7c)" }}
              >
                Email me
                <ArrowUpRight className="size-3.5" strokeWidth={1.8} />
              </a>
              <a
                href={profile.resume}
                className="inline-flex items-center gap-2 rounded-[3px] border border-border bg-card/70 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors hover:border-primary/50 hover:text-primary"
              >
                Résumé
                <ArrowUpRight className="size-3.5" strokeWidth={1.8} />
              </a>
            </div>
          </div>

          <div>
            <p className="label-mono border-b border-border pb-3">Links</p>
            <ul className="divide-y divide-border">
              {footerLinks.map((link) => {
                const external = link.href.startsWith("http");
                return (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      className="group flex items-baseline justify-between gap-6 py-3.5 transition-colors"
                    >
                      <span className="text-sm text-foreground transition-colors group-hover:text-primary">
                        {link.label}
                      </span>
                      <span className="label-mono truncate transition-colors group-hover:text-primary">
                        {link.handle}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="label-mono">
            © {year} {profile.name} · {profile.brand}
          </p>
          <p className="label-mono">{profile.location}</p>
          <a href="#top" className="label-mono transition-colors hover:text-primary">
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
