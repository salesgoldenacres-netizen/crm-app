import React from "react";
import { twMerge } from "tailwind-merge";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/** Shared card surface — radius from `--radius` (branding). */
export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={twMerge(
        "bg-theme-card rounded-theme border border-theme-border shadow-elevation-sm transition-colors duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <div
      className={twMerge(
        "px-6 py-4 border-b border-theme-border flex items-center justify-between",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className, ...props }: CardProps) {
  return (
    <div className={twMerge("p-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return (
    <div
      className={twMerge(
        "px-6 py-4 border-t border-theme-border bg-theme-surface/50 rounded-b-theme",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
