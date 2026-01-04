import { maskHalfClass, ratingSizeClass } from "@/components/ratingUtils";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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
  const rounded = Math.round(v * 2) / 2;
  const halfSteps = Math.round(rounded * 2);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`rating rating-half ${ratingSizeClass(size)}`}
        aria-label={`${rounded} out of 5 stars`}
      >
        {Array.from({ length: 10 }).map((_, i) => {
          const idx = i + 1;
          const active = idx <= halfSteps;
          const half = idx % 2 === 1 ? 1 : 2;
          return (
            <div
              key={idx}
              aria-label={`${idx / 2} star`}
              aria-current={idx === halfSteps}
              className={maskHalfClass(half, active)}
            />
          );
        })}
      </div>

      {showText ? (
        <span className="text-xs text-ctp-subtext0">{rounded.toFixed(1)}/5</span>
      ) : null}
    </div>
  );
}
