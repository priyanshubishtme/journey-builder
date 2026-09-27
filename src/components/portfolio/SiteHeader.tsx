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
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <a
          href="#top"
          className="flex items-center gap-2.5 text-[14px] font-medium tracking-[0.06em] uppercase text-foreground"
        >
          <span
            aria-hidden="true"
            className="relative flex size-2.5 overflow-hidden rounded-full border border-[#b5714a]/40"
            style={{ backgroundImage: "linear-gradient(126deg, #ffd07a, #f0703a 52%, #d4466e)" }}
          />
          <span className="font-display tracking-[0.14em]">{profile.brand}</span>
        </a>
        <nav className="flex items-center gap-6 sm:gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hidden text-[13px] font-medium tracking-[0.06em] uppercase text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              {link.label}
            </a>
          ))}
          <a
            href={`mailto:${profile.email}`}
            className="text-[13px] font-medium tracking-[0.06em] uppercase text-primary border-b border-[#e8a06a]/50 border-transparent hover:border-primary/50 underline-offset-4 transition-all hover:no-underline"
          >
            Email
          </a>
        </nav>
      </div>
    </header>
  );
}
