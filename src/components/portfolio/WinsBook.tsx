import { AssetPlaceholder } from "@/components/portfolio/AssetPlaceholder";
import { profile, wins, type Win } from "@/data/profile";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

const TIERS = ["Gold", "Silver", "Bronze"] as const;
const TIER_COLORS: Record<Win["tier"], string> = {
  Gold: "#f0a53a",
  Silver: "#b9ae9f",
  Bronze: "#b5714a",
};

type Page = { type: "cover" } | { type: "win"; win: Win };

/** A small number ladder showing where a win sits. */
function TierMark({ tier, className }: { tier: Win["tier"]; className?: string }) {
  const rank = TIERS.indexOf(tier);
  const tint = TIER_COLORS[tier];
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex gap-1">
        {TIERS.map((item, index) => (
          <span
            key={item}
            className="size-2"
            style={{
              backgroundColor: index <= rank ? tint : "transparent",
              border: `1px solid ${index <= rank ? tint : "rgba(181,113,74,0.5)"}`,
            }}
          />
        ))}
      </span>
      <span className="label-mono" style={{ color: tint }}>
        {tier}
      </span>
    </span>
  );
}

/**
 * Section 03 — Wins.
 *
 * A single book you turn through: cover first, then one spread per event with
 * the photo on the left page and the story on the right.
 */
export function WinsBook() {
  const pages = useMemo<Page[]>(
    () => [{ type: "cover" }, ...wins.map((win) => ({ type: "win" as const, win }))],
    [],
  );
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const go = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), pages.length - 1);
    if (clamped === index) return;
    setDirection(clamped > index ? 1 : -1);
    setIndex(clamped);
  };

  const page = pages[index];

  return (
    <section id="wins" className="relative scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-5 pt-24 pb-10 sm:px-8">
        <div className="flex items-end justify-between gap-6 border-b border-border pb-4">
          <div>
            <p className="label-mono">Section 03</p>
            <h2 className="mt-3 font-display text-3xl tracking-[-0.02em] sm:text-4xl">
              The wins book
            </h2>
          </div>
          <p className="label-mono hidden max-w-xs text-right sm:block">
            {wins.length} events · one page each
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        {/* Book */}
        <div className="relative" style={{ perspective: "2200px" }}>
          {/* Stacked page edges, so it reads as a bound book */}
          <div
            aria-hidden="true"
            className="absolute inset-x-3 -bottom-1.5 h-3 rounded-b-sm border-x border-b border-border bg-secondary"
          />
          <div className="relative border border-border bg-card shadow-[0_50px_90px_-70px_rgba(43,26,42,0.9)]">
            {/* Book spine */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-10 -translate-x-1/2 md:block"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(181,113,74,0) 0%, rgba(181,113,74,0.16) 42%, rgba(43,26,42,0.22) 50%, rgba(181,113,74,0.16) 58%, rgba(181,113,74,0) 100%)",
              }}
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                initial={{
                  rotateY: direction > 0 ? 26 : -26,
                  opacity: 0,
                  x: direction > 0 ? 34 : -34,
                }}
                animate={{ rotateY: 0, opacity: 1, x: 0 }}
                exit={{
                  rotateY: direction > 0 ? -20 : 20,
                  opacity: 0,
                  x: direction > 0 ? -34 : 34,
                  transition: { duration: 0.26, ease: [0.4, 0, 1, 1] },
                }}
                transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  transformOrigin: direction > 0 ? "left center" : "right center",
                  transformStyle: "preserve-3d",
                }}
                className="grid md:grid-cols-2 md:min-h-[27rem]"
              >
                {page.type === "cover" ? (
                  <>
                    <div className="flex flex-col justify-between gap-8 p-6 sm:p-10">
                      <AssetPlaceholder
                        label="Book cover photo"
                        ratio="3 / 4"
                        frameClassName="w-full max-w-[15rem]"
                      />
                      <div>
                        <p className="label-mono">Priyanshu Bisht</p>
                        <p className="mt-3 font-display text-2xl leading-7 tracking-[-0.02em] sm:text-3xl sm:leading-9">
                          Every event, photo and story — kept in one place.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between gap-8 border-t border-border p-6 sm:p-10 md:border-t-0 md:border-l">
                      <div>
                        <p className="label-mono">Contents</p>
                        <h3 className="mt-4 font-display text-4xl tracking-[-0.03em] sm:text-5xl">
                          The wins
                        </h3>
                        <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
                          Hackathons, contests and stages from 2025 onward. Turn
                          the pages — one event per spread.
                        </p>
                      </div>
                      <div className="flex items-end justify-between gap-6 border-t border-border pt-5">
                        <div>
                          <p className="font-display text-3xl tracking-[-0.02em]">
                            {String(wins.length).padStart(2, "0")}
                          </p>
                          <p className="label-mono mt-1">Events recorded</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-3xl tracking-[-0.02em]">
                            05
                          </p>
                          <p className="label-mono mt-1">Gold &amp; silver</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-6 p-6 sm:p-10">
                      <AssetPlaceholder
                        src={page.win.image}
                        label={`${page.win.title} photo`}
                        ratio="4 / 3"
                        frameClassName="w-full"
                      />
                      <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                        <TierMark tier={page.win.tier} />
                        <p className="label-mono">{page.win.year}</p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between gap-8 border-t border-border p-6 sm:p-10 md:border-t-0 md:border-l">
                      <div>
                        <p className="label-mono">
                          Page {String(index + 1).padStart(2, "0")} ·{" "}
                          {page.win.event}
                        </p>
                        <h3 className="mt-4 font-display text-3xl leading-9 tracking-[-0.02em] sm:text-4xl sm:leading-11">
                          {page.win.title}
                        </h3>
                        <p className="mt-5 text-sm leading-7 text-muted-foreground sm:text-[15px]">
                          {page.win.story}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
                        <p className="label-mono">{page.win.placing}</p>
                        <p className="label-mono">
                          {profile.brand} · {page.win.year}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors hover:border-foreground/40 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowLeft className="size-3.5" strokeWidth={1.6} />
              Prev
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={index === pages.length - 1}
              className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors hover:border-foreground/40 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Next
              <ArrowRight className="size-3.5" strokeWidth={1.6} />
            </button>
          </div>

          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(pages.length).padStart(2, "0")}
          </p>

          <div className="flex items-center gap-2">
            {pages.map((item, itemIndex) => (
              <button
                key={item.type === "cover" ? "cover" : item.win.id}
                type="button"
                onClick={() => go(itemIndex)}
                aria-label={
                  item.type === "cover" ? "Cover" : item.win.title
                }
                className={cn(
                  "h-px w-5 transition-colors",
                  itemIndex === index ? "bg-primary" : "bg-border hover:bg-primary/40",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
