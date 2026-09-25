import { AssetPlaceholder } from "@/components/portfolio/AssetPlaceholder";
import { Reveal } from "@/components/portfolio/Reveal";
import { profile, wins, type Win } from "@/data/profile";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const TIERS = ["Gold", "Silver", "Bronze"] as const;
const TIER_COLORS: Record<Win["tier"], string> = {
  Gold: "#e79a2c",
  Silver: "#a4958a",
  Bronze: "#b5714a",
};

type Page = { type: "cover" } | { type: "win"; win: Win };
type Turn = { from: number; to: number; dir: "next" | "prev" };

/** Shared page shell so both stacked pages and flipping faces look identical. */
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
          Hackathons, contests and stages from 2025 onward. Turn the pages —
          one event per spread.
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
          <p className="font-display text-3xl tracking-[-0.02em] text-[#33202c]">
            05
          </p>
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
 * A real page turn: a sheet sits on one half of the spread and rotates about
 * the spine, carrying the page being turned on its front and the page being
 * revealed on its back, exactly like paper. On phones the same spread
 * cross-fades instead, since a 3D flip under a thumb reads as a glitch.
 */
export function WinsBook() {
  const pages = useMemo<Page[]>(
    () => [{ type: "cover" }, ...wins.map((win) => ({ type: "win" as const, win }))],
    [],
  );
  const isMobile = useIsMobile();
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState<Turn | null>(null);
  const locked = useRef(false);

  const pageCount = pages.length;

  const go = useCallback(
    (target: number) => {
      const clamped = Math.min(Math.max(target, 0), pageCount - 1);
      if (locked.current || clamped === index) return;
      if (isMobile || Math.abs(clamped - index) > 1) {
        setIndex(clamped);
        return;
      }
      locked.current = true;
      setTurn({ from: index, to: clamped, dir: clamped > index ? "next" : "prev" });
    },
    [index, isMobile, pageCount],
  );

  const finishTurn = () => {
    setTurn((current) => {
      if (current) setIndex(current.to);
      return null;
    });
    locked.current = false;
  };

  // Arrow keys turn the book, the way you would with a real one on your lap.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(index + 1);
      else if (event.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  // While a sheet is in flight, the two stacked pages show what is left
  // visible underneath it.
  const leftIndex = turn ? (turn.dir === "next" ? turn.from : turn.to) : index;
  const rightIndex = turn ? (turn.dir === "next" ? turn.to : turn.from) : index;

  const leftFace = (i: number) =>
    pages[i].type === "cover" ? <CoverLeft /> : <WinLeft win={pages[i].win} index={i} />;
  const rightFace = (i: number) =>
    pages[i].type === "cover" ? <CoverRight /> : <WinRight win={pages[i].win} pageNumber={i + 1} />;

  const sheetFront = turn
    ? turn.dir === "next"
      ? rightFace(turn.from)
      : leftFace(turn.from)
    : null;
  const sheetBack = turn
    ? turn.dir === "next"
      ? leftFace(turn.to)
      : rightFace(turn.to)
    : null;

  return (
    <section id="wins" className="relative scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-5 pt-24 pb-12 sm:px-8">
        <Reveal>
          <h2 className="font-display text-4xl tracking-[-0.02em] sm:text-5xl">
            The wins book
          </h2>
          <p className="mt-4 max-w-2xl lead">
            Every hackathon, contest and stage I have been part of — one page
            each, photo and story together. Turn them.
          </p>
        </Reveal>
      </div>

      <div className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        <div className="relative">
          <div
            className="relative rounded-[4px] border border-[#d9c3ae] bg-[#fffaf3] shadow-[0_60px_110px_-70px_rgba(60,32,44,0.9)]"
            style={{ perspective: 2600 }}
          >
            {/* Shadow the turning sheet casts onto the spread underneath. */}
            <motion.div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 z-10 w-1/3",
                turn?.dir === "prev" ? "left-0" : "right-0",
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: turn ? 0.55 : 0 }}
              transition={{ duration: turn ? 0.5 : 0.25 }}
              style={{
                // Darkest at the spine, fading outwards across the page below.
                backgroundImage:
                  turn?.dir === "prev"
                    ? "linear-gradient(to left, rgba(60,32,44,0.4), rgba(60,32,44,0))"
                    : "linear-gradient(to right, rgba(60,32,44,0.4), rgba(60,32,44,0))",
              }}
            />
            {/* Static halves; clipped, while the turning sheet is not. */}
            <div className="overflow-hidden rounded-[4px]">
              {isMobile ? (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  {leftFace(index)}
                  <div className="border-t border-[#e6c9ae]">{rightFace(index)}</div>
                </motion.div>
              ) : (
                <div className="grid min-h-[29rem] grid-cols-2">
                  <div className="border-r border-[#e6c9ae]">{leftFace(leftIndex)}</div>
                  <div>{rightFace(rightIndex)}</div>
                </div>
              )}
            </div>

            {/* The turning sheet */}
            {turn && !isMobile ? (
              <motion.div
                key={`${turn.from}-${turn.to}`}
                initial={{ rotateY: 0 }}
                animate={{ rotateY: turn.dir === "next" ? -180 : 180 }}
                transition={{ duration: 1.05, ease: [0.4, 0.22, 0.2, 1] }}
                onAnimationComplete={finishTurn}
                className={cn(
                  "absolute top-0 z-20 h-full w-1/2",
                  turn.dir === "next" ? "right-0" : "left-0",
                )}
                style={{
                  transformStyle: "preserve-3d",
                  transformOrigin: turn.dir === "next" ? "left center" : "right center",
                }}
              >
                <div
                  className="absolute inset-0 h-full w-full shadow-[0_0_50px_-10px_rgba(60,32,44,0.5)]"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  {sheetFront}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, rgba(60,32,44,0.22), rgba(60,32,44,0) 40%)",
                    }}
                  />
                </div>
                <div
                  className="absolute inset-0 h-full w-full"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  {sheetBack}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage:
                        "linear-gradient(to left, rgba(60,32,44,0.22), rgba(60,32,44,0) 40%)",
                    }}
                  />
                </div>
              </motion.div>
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
              disabled={index === pages.length - 1}
              className="flex items-center gap-2 rounded-[3px] border border-border bg-card px-4 py-2.5 text-[14px] transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
            >
              Next page
              <ArrowRight className="size-4" strokeWidth={1.7} />
            </button>
          </div>

          <p className="counter text-[14px]">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(pages.length).padStart(2, "0")}
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
