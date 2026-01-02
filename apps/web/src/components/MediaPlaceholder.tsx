import type { ReactNode } from "react";

type PlaceholderVariant = "base" | "mantle";

const variantClasses: Record<PlaceholderVariant, string> = {
  base: "bg-ctp-base",
  mantle: "bg-ctp-mantle",
};

type MediaPlaceholderProps = {
  className?: string;
  variant?: PlaceholderVariant;
  children?: ReactNode;
};

export default function MediaPlaceholder({
  className,
  variant = "base",
  children = " ",
}: MediaPlaceholderProps) {
  const classes = [
    "flex items-center justify-center rounded-md bg-ctp-surface2",
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}
