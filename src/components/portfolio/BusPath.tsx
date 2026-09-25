import { routeStops } from "@/data/profile";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { Bus } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

const RAIL_X = 30;
const GUTTER_AMPLITUDE = 64;
const LEAD = 70;

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
 * Education and experience as stops on one dotted bus route. The card
 * positions are measured from the DOM, so the path stays aligned no matter
 * how the copy reflows; a small bus rides the route as you scroll.
 */
export function BusPath() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isMobile = useIsMobile();

  const [box, setBox] = useState({ width: 0, height: 0 });
  const [stops, setStops] = useState<Point[]>([]);
  const [activeStop, setActiveStop] = useState(0);

  const markerX = useMotionValue(0);
  const markerY = useMotionValue(0);

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start center", "end center"],
  });
  const travel = useTransform(scrollYProgress, [0.02, 0.98], [0, 1]);

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
        const x = width < 768
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

  const routePath = buildRoutePath([
    ...(stops.length
      ? [{ x: stops[0].x, y: Math.max(stops[0].y - LEAD, 8) }]
      : []),
    ...stops,
    ...(stops.length
      ? [{ x: stops[stops.length - 1].x, y: stops[stops.length - 1].y + LEAD }]
      : []),
  ]);
  const stopPath = buildRoutePath(stops);

  // Path length only gets measured once per geometry change, not per frame.
  const pathLengthRef = useRef(0);
  const measuredPathRef = useRef<string | null>(null);

  const syncMarker = (value: number) => {
    const path = pathRef.current;
    if (!path || !routePath) return;
    if (measuredPathRef.current !== routePath) {
      pathLengthRef.current = path.getTotalLength();
      measuredPathRef.current = routePath;
    }
    const length = pathLengthRef.current;
    if (!length) return;
    const point = path.getPointAtLength(length * Math.min(Math.max(value, 0), 1));
    markerX.set(point.x - 20);
    markerY.set(point.y - 20);
  };

  useMotionValueEvent(travel, "change", (value) => {
    syncMarker(value);
    const next = Math.min(
      Math.floor(value * routeStops.length + 0.15),
      routeStops.length - 1,
    );
    setActiveStop((current) => (current === next ? current : Math.max(next, 0)));
  });

  // Re-sync when the geometry changes (resize, font swap, reflow).
  useEffect(() => {
    syncMarker(travel.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePath, box.height]);

  return (
    <section id="route" className="relative scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-5 pt-24 pb-6 sm:px-8">
        <div className="flex items-end justify-between gap-6 border-b border-border pb-4">
          <div>
            <p className="label-mono">Section 02</p>
            <h2 className="mt-3 font-display text-3xl tracking-[-0.02em] sm:text-4xl">
              Education &amp; experience
            </h2>
          </div>
          <p className="label-mono hidden max-w-xs text-right sm:block">
            Every stop on one route
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
        <div ref={wrapRef} className="relative">
          {/* Dotted route + travelled overlay */}
          {box.width > 0 && stops.length > 0 ? (
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${box.width} ${box.height}`}
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d={stopPath}
                stroke="currentColor"
                className="text-border"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="0 12"
              />
              <motion.path
                ref={pathRef}
                d={routePath}
                stroke="currentColor"
                className="text-foreground"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeOpacity="0.5"
                style={{ pathLength: travel }}
              />
              {stops.map((point, index) => (
                <circle
                  key={`${point.x}-${point.y}`}
                  cx={point.x}
                  cy={point.y}
                  r={index === activeStop ? 9 : 6}
                  className={cn(
                    "transition-all duration-300",
                    index === activeStop ? "fill-foreground" : "fill-background",
                  )}
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              ))}
            </svg>
          ) : null}

          {/* Travelling bus marker */}
          <motion.div
            style={{ x: markerX, y: markerY }}
            className="pointer-events-none absolute top-0 left-0 z-10 flex size-10 items-center justify-center rounded-full border border-border bg-card shadow-sm"
          >
            <Bus className="size-4" strokeWidth={1.6} />
          </motion.div>

          {/* Stops */}
          <div className="flex flex-col gap-10 md:grid md:grid-cols-2 md:gap-x-40 md:gap-y-6">
            {routeStops.map((stop, index) => (
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
                    "relative ml-16 w-full border border-border bg-card p-5 transition-colors duration-300 sm:p-6 md:ml-0 md:max-w-[26rem]",
                    index === activeStop && "border-foreground/25",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="label-mono">
                      {stop.kind} · Stop {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="label-mono whitespace-nowrap">{stop.period}</p>
                  </div>
                  <h3 className="mt-3 font-display text-xl leading-6 tracking-[-0.01em] sm:text-2xl sm:leading-7">
                    {stop.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stop.place}
                  </p>
                  {stop.grade ? (
                    <p className="mt-4 font-display text-3xl tracking-[-0.02em]">
                      {stop.grade}
                    </p>
                  ) : null}
                  <ul className="mt-4 space-y-2 border-t border-border pt-4 text-xs leading-5 text-muted-foreground sm:text-[13px] sm:leading-6">
                    {stop.points.map((point) => (
                      <li key={point} className="flex gap-2">
                        <span aria-hidden="true" className="text-border">
                          —
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
