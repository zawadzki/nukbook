import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";

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
  const cls =
    size === "xs" ? "h-4 w-4" : size === "md" ? "h-6 w-6" : "h-5 w-5";

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center" aria-label={`${v} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < v;
          const Icon = filled ? StarSolid : StarOutline;

          return (
            <Icon
              key={i}
              className={[
                cls,
                filled ? "text-ctp-rosewater" : "text-ctp-subtext0",
              ].join(" ")}
            />
          );
        })}
      </div>

      {showText ? <span className="text-xs text-ctp-subtext0">{v}/5</span> : null}
    </div>
  );
}
