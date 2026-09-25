import { AssetPlaceholder } from "@/components/portfolio/AssetPlaceholder";
import { useHeroScene } from "@/components/portfolio/useHeroScene";
import { journeyScenes, profile } from "@/data/profile";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { ArrowDown, Ticket } from "lucide-react";
import { useMemo, useRef } from "react";

/** Deterministic barcode widths so the ticket looks printed, not random. */
function barcode(seed: number, count: number) {
  const bars: number[] = [];
  let state = seed;
  for (let i = 0; i < count; i += 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    bars.push(1 + (state % 3));
  }
  return bars;
}

/**
 * Hero: a live 3D sunset vista behind one portrait frame, the heading beneath
 * it, and a journey pass at the very bottom that lifts and tilts away as you
 * start scrolling — the invitation into the trip that follows.
 */
export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const sceneHostRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    progressRef.current = value;
  });

  useHeroScene(sceneHostRef, progressRef);

  const contentY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const ticketY = useTransform(scrollYProgress, [0, 1], [0, 56]);
  const ticketRotate = useTransform(scrollYProgress, [0, 1], [0, -3]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  const bars = useMemo(() => barcode(4921, 20), []);

  return (
    <section id="top" ref={heroRef} className="relative min-h-[100svh] w-full overflow-hidden">
      {/* Live 3D sunset */}
      <div ref={sceneHostRef} className="pointer-events-none absolute inset-0" />
      {/* Soft warm light through the middle — no white wash, so the vista stays
          rich while text keeps contrast. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(58% 46% at 50% 40%, rgba(60,30,45,0.18), rgba(60,30,45,0) 68%)",
        }}
      />
      {/* Cinematic vignette anchors the frame and guides the eye inward. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: "inset 0 0 180px 60px rgba(43,26,42,0.28)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(255,248,239,0.85), transparent)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{
          backgroundImage: "linear-gradient(to top, rgba(255,248,239,0.94), transparent)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-between gap-8 px-5 pt-24 pb-8 sm:px-8 sm:pt-28 sm:pb-12">
        {/* Status line — the only top-row content, and readable. */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2.5 text-[13px] font-medium text-[#7d3b26]">
            <span aria-hidden="true" className="relative flex size-2">
              <span className="absolute inline-flex size-2 animate-ping rounded-full bg-[#e8564a]/60" />
              <span className="relative inline-flex size-2 rounded-full bg-[#e8564a]" />
            </span>
            Available for work
          </span>
          <motion.span
            style={{ opacity: cueOpacity }}
            className="text-[13px] tracking-[0.02em] text-[#8d4a33]"
          >
            Scroll
          </motion.span>
        </div>

        {/* Portrait + heading */}
        <motion.div
          style={{ y: contentY, opacity: contentOpacity }}
          className="relative flex flex-1 flex-col items-center justify-center py-6 sm:py-8"
        >
          {/* A soft pool of light just behind the content — keeps the text
              readable without washing out the whole vista. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 h-[130%] -translate-y-1/2"
            style={{
              backgroundImage:
                "radial-gradient(52% 46% at 50% 50%, rgba(255,246,232,0.58), rgba(255,246,232,0.2) 56%, rgba(255,246,232,0) 80%)",
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full flex-col items-center gap-7 text-center sm:gap-10"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <AssetPlaceholder
                src={profile.portrait}
                label={profile.portraitCaption}
                ratio="4 / 5"
                tone={2}
                frameClassName="w-[164px] border-[#b5714a]/40 shadow-[0_30px_60px_-40px_rgba(43,26,42,0.8)] sm:w-[216px]"
                className="rounded-[3px]"
              />
            </motion.div>

            <div className="flex flex-col items-center gap-4">
              <h1 className="font-display text-[2.15rem] leading-[1.05] tracking-[-0.03em] text-balance text-[#3a2130] sm:text-6xl md:text-7xl">
                {profile.headline}
              </h1>
              <p className="max-w-xl text-pretty text-[15px] leading-7 text-[#6b4a52] sm:text-lg sm:leading-8">
                {profile.tagline}
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Journey pass */}
        <motion.div
          style={{ y: ticketY, rotate: ticketRotate }}
          className="mx-auto w-full max-w-2xl"
        >
          <div className="relative overflow-hidden rounded-[5px] border border-[#c9863f]/40 bg-card shadow-[0_34px_80px_-54px_rgba(43,26,42,0.95)]">
            {/* Sunset wash + fine grid, so the paper reads as printed stock. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(118deg, rgba(255,196,107,0.22), rgba(240,112,58,0.12) 52%, rgba(171,63,124,0.2))",
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.5]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 7px)",
              }}
            />

            <div className="relative flex items-stretch">
              {/* Main body */}
              <div className="flex-1 px-5 py-5 text-left sm:px-7 sm:py-6">
                <div className="flex items-center gap-2 text-[13px] font-medium text-[#b5561f]">
                  <Ticket className="size-4" strokeWidth={1.7} aria-hidden="true" />
                  Journey pass
                </div>

                <p className="mt-3 font-display text-[26px] leading-8 tracking-[-0.02em] text-[#33202c] sm:text-[32px] sm:leading-10">
                  {profile.name}
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <span className="text-[13px] font-medium text-[#6b4a52]">Rudrapur</span>
                  <span
                    aria-hidden="true"
                    className="h-px flex-1"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(90deg, #c9863f 0 5px, transparent 5px 11px)",
                    }}
                  />
                  <span className="text-[13px] font-medium text-[#6b4a52]">
                    {journeyScenes.length} stops
                  </span>
                </div>

                <p className="mt-4 text-[14px] leading-6 text-[#7a5a56]">
                  Scroll to come along — the whole trip is told from the window seat.
                </p>
              </div>

              {/* Stub */}
              <div className="relative flex w-[96px] shrink-0 flex-col items-center justify-between gap-3 overflow-hidden border-l border-dashed border-[#c9863f]/60 px-3 py-5 text-center sm:w-[128px] sm:px-4">
                <p className="text-[12px] font-medium tracking-[0.04em] text-[#b5561f]">ADMIT ONE</p>
                <div aria-hidden="true" className="flex h-9 w-full items-end gap-[1.5px] sm:h-11">
                  {bars.map((width, index) => (
                    <span
                      key={index}
                      className="h-full min-w-0 bg-[#5c3b3f]"
                      style={{ flexGrow: width, flexBasis: 0, opacity: 0.55 + (index % 3) * 0.15 }}
                    />
                  ))}
                </div>
                <p className="font-mono text-[12px] tabular-nums text-[#7a5a56]">No. 001</p>
              </div>
            </div>

            {/* Perforation with the ticket notches punched through it. */}
            <div className="relative h-px w-full bg-[#e2c19a]">
              <span className="absolute -top-1.5 -left-1.5 size-3 rounded-full border border-[#c9863f]/40 bg-background" />
              <span className="absolute -top-1.5 -right-1.5 size-3 rounded-full border border-[#c9863f]/40 bg-background" />
            </div>

            <div className="relative flex items-center justify-between gap-4 px-5 py-4 sm:px-7">
              <p className="text-left text-[14px] leading-6 text-[#7a5a56]">
                Non-transferable · valid for one scroll
              </p>
              <motion.span
                style={{ opacity: cueOpacity }}
                className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-[#b5561f]"
              >
                <ArrowDown className="size-4" strokeWidth={1.8} aria-hidden="true" />
                Begin
              </motion.span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
