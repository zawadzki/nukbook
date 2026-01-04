import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant =
  | "basic"
  | "primary"
  | "neutral"
  | "outline"
  | "mantle"
  | "soft"
  | "ghost"
  | "plain"
  | "info"
  | "success"
  | "warning"
  | "error";
type ButtonSize = "none" | "xs" | "sm" | "md" | "icon" | "icon-sm";
type ButtonRadius = "md" | "full";

const baseClasses =
  "btn disabled:pointer-events-none disabled:opacity-60 leading-none";

const variantClasses: Record<ButtonVariant, string> = {
  basic:   " ",
  primary: "btn-primary",
  neutral: "btn-neutral",
  outline: "btn-outline",
  mantle:  "btn-secondary",
  soft:    "btn-soft",
  ghost:   "btn-ghost",
  plain:   "btn-link",
  info:    "btn-soft btn-info",
  success: "btn-soft btn-success",
  warning: "btn-soft btn-warning",
  error:   "btn-soft btn-error",
};

const sizeClasses: Record<ButtonSize, string> = {
  none:      "",
  xs:        "btn-xs",
  sm:        "btn-sm",
  md:        "btn-md",
  icon:      "btn-circle",
  "icon-sm": "p-1.5",
};

const radiusClasses: Record<ButtonRadius, string> = {
  md:   "",
  full: "rounded-full",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "basic", size = "md", radius = "md", type = "button", ...props }, ref) => {
    const classes = [
      baseClasses,
      radiusClasses[radius],
      variantClasses[variant],
      sizeClasses[size],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return <button ref={ref} type={type} className={classes} {...props} />;
  },
);

Button.displayName = "Button";

export default Button;
