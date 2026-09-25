import { AssetPlaceholder } from "@/components/portfolio/AssetPlaceholder";
import { Reveal } from "@/components/portfolio/Reveal";
import { useJourneyScene } from "@/components/portfolio/useJourneyScene";
import { journeyScenes, type Scene } from "@/data/profile";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef, useState } from "react";

const COUNT = journeyScenes.length;

/**
 * One scene card. Its horizontal position is a pure function of the scroll:
 * `p` is how far this card is from the middle of its own stretch of the
 * journey, so cards slide in from ahead of the bus and drift away behind it.
 */
function ScenePanel({
  scene,
  index,
  progress,
}: {
  scene: Scene;
  index: number;
  progress: MotionValue<number>;
}) {
  const p = useTransform(progress, (value) => value * COUNT - index);
  const x = useTransform(p, [-1, 0, 1], ["42%", "0%", "-42%"]);
  const opacity = useTransform(p, [-0.72, -0.28, 0.28, 0.72], [0, 1, 1, 0]);
  const scale = useTransform(p, [-1, 0, 1], [0.94, 1, 0.94]);

  return (
    <motion.div
      style={{ x, opacity, scale, willChange: "transform, opacity" }}
      className="absolute inset-x-0 bottom-0"
    >
      <article className="border border-[#e6c9ae] bg-[#fff8ef]/96 p-4 shadow-[0_30px_70px_-40px_rgba(43,26,42,0.85)] backdrop-blur-sm sm:p-5">
        <AssetPlaceholder
          src={scene.image}
          label={`Scene image · ${scene.title}`}
          ratio="16 / 9"
          frameClassName="w-full"
          tone={index}
        />
        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="counter text-[13px] text-primary">
            Stop {String(index + 1).padStart(2, "0")}
          </span>
          <span className="meta">{scene.period}</span>
        </div>
        <h3 className="mt-2 font-display text-2xl leading-8 tracking-[-0.01em] text-[#33202c] sm:text-[28px] sm:leading-9">
          {scene.title}
        </h3>
        <p className="mt-3 body-copy text-[#5c434e]">{scene.body}</p>
        {scene.note ? (
          <p className="mt-4 border-t border-[#e6c9ae] pt-3 meta">{scene.note}</p>
        ) : null}
      </article>
    </motion.div>
  );
}

/**
 * Section 02 — The journey.
 *
 * A sticky full-screen shot of the bus driving through an evening forest, seen
 * from the roadside with the passenger at the window. The story panels slide
 * past one by one as you scroll: scroll drives the bus, the light and the
 * panels together, so the trip plays out rather than jumps.
 */
export function JourneyScene() {
  const trackRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);

  useJourneyScene(hostRef, progressRef, COUNT);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    progressRef.current = value;
    const next = Math.max(Math.min(Math.floor(value * COUNT), COUNT - 1), 0);
    if (next !== activeRef.current) {
      activeRef.current = next;
      setActive(next);
    }
  });

  const barScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const nearby = [active - 1, active, active + 1].filter(
    (index) => index >= 0 && index < COUNT,
  );

  return (
    <section id="journey" className="relative scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-5 pt-24 pb-12 sm:px-8">
        <Reveal>
          <h2 className="font-display text-4xl tracking-[-0.02em] sm:text-5xl">
            The journey
          </h2>
          <p className="mt-4 max-w-2xl lead">
            Seven stops, told from the window seat of a bus climbing through the
            hills at dusk. Scroll, and each moment comes past.
          </p>
        </Reveal>
      </div>

      <div
        ref={trackRef}
        className="relative"
        style={{ height: `${COUNT * 100}vh` }}
      >
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <div ref={hostRef} className="absolute inset-0 bg-[#c98a6a]" />

          {/* Scrim so the panels stay readable over the forest. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(100deg, rgba(38,22,36,0.62) 0%, rgba(38,22,36,0.3) 38%, rgba(38,22,36,0) 62%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-40 sm:hidden"
            style={{
              backgroundImage: "linear-gradient(to top, rgba(38,22,36,0.65), transparent)",
            }}
          />

          {/* Panels */}
          <div className="pointer-events-none absolute inset-0">
            <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col justify-end px-5 pb-14 sm:justify-center sm:px-8 sm:pb-0">
              <div className="pointer-events-auto relative w-full max-w-[26rem] min-h-[18rem] sm:max-w-[28rem] sm:min-h-[24rem]">
                {nearby.map((index) => (
                  <ScenePanel
                    key={journeyScenes[index].id}
                    scene={journeyScenes[index]}
                    index={index}
                    progress={scrollYProgress}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Progress: readable counter, no micro-labels */}
          <div className="absolute top-[4.75rem] right-5 text-right sm:top-[5.5rem] sm:right-8">
            <p className="counter text-[14px] text-[#ffe9d2]">
              {String(active + 1).padStart(2, "0")} / {String(COUNT).padStart(2, "0")}
            </p>
            <div className="mt-2 h-[2px] w-24 bg-white/25">
              <motion.div
                className="h-full origin-left bg-[#ffc46b]"
                style={{ scaleX: barScale }}
              />
            </div>
            <p className="mt-2 text-[13px] text-[#f3cdb4]">Keep scrolling</p>
          </div>
        </div>
      </div>
    </section>
  );
}
