import type { ComponentPropsWithoutRef, ElementType } from "react";

type BadgeVariant = "mantle" | "base";

const variantClasses: Record<BadgeVariant, string> = {
  base: "bg-ctp-base",
  mantle: "bg-ctp-mantle",
};

type SurfaceBadgeProps<E extends ElementType> = {
  as?: E;
  variant?: BadgeVariant;
  className?: string;
} & Omit<ComponentPropsWithoutRef<E>, "as" | "className">;

export default function SurfaceBadge<E extends ElementType = "div">({
  as,
  variant = "mantle",
  className,
  ...props
}: SurfaceBadgeProps<E>) {
  const Comp = as ?? "div";
  const classes = [
    "rounded-md border border-ctp-surface1 px-3 py-2 text-sm",
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Comp className={classes} {...props} />;
}
