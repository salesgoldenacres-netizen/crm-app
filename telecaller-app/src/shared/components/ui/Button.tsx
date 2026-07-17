import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}

export default function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  const baseStyle =
    "inline-flex items-center justify-center font-semibold rounded-theme transition-colors cursor-pointer select-none " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring " +
    "disabled:opacity-50 disabled:cursor-not-allowed border";

  const variants = {
    primary:
      "bg-theme-accent hover:opacity-90 text-theme-accent-fg border-transparent shadow-sm",
    secondary:
      "bg-theme-surface hover:opacity-90 text-theme-text border-transparent shadow-sm",
    outline:
      "bg-theme-card hover:bg-theme-surface text-theme-text border-theme-border shadow-sm",
    ghost:
      "bg-transparent hover:bg-theme-surface text-theme-muted border-transparent",
    danger:
      "bg-theme-danger hover:opacity-90 text-white border-transparent shadow-sm",
    success:
      "bg-theme-success hover:opacity-90 text-white border-transparent shadow-sm",
  };

  const sizes = {
    sm: "px-2.5 py-1.5 text-[10px] sm:text-xs",
    md: "px-4 py-2 text-xs sm:text-sm",
    lg: "px-5 py-2.5 text-sm sm:text-base",
  };

  return (
    <button
      type={type}
      className={twMerge(clsx(baseStyle, variants[variant], sizes[size], className))}
      {...props}
    >
      {children}
    </button>
  );
}
