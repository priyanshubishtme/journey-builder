import { AssetPlaceholder } from "@/components/portfolio/AssetPlaceholder";
import { journeyScenes, profile } from "@/data/profile";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * Hero: one portrait frame, the heading beneath it, and a ticket at the very
 * bottom that "tears off" as you start scrolling — the invitation into the
 * journey that follows.
 */
export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const contentY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const ticketY = useTransform(scrollYProgress, [0, 1], [0, 46]);
  const ticketRotate = useTransform(scrollYProgress, [0, 1], [0, -2.5]);
  const stubGap = useTransform(scrollYProgress, [0, 1], [0, 10]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);

  return (
    <section
      id="top"
      ref={heroRef}
      className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-between px-5 pt-20 pb-8 sm:px-8 sm:pt-24 sm:pb-14"
    >
      {/* Meta row */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <span className="label-mono">Portfolio · 2026</span>
        <span className="label-mono hidden sm:block">{profile.location}</span>
        <span className="label-mono">Available for work</span>
      </div>

      {/* Portrait + heading */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="flex flex-1 flex-col items-center justify-center py-8 sm:py-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full flex-col items-center gap-6 text-center sm:gap-10"
        >
          <AssetPlaceholder
            src={profile.portrait}
            label={profile.portraitCaption}
            ratio="4 / 5"
            frameClassName="w-[168px] sm:w-[228px]"
            className="shadow-[0_1px_0_oklch(0.9_0.004_92)]"
          />

          <div className="flex flex-col items-center gap-4">
            <h1 className="font-display text-[2.15rem] leading-[1.04] tracking-[-0.03em] text-balance sm:text-6xl md:text-7xl">
              {profile.headline}
            </h1>
            <p className="max-w-xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              {profile.tagline}
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Ticket */}
      <div className="flex flex-col items-center gap-5">
        <motion.div style={{ opacity: cueOpacity }} className="label-mono">
          Scroll
        </motion.div>

        <motion.div
          style={{ y: ticketY, rotate: ticketRotate }}
          className="w-full max-w-2xl"
        >
          <div className="relative overflow-hidden rounded-[3px] border border-border bg-card">
            <div className="flex items-stretch">
              <div className="flex-1 px-4 py-4 text-left sm:px-6 sm:py-5">
                <p className="label-mono">Journey pass</p>
                <p className="mt-2 font-display text-xl leading-6 sm:text-2xl">
                  {profile.name}
                </p>
                <p className="label-mono mt-2">
                  Rudrapur → everywhere · {journeyScenes.length} stops
                </p>
              </div>
              <div className="flex w-24 flex-col justify-center gap-1 border-l border-dashed border-border px-3 py-4 text-left sm:w-32 sm:px-4">
                <p className="label-mono">Admit</p>
                <p className="font-display text-lg leading-5">One</p>
                <p className="label-mono">No. 001</p>
              </div>
            </div>

            {/* Perforation + ticket notches */}
            <div className="relative h-px w-full bg-border">
              <span className="absolute -top-1.5 -left-1.5 size-3 rounded-full border border-border bg-background" />
              <span className="absolute -top-1.5 -right-1.5 size-3 rounded-full border border-border bg-background" />
            </div>

            <motion.div
              style={{ paddingTop: stubGap }}
              className="flex items-center justify-between gap-4 px-4 pb-4 sm:px-6"
            >
              <p className="text-left text-xs leading-5 text-muted-foreground sm:text-sm">
                Scroll to get your ticket to view my journey.
              </p>
              <span aria-hidden="true" className="label-mono shrink-0">
                ↓
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
