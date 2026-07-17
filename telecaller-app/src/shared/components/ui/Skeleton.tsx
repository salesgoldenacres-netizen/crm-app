import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "rectangular" | "circular";
}

export default function Skeleton({
  variant = "rectangular",
  className,
  ...props
}: SkeletonProps) {
  const baseStyle = "animate-pulse bg-theme-surface transition-colors duration-300";

  const variants = {
    text: "h-3 w-3/4 rounded",
    rectangular: "rounded-lg",
    circular: "rounded-full",
  };

  return (
    <div
      className={twMerge(clsx(baseStyle, variants[variant], className))}
      {...props}
    />
  );
}
