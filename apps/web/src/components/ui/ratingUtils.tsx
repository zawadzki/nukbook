export type RatingSize = "xs" | "sm" | "md";

export function ratingSizeClass(size: RatingSize): string {
  if (size === "xs") return "rating-xs";
  if (size === "md") return "rating-md";
  return "rating-sm";
}

export function maskStarClass(active: boolean): string {
  const color = active ? "text-ctp-rosewater" : "text-ctp-subtext0";
  return `mask mask-star-2 bg-current ${color}`;
}

export function maskHalfClass(half: 1 | 2, active: boolean): string {
  const color = active ? "text-ctp-rosewater" : "text-ctp-subtext0";
  const halfClass = half === 1 ? "mask-half-1" : "mask-half-2";
  return `mask mask-star-2 ${halfClass} bg-current ${color}`;
}
