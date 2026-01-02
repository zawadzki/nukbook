"use client";

import { useState } from "react";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import Button from "@/components/Button";

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

  const cls =
    size === "xs" ? "h-4 w-4" : size === "md" ? "h-6 w-6" : "h-5 w-5";

  return (
    <div className="flex items-center" role="radiogroup" aria-label="Rating">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const filled = n <= display;
        const Icon = filled ? StarSolid : StarOutline;

        return (
          <Button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            disabled={disabled}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(null)}
            onClick={() => onChangeAction(n)}
            variant="plain"
            size="xs"
            className={[
              "transition-colors",
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctp-surface1 focus-visible:ring-offset-2 focus-visible:ring-offset-ctp-base",
            ].join(" ")}
          >
            <Icon className={cls + (filled ? " text-ctp-rosewater" : " text-ctp-subtext0")} />
          </Button>
        );
      })}
    </div>
  );
}
