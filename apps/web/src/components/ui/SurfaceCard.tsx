import type { ComponentPropsWithoutRef, ElementType } from "react";

type CardPadding = "none" | "xs" | "sm" | "md" | "lg";

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  xs: "p-2",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

type SurfaceCardProps<E extends ElementType> = {
  as?: E;
  padding?: CardPadding;
  className?: string;
} & Omit<ComponentPropsWithoutRef<E>, "as" | "className">;

export default function SurfaceCard<E extends ElementType = "div">({
  as,
  padding = "md",
  className,
  ...props
}: SurfaceCardProps<E>) {
  const Comp = as ?? "div";
  const classes = [
    "rounded-lg border border-ctp-surface1 bg-ctp-mantle",
    paddingClasses[padding],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Comp className={classes} {...props} />;
}
