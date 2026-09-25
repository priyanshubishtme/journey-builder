import { routeStops } from "@/data/profile";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouteScene } from "@/components/portfolio/useRouteScene";
import { cn } from "@/lib/utils";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

const RAIL_X = 30;
const GUTTER_AMPLITUDE = 64;
const LEAD = 70;
const EDUCATION_TINT = "#ff9f45";
const EXPERIENCE_TINT = "#d4466e";

/** Smooth vertical route through the measured stop positions. */
function buildRoutePath(points: Point[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Section 02 — Route.
 *
 * Education and experience as stops on one dotted bus route, with a 3D bus
 * riding the line: the card positions are measured from the DOM, converted
 * into a 3D curve, and a tilted orthographic camera keeps everything aligned
 * to the pixel while giving the bus and pins real depth.
 */
export function BusPath() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const sceneHostRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const travelRef = useRef(0);
  const activeRef = useRef(0);
  const isMobile = useIsMobile();

  const [box, setBox] = useState({ width: 0, height: 0 });
  const [stops, setStops] = useState<Point[]>([]);
  const [activeStop, setActiveStop] = useState(0);

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start center", "end center"],
  });
  const travel = useTransform(scrollYProgress, [0.02, 0.98], [0, 1]);

  useMotionValueEvent(travel, "change", (value) => {
    travelRef.current = value;
    const next = Math.max(
      Math.min(Math.floor(value * routeStops.length + 0.15), routeStops.length - 1),
      0,
    );
    activeRef.current = next;
    setActiveStop((current) => (current === next ? current : next));
  });

  // Measure card centres and turn them into route coordinates.
  useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const width = wrap.clientWidth;
      const centered = width / 2;
      const measured: Point[] = [];

      cardRefs.current.forEach((node, index) => {
        if (!node) return;
        const y = node.offsetTop + node.offsetHeight / 2;
        const x =
          width < 768
            ? RAIL_X
            : index % 2 === 0
              ? centered + GUTTER_AMPLITUDE
              : centered - GUTTER_AMPLITUDE;
        measured.push({ x, y });
      });

      setBox({ width, height: wrap.scrollHeight });
      setStops(measured);
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (wrapRef.current) observer.observe(wrapRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [isMobile]);

  const pathPoints: Point[] = [
    ...(stops.length ? [{ x: stops[0].x, y: Math.max(stops[0].y - LEAD, 8) }] : []),
    ...stops,
    ...(stops.length ? [{ x: stops[stops.length - 1].x, y: stops[stops.length - 1].y + LEAD }] : []),
  ];
  const routePath = buildRoutePath(pathPoints);
  const stopPath = buildRoutePath(stops);

  useRouteScene(sceneHostRef, stops, pathPoints, box, travelRef, activeRef);

  return (
    <section id="route" className="relative scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-5 pt-24 pb-8 sm:px-8">
        <div className="flex items-end justify-between gap-6 border-b border-border pb-4">
          <div>
            <p className="label-mono text-clay">Section 02</p>
            <h2 className="mt-3 font-display text-3xl tracking-[-0.02em] sm:text-4xl">
              Education &amp; experience
            </h2>
          </div>
          <p className="label-mono hidden max-w-xs text-right sm:block">
            Every stop on one route
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-6">
          <span className="flex items-center gap-2">
            <span
              className="size-2.5 rotate-45"
              style={{ backgroundColor: EDUCATION_TINT }}
            />
            <span className="label-mono">Education</span>
          </span>
          <span className="flex items-center gap-2">
            <span
              className="size-2.5 rotate-45"
              style={{ backgroundColor: EXPERIENCE_TINT }}
            />
            <span className="label-mono">Experience</span>
          </span>
          <span className="label-mono ml-auto hidden sm:block">
            The bus follows your scroll
          </span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
        <div ref={wrapRef} className="relative">
          {/* 3D layer: tilted plane with the pins and the bus on the route */}
          <div
            ref={sceneHostRef}
            className="pointer-events-none absolute inset-0 z-[2]"
          />

          {/* Dotted route + travelled overlay */}
          {box.width > 0 && stops.length > 0 ? (
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
              viewBox={`0 0 ${box.width} ${box.height}`}
              preserveAspectRatio="none"
              fill="none"
            >
              <defs>
                <linearGradient id="route-travel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffc46b" />
                  <stop offset="55%" stopColor="#f0703a" />
                  <stop offset="100%" stopColor="#d4466e" />
                </linearGradient>
              </defs>
              <path
                d={stopPath}
                stroke="#c9863f"
                strokeOpacity="0.5"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="0 13"
              />
              <motion.path
                d={routePath}
                stroke="url(#route-travel)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeOpacity="0.85"
                style={{ pathLength: travel }}
              />
            </svg>
          ) : null}

          {/* Stops */}
          <div className="relative z-10 flex flex-col gap-10 md:grid md:grid-cols-2 md:gap-x-40 md:gap-y-6">
            {routeStops.map((stop, index) => {
              const tint = index === 0 || index === 1 ? EDUCATION_TINT : EXPERIENCE_TINT;
              return (
                <div
                  key={stop.id}
                  className={cn(
                    "flex items-center",
                    index % 2 === 0 ? "md:col-start-1 md:justify-end" : "md:col-start-2",
                  )}
                >
                  <div
                    ref={(node) => {
                      cardRefs.current[index] = node;
                    }}
                    className={cn(
                      "relative ml-16 w-full border border-border bg-card p-5 shadow-[0_20px_50px_-40px_rgba(43,26,42,0.8)] transition-colors duration-300 sm:p-6 md:ml-0 md:max-w-[26rem]",
                      index === activeStop ? "border-[#f0703a]/60" : "hover:border-[#c9863f]/45",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-0 h-full w-[3px]",
                        index % 2 === 0 ? "right-0" : "left-0",
                      )}
                      style={{ backgroundColor: tint }}
                    />
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="label-mono" style={{ color: tint }}>
                        {stop.kind} · Stop {String(index + 1).padStart(2, "0")}
                      </p>
                      <p className="label-mono whitespace-nowrap">{stop.period}</p>
                    </div>
                    <h3 className="mt-3 font-display text-xl leading-6 tracking-[-0.01em] sm:text-2xl sm:leading-7">
                      {stop.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{stop.place}</p>
                    {stop.grade ? (
                      <p
                        className="mt-4 bg-clip-text font-display text-3xl tracking-[-0.02em] text-transparent"
                        style={{ backgroundImage: "linear-gradient(90deg, #f0703a, #d4466e)" }}
                      >
                        {stop.grade}
                      </p>
                    ) : null}
                    <ul className="mt-4 space-y-2 border-t border-border pt-4 text-xs leading-5 text-muted-foreground sm:text-[13px] sm:leading-6">
                      {stop.points.map((entry) => (
                        <li key={entry} className="flex gap-2">
                          <span aria-hidden="true" style={{ color: tint }}>
                            —
                          </span>
                          <span>{entry}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
