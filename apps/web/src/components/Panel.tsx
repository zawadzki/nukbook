import type { ComponentPropsWithoutRef, ElementType } from "react";

type PanelVariant = "base" | "mantle";
type PanelPadding = "none" | "xs" | "sm" | "md" | "lg";

const variantClasses: Record<PanelVariant, string> = {
  base: "bg-ctp-base",
  mantle: "bg-ctp-mantle",
};

const paddingClasses: Record<PanelPadding, string> = {
  none: "",
  xs: "p-2",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

type PanelProps<E extends ElementType> = {
  as?: E;
  variant?: PanelVariant;
  padding?: PanelPadding;
  className?: string;
} & Omit<ComponentPropsWithoutRef<E>, "as" | "className">;

export default function Panel<E extends ElementType = "div">({
  as,
  variant = "base",
  padding = "md",
  className,
  ...props
}: PanelProps<E>) {
  const Comp = as ?? "div";
  const classes = [
    "rounded-lg border border-ctp-surface0",
    variantClasses[variant],
    paddingClasses[padding],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Comp className={classes} {...props} />;
}
