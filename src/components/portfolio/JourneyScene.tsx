import { AssetPlaceholder } from "@/components/portfolio/AssetPlaceholder";
import { journeyScenes } from "@/data/profile";
import { useBusScene } from "@/components/portfolio/useBusScene";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Section 01 — The journey.
 *
 * A tall scroll track with a sticky viewport: the three.js bus drives forward
 * while caption cards for each stop cross-fade on the top-left.
 */
export function JourneyScene() {
  const trackRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [active, setActive] = useState(0);
  const [progressLabel, setProgressLabel] = useState(0);

  useBusScene(hostRef, progressRef, journeyScenes.length);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    progressRef.current = value;
    const next = Math.min(
      Math.floor(value * journeyScenes.length),
      journeyScenes.length - 1,
    );
    setActive((current) => (current === next ? current : next));
    const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);
    setProgressLabel((current) => (current === percent ? current : percent));
  });

  const jumpTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const top = window.scrollY + track.getBoundingClientRect().top;
    const range = track.offsetHeight - window.innerHeight;
    const target = top + range * ((index + 0.15) / journeyScenes.length);
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  const scene = journeyScenes[active];

  return (
    <section id="journey" className="relative scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-5 pt-20 pb-10 sm:px-8">
        <div className="flex items-end justify-between gap-6 border-b border-border pb-4">
          <div>
            <p className="label-mono">Section 01</p>
            <h2 className="mt-3 font-display text-3xl tracking-[-0.02em] sm:text-4xl">
              The journey
            </h2>
          </div>
          <p className="label-mono hidden max-w-xs text-right sm:block">
            Ride along — one stop at a time
          </p>
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative"
        style={{ height: `${journeyScenes.length * 110}vh` }}
      >
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <div ref={hostRef} className="absolute inset-0 bg-secondary" />

          {/* Caption card, top-left */}
          <div className="pointer-events-none absolute inset-x-0 top-0 px-5 pt-20 sm:px-8 sm:pt-24">
            <AnimatePresence mode="wait" initial={false}>
              <motion.article
                key={scene.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto w-full max-w-[22rem] border border-border bg-card/92 p-4 backdrop-blur-sm sm:p-5"
              >
                <AssetPlaceholder
                  src={scene.image}
                  label={`Scene image · ${scene.title}`}
                  ratio="16 / 9"
                  frameClassName="w-full"
                />
                <p className="label-mono mt-4">
                  Stop {scene.stop} · {scene.period}
                </p>
                <h3 className="mt-2 font-display text-xl leading-6 tracking-[-0.01em] sm:text-2xl sm:leading-7">
                  {scene.title}
                </h3>
                <p className="mt-3 text-xs leading-5 text-muted-foreground sm:text-[13px] sm:leading-6">
                  {scene.body}
                </p>
                {scene.note ? (
                  <p className="label-mono mt-3 border-t border-border pt-3">
                    {scene.note}
                  </p>
                ) : null}
              </motion.article>
            </AnimatePresence>
          </div>

          {/* Live status + stop picker */}
          <div className="absolute inset-x-0 bottom-0 px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 border border-border bg-card/92 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="label-mono w-[7.25rem] shrink-0 tabular-nums">
                  Journey {String(progressLabel).padStart(3, "0")}%
                </span>
                <span className="relative h-px flex-1 bg-border">
                  <span
                    className="absolute inset-y-0 left-0 bg-foreground transition-[width] duration-200 ease-out"
                    style={{ width: `${progressLabel}%` }}
                  />
                </span>
                <span className="label-mono hidden whitespace-nowrap sm:block">
                  Scroll to move the bus
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {journeyScenes.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => jumpTo(index)}
                    className={cn(
                      "font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
                      index === active
                        ? "text-foreground underline decoration-1 underline-offset-[6px]"
                        : "text-muted-foreground/70 hover:text-foreground",
                    )}
                    aria-current={index === active ? "true" : undefined}
                  >
                    {item.stop} {item.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
