import { AssetPlaceholder } from "@/components/portfolio/AssetPlaceholder";
import { Reveal } from "@/components/portfolio/Reveal";
import { profile, wins, type Win } from "@/data/profile";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

const TIERS = ["Gold", "Silver", "Bronze"] as const;
const TIER_COLORS: Record<Win["tier"], string> = {
  Gold: "#e79a2c",
  Silver: "#a4958a",
  Bronze: "#b5714a",
};

type BookPage = { type: "cover" } | { type: "win"; win: Win };

/** Shared page shell so the two halves of the spread look identical. */
function Page({
  children,
  side,
  className,
}: {
  children: ReactNode;
  side: "left" | "right";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col gap-6 bg-[#fffaf3] p-6 sm:p-8",
        className,
      )}
    >
      {/* Spine shading, mirrored on whichever side of the book this page is. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 w-14",
          side === "left" ? "right-0" : "left-0",
        )}
        style={{
          backgroundImage:
            side === "left"
              ? "linear-gradient(to right, rgba(91,48,40,0), rgba(91,48,40,0.14))"
              : "linear-gradient(to left, rgba(91,48,40,0), rgba(91,48,40,0.14))",
        }}
      />
      {children}
    </div>
  );
}

function TierMark({ tier }: { tier: Win["tier"] }) {
  const rank = TIERS.indexOf(tier);
  const tint = TIER_COLORS[tier];
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-1">
        {TIERS.map((item, index) => (
          <span
            key={item}
            className="size-2.5"
            style={{
              backgroundColor: index <= rank ? tint : "transparent",
              border: `1px solid ${index <= rank ? tint : "#d9c3ae"}`,
            }}
          />
        ))}
      </span>
      <span className="text-[14px] font-medium" style={{ color: tint }}>
        {tier}
      </span>
    </span>
  );
}

function CoverLeft() {
  return (
    <Page side="left" className="justify-between">
      <AssetPlaceholder
        label="Book cover photo"
        ratio="3 / 4"
        frameClassName="w-full max-w-[13rem]"
        tone={1}
      />
      <div>
        <p className="meta">{profile.name}</p>
        <p className="mt-3 font-display text-2xl leading-8 tracking-[-0.02em] text-[#33202c]">
          The competitions that stuck — and what each one taught me.
        </p>
      </div>
    </Page>
  );
}

function CoverRight() {
  return (
    <Page side="right" className="justify-between">
      <div>
        <h3 className="font-display text-4xl tracking-[-0.03em] text-[#33202c] sm:text-5xl">
          The wins
        </h3>
        <p className="mt-4 max-w-sm body-copy">
          Hackathons, contests and stages from 2025 onward. One event per spread.
        </p>
      </div>
      <div className="flex items-end justify-between gap-6 border-t border-[#e6c9ae] pt-5">
        <div>
          <p className="font-display text-3xl tracking-[-0.02em] text-[#33202c]">
            {String(wins.length).padStart(2, "0")}
          </p>
          <p className="mt-1 meta">Events recorded</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl tracking-[-0.02em] text-[#33202c]">05</p>
          <p className="mt-1 meta">Gold &amp; silver</p>
        </div>
      </div>
    </Page>
  );
}

function WinLeft({ win, index }: { win: Win; index: number }) {
  return (
    <Page side="left">
      <AssetPlaceholder
        src={win.image}
        label={`${win.title} photo`}
        ratio="4 / 3"
        frameClassName="w-full"
        tone={index}
      />
      <div className="flex items-center justify-between gap-4 border-t border-[#e6c9ae] pt-4">
        <TierMark tier={win.tier} />
        <p className="meta">{win.year}</p>
      </div>
    </Page>
  );
}

function WinRight({ win, pageNumber }: { win: Win; pageNumber: number }) {
  return (
    <Page side="right" className="justify-between">
      <div>
        <p className="meta">
          Page {String(pageNumber).padStart(2, "0")} · {win.event}
        </p>
        <h3 className="mt-4 font-display text-3xl leading-10 tracking-[-0.02em] text-[#33202c] sm:text-4xl sm:leading-11">
          {win.title}
        </h3>
        <p className="mt-5 body-copy sm:text-[16px]">{win.story}</p>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-[#e6c9ae] pt-5">
        <p className="meta">{win.placing}</p>
        <p className="meta">
          {profile.brand} · {win.year}
        </p>
      </div>
    </Page>
  );
}

/**
 * Section 04 — The wins book.
 *
 * Click the page to move through the book: the left half goes back, the right
 * half goes forward, and the spread slides across quickly as it swaps. The
 * arrows, the dot rail and the left/right keys all do the same thing.
 */
export function WinsBook() {
  const pages = useMemo<BookPage[]>(
    () => [{ type: "cover" }, ...wins.map((win) => ({ type: "win" as const, win }))],
    [],
  );
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const pageCount = pages.length;

  const go = useCallback(
    (target: number) => {
      const clamped = Math.min(Math.max(target, 0), pageCount - 1);
      if (clamped === index) return;
      setDirection(clamped > index ? 1 : -1);
      setIndex(clamped);
    },
    [index, pageCount],
  );

  // Arrow keys turn the book.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(index + 1);
      else if (event.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  const leftFace = (i: number) =>
    pages[i].type === "cover" ? <CoverLeft /> : <WinLeft win={pages[i].win} index={i} />;
  const rightFace = (i: number) =>
    pages[i].type === "cover" ? (
      <CoverRight />
    ) : (
      <WinRight win={pages[i].win} pageNumber={i + 1} />
    );

  const shift = reducedMotion ? 0 : direction * 22;

  return (
    <section id="wins" className="relative scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-5 pt-24 pb-12 sm:px-8">
        <Reveal>
          <h2 className="font-display text-4xl tracking-[-0.02em] sm:text-5xl">
            The wins book
          </h2>
          <p className="mt-4 max-w-2xl lead">
            Every hackathon, contest and stage I have been part of — one page
            each, photo and story together. Click the page to move through it.
          </p>
        </Reveal>
      </div>

      <div className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        <div className="relative">
          <div className="relative rounded-[4px] border border-[#d9c3ae] bg-[#fffaf3] shadow-[0_60px_110px_-70px_rgba(60,32,44,0.9)]">
            <div className="overflow-hidden rounded-[4px]">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: shift }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: reducedMotion ? 0.01 : 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {isMobile ? (
                  <>
                    {leftFace(index)}
                    <div className="border-t border-[#e6c9ae]">{rightFace(index)}</div>
                  </>
                ) : (
                  <div className="grid min-h-[29rem] grid-cols-2">
                    <div className="border-r border-[#e6c9ae]">{leftFace(index)}</div>
                    <div>{rightFace(index)}</div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Click zones: left half back, right half forward. */}
            {!isMobile ? (
              <>
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  disabled={index === 0}
                  aria-label="Previous page"
                  className="group absolute inset-y-0 left-0 z-30 w-1/2 cursor-w-resize rounded-l-[4px] disabled:cursor-default"
                >
                  <span className="pointer-events-none absolute inset-0 rounded-l-[4px] bg-[#6d3a55]/0 transition-colors duration-200 group-hover:bg-[#6d3a55]/[0.05] group-focus-visible:bg-[#6d3a55]/[0.05]" />
                </button>
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  disabled={index === pageCount - 1}
                  aria-label="Next page"
                  className="group absolute inset-y-0 right-0 z-30 w-1/2 cursor-e-resize rounded-r-[4px] disabled:cursor-default"
                >
                  <span className="pointer-events-none absolute inset-0 rounded-r-[4px] bg-[#6d3a55]/0 transition-colors duration-200 group-hover:bg-[#6d3a55]/[0.05] group-focus-visible:bg-[#6d3a55]/[0.05]" />
                </button>
              </>
            ) : null}
          </div>

          {/* Book edges */}
          <div
            aria-hidden="true"
            className="absolute inset-x-4 -bottom-2 h-4 rounded-b-[4px] border-x border-b border-[#d9c3ae] bg-[#f3e4d3]"
          />
        </div>

        {/* Controls */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="flex items-center gap-2 rounded-[3px] border border-border bg-card px-4 py-2.5 text-[14px] transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowLeft className="size-4" strokeWidth={1.7} />
              Previous
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={index === pageCount - 1}
              className="flex items-center gap-2 rounded-[3px] border border-border bg-card px-4 py-2.5 text-[14px] transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
            >
              Next page
              <ArrowRight className="size-4" strokeWidth={1.7} />
            </button>
          </div>

          <p className="counter text-[14px]">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(pageCount).padStart(2, "0")}
          </p>

          <div className="flex items-center gap-2">
            {pages.map((item, itemIndex) => (
              <button
                key={item.type === "cover" ? "cover" : item.win.id}
                type="button"
                onClick={() => go(itemIndex)}
                aria-label={item.type === "cover" ? "Cover" : item.win.title}
                className={cn(
                  "h-[3px] w-6 rounded-full transition-colors",
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
