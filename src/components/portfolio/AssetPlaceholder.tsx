import { cn } from "@/lib/utils";
import { useId } from "react";

/**
 * Frame for a photo slot.
 *
 * Pass `src` and it renders the photo. Leave it out and it renders a small
 * generated sunset illustration instead — a horizon, hills, a road and a tiny
 * bus — so unfinished photo slots still look deliberate rather than broken.
 * `tone` (usually the index of the item in the page) picks the palette, so no
 * two placeholders look the same.
 */

const PALETTES = [
  { sky: ["#ffe3ae", "#ffab5e", "#e8564a"], sun: "#fff6de", hills: ["#a8563a", "#6d3a55", "#3b2438"] },
  { sky: ["#ffd08f", "#f0703a", "#ab3f7c"], sun: "#fff0cf", hills: ["#8d4a33", "#5e2f52", "#332038"] },
  { sky: ["#ffdfb0", "#ff9f45", "#d4466e"], sun: "#fffaee", hills: ["#9b5a3c", "#6a3550", "#372234"] },
  { sky: ["#ffc9a0", "#e8564a", "#6d3a7b"], sun: "#fff4e2", hills: ["#7d4136", "#512c52", "#2b1a2a"] },
  { sky: ["#ffe9c4", "#ffb469", "#c9764f"], sun: "#fffdf6", hills: ["#b06442", "#75425c", "#3f2539"] },
  { sky: ["#ffd8a8", "#f58b4c", "#9c3f7a"], sun: "#fff7e6", hills: ["#95503a", "#613056", "#30203a"] },
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100000;
  }
  return hash;
}

function Artwork({ seed, tone }: { seed: string; tone: number }) {
  const uid = useId().replace(/[:]/g, "");
  const hash = hashString(seed + String(tone));
  const palette = PALETTES[(tone + hash) % PALETTES.length];
  const sunX = 34 + (hash % 90);
  const sunY = 34 + (hash % 18);
  const ridgeShift = (hash % 11) - 5;
  const birds = 2 + (hash % 3);

  const sky = `${uid}-sky`;
  const glow = `${uid}-glow`;
  const road = `${uid}-road`;

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.sky[0]} />
          <stop offset="58%" stopColor={palette.sky[1]} />
          <stop offset="100%" stopColor={palette.sky[2]} />
        </linearGradient>
        <radialGradient id={glow}>
          <stop offset="0%" stopColor={palette.sun} stopOpacity="0.95" />
          <stop offset="45%" stopColor={palette.sun} stopOpacity="0.35" />
          <stop offset="100%" stopColor={palette.sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={road} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.hills[2]} stopOpacity="0.35" />
          <stop offset="100%" stopColor={palette.hills[2]} stopOpacity="0.95" />
        </linearGradient>
      </defs>

      <rect width="160" height="100" fill={`url(#${sky})`} />
      <circle cx={sunX} cy={sunY + 12} r="34" fill={`url(#${glow})`} />
      <circle cx={sunX} cy={sunY + 12} r="7.5" fill={palette.sun} />

      {Array.from({ length: birds }).map((_, index) => {
        const x = 22 + ((hash + index * 37) % 110);
        const y = 16 + ((hash + index * 19) % 22);
        const size = 2.4 + ((hash + index) % 3) * 0.6;
        return (
          <path
            key={index}
            d={`M${x - size},${y} q${size / 2},-${size / 1.4} ${size},0 q${size / 2},-${size / 1.4} ${size},0`}
            fill="none"
            stroke={palette.hills[2]}
            strokeOpacity="0.5"
            strokeWidth="0.7"
            strokeLinecap="round"
          />
        );
      })}

      <path
        d={`M0,${62 + ridgeShift} C26,${52 + ridgeShift} 48,${70 + ridgeShift} 78,${60 + ridgeShift} C108,${50 + ridgeShift} 130,${66 + ridgeShift} 160,${56 + ridgeShift} L160,100 L0,100 Z`}
        fill={palette.hills[2]}
        fillOpacity="0.45"
      />
      <path
        d={`M0,${76 - ridgeShift * 0.4} C30,${66 - ridgeShift * 0.4} 54,${80 - ridgeShift * 0.4} 86,${72 - ridgeShift * 0.4} C118,${64 - ridgeShift * 0.4} 134,${78 - ridgeShift * 0.4} 160,${70 - ridgeShift * 0.4} L160,100 L0,100 Z`}
        fill={palette.hills[1]}
        fillOpacity="0.7"
      />
      <path d="M0,88 C34,82 62,92 96,86 C124,81 142,90 160,85 L160,100 L0,100 Z" fill={palette.hills[0]} />

      {/* Road with a tiny bus on it. */}
      <path d="M74,74 L86,74 L100,100 L60,100 Z" fill={`url(#${road})`} />
      <path d="M79.6,76 L80.4,76 L80.7,82 L79.3,82 Z" fill={palette.sun} fillOpacity="0.75" />
      <path d="M77.4,87 L78.2,87 L78.6,93 L77,93 Z" fill={palette.sun} fillOpacity="0.6" />
      <g>
        <rect x={72.6} y={76.6} width="15" height="7.4" rx="1.4" fill={palette.sun} fillOpacity="0.95" />
        <rect x={73.8} y={78} width="12.6" height="2.6" rx="0.9" fill={palette.hills[2]} fillOpacity="0.75" />
        <rect x={76} y={84} width="2.6" height="2.2" rx="0.7" fill={palette.hills[2]} />
        <rect x={81.4} y={84} width="2.6" height="2.2" rx="0.7" fill={palette.hills[2]} />
      </g>
    </svg>
  );
}

export function AssetPlaceholder({
  src,
  alt,
  label,
  className,
  frameClassName,
  ratio = "4 / 5",
  tone = 0,
}: {
  src?: string;
  alt?: string;
  label?: string;
  className?: string;
  frameClassName?: string;
  /** CSS aspect-ratio value, e.g. "4 / 5". */
  ratio?: string;
  /** Picks the generated palette when no image is supplied. */
  tone?: number;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-border bg-secondary/60",
        frameClassName,
        className,
      )}
      style={{ aspectRatio: ratio }}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? label ?? ""}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <Artwork seed={label ?? "photo"} tone={tone} />
          <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_120%,rgba(43,26,42,0.55),transparent_60%)]" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#fff3e2] drop-shadow-[0_1px_2px_rgba(43,26,42,0.7)]">
              {label ?? "Photo"}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffe6c4]/80">
              + photo
            </span>
          </div>
        </>
      )}
    </div>
  );
}
