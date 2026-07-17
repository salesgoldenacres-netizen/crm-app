import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BottomActionBarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * BottomActionBar Primitive (Wave 8 Phase 2B)
 * Sticky mobile layout bar that is automatically hidden on desktop/tablet.
 * Incorporates safe-area-inset-bottom internally.
 */
export default function BottomActionBar({ children, className }: BottomActionBarProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "fixed bottom-0 inset-x-0 z-40 bg-theme-surface/95 backdrop-blur-md border-t border-theme-border shadow-lg px-4 py-3 flex items-center justify-around gap-2 md:hidden",
          "pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
          className
        )
      )}
    >
      {children}
    </div>
  );
}
