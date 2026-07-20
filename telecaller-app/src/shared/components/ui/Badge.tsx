import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
}

export default function Badge({ children, className, variant = "default", ...props }: BadgeProps) {
  const baseStyle =
    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap select-none transition-colors";

  const variants = {
    default: "bg-theme-surface text-theme-text border-theme-border",
    primary: "bg-theme-accent-muted text-theme-accent border-theme-border",
    success: "bg-theme-success/10 text-theme-success border-theme-success/20",
    warning: "bg-theme-warning/10 text-theme-warning border-theme-warning/20",
    danger: "bg-theme-danger/10 text-theme-danger border-theme-danger/20",
    info: "bg-theme-info/10 text-theme-info border-theme-info/20",
  };

  return (
    <span className={twMerge(clsx(baseStyle, variants[variant], className))} {...props}>
      {children}
    </span>
  );
}
