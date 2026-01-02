import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function HalfStar({ className }: { className: string }) {
  return (
    <span className="relative inline-flex">
      <StarOutline className={className + " text-ctp-rosewater"} />
      <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
        <StarSolid className={className + " text-ctp-rosewater"} />
      </span>
    </span>
  );
}

export default function StarRatingAvg({
  value,
  size = "sm",
  showText = false,
}: {
  value: number; // 0..5 (float)
  size?: "xs" | "sm" | "md";
  showText?: boolean;
}) {
  const v = clamp(value ?? 0, 0, 5);
  const rounded = Math.round(v * 2) / 2; // nearest 0.5

  const full = Math.floor(rounded);
  const hasHalf = rounded - full === 0.5;

  const cls =
    size === "xs" ? "h-4 w-4" : size === "md" ? "h-6 w-6" : "h-5 w-5";

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center" aria-label={`${rounded} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => {
          const idx = i + 1;
          if (idx <= full) {
            return <StarSolid key={i} className={cls + " text-ctp-rosewater"} />;
          }
          if (idx === full + 1 && hasHalf) {
            return <HalfStar key={i} className={cls} />;
          }
          return <StarOutline key={i} className={cls + " text-ctp-subtext0"} />;
        })}
      </div>

      {showText ? (
        <span className="text-xs text-ctp-subtext0">{rounded.toFixed(1)}/5</span>
      ) : null}
    </div>
  );
}
