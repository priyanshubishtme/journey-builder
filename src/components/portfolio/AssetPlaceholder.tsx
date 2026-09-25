import { cn } from "@/lib/utils";

/**
 * A quiet, labelled frame used wherever a real photo will go later.
 * Pass `src` and it renders the image; leave it out and it renders a
 * placeholder that still respects the final aspect ratio.
 */
export function AssetPlaceholder({
  src,
  alt,
  label,
  className,
  frameClassName,
  ratio = "4 / 5",
}: {
  src?: string;
  alt?: string;
  label?: string;
  className?: string;
  frameClassName?: string;
  /** CSS aspect-ratio value, e.g. "4 / 5". */
  ratio?: string;
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
        <div className="absolute inset-0">
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full text-border"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="0.3" />
            <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="0.3" />
          </svg>
          <div className="absolute inset-0 flex items-end justify-between gap-2 p-3">
            <span className="label-mono leading-4">{label ?? "Image"}</span>
            <span className="label-mono leading-4 opacity-70">Asset</span>
          </div>
        </div>
      )}
    </div>
  );
}
