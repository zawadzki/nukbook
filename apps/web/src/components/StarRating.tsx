import { maskStarClass, ratingSizeClass } from "@/components/ratingUtils";

export default function StarRating({
  value,
  size = "sm",
  showText = false,
}: {
  value: number; // 1..5
  size?: "xs" | "sm" | "md";
  showText?: boolean;
}) {
  const v = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <div className="flex items-center gap-1">
      <div className={`rating ${ratingSizeClass(size)}`} aria-label={`${v} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => {
          const idx = i + 1;
          const filled = idx <= v;

          return (
            <div
              key={i}
              aria-label={`${idx} star`}
              aria-current={idx === v}
              className={maskStarClass(filled)}
            />
          );
        })}
      </div>

      {showText ? <span className="text-xs text-ctp-subtext0">{v}/5</span> : null}
    </div>
  );
}
