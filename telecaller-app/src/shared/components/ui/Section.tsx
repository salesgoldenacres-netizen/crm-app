import React from "react";
import { twMerge } from "tailwind-merge";

export interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function Section({ children, title, description, className, ...props }: SectionProps) {
  return (
    <section className={twMerge("space-y-4 w-full", className)} {...props}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-sm sm:text-base font-bold text-theme-text">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-[11px] sm:text-xs text-theme-muted">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
