import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  variant?: "indigo" | "white" | "slate";
}

export default function LoadingSpinner({
  size = "md",
  variant = "indigo",
  className,
  ...props
}: LoadingSpinnerProps) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  const variants = {
    indigo: "border-theme-accent border-t-transparent",
    white: "border-white border-t-transparent",
    slate: "border-theme-border border-t-transparent",
  };

  return (
    <div
      role="status"
      className={twMerge(
        clsx(
          "animate-spin rounded-full transition-colors duration-300",
          sizes[size],
          variants[variant],
          className
        )
      )}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
