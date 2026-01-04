"use client";

import { useId, useState } from "react";
import { maskStarClass, ratingSizeClass } from "@/components/ratingUtils";

export default function StarRatingInput({
  value,
  onChangeAction,
  size = "sm",
  disabled = false,
}: {
  value: number;
  onChangeAction: (value: number) => void;
  size?: "xs" | "sm" | "md";
  disabled?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  const name = useId();

  return (
    <div className={`rating ${ratingSizeClass(size)}`} aria-label="Rating">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const active = n <= display;
        return (
          <input
            key={n}
            type="radio"
            name={name}
            className={maskStarClass(active)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            checked={value === n}
            disabled={disabled}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(null)}
            onChange={() => onChangeAction(n)}
            style={{ opacity: active ? 1 : 0.35 }}
          />
        );
      })}
    </div>
  );
}
