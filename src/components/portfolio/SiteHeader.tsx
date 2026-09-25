import { profile, navLinks } from "@/data/profile";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

/** Hairline top bar: brand on the left, section anchors on the right. */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-border bg-background/85 backdrop-blur-md"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <a
          href="#top"
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground"
        >
          {profile.brand}
        </a>
        <nav className="flex items-center gap-5 sm:gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              {link.label}
            </a>
          ))}
          <a
            href={`mailto:${profile.email}`}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground underline decoration-border decoration-1 underline-offset-4 transition-colors hover:decoration-foreground"
          >
            Email
          </a>
        </nav>
      </div>
    </header>
  );
}
