import React, { useId, useRef } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useOverlayFocus } from "./Modal";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  position?: "right" | "left" | "bottom";
  className?: string;
  /** Optional id for `aria-describedby`. */
  descriptionId?: string;
  /** Backdrop click dismisses. Default true. */
  closeOnBackdrop?: boolean;
  /** Accessible name for the header dismiss control. Default "Close". */
  closeLabel?: string;
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  position = "right",
  className,
  descriptionId,
  closeOnBackdrop = true,
  closeLabel = "Close",
}: DrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useOverlayFocus({ isOpen, onClose, containerRef: panelRef });

  if (!isOpen) return null;

  const widthResponsiveSizes = {
    sm: "md:max-w-xs",
    md: "md:max-w-md",
    lg: "md:max-w-lg",
  };

  const heightSizes = {
    sm: "max-h-[30vh]",
    md: "max-h-[50vh]",
    lg: "max-h-[70vh]",
  };

  const transitions = {
    right: "bottom-0 inset-x-0 top-auto w-full h-[90vh] md:h-full md:w-auto md:top-0 md:right-0 md:inset-y-0 md:left-auto",
    left: "bottom-0 inset-x-0 top-auto w-full h-[90vh] md:h-full md:w-auto md:top-0 md:left-0 md:inset-y-0 md:right-auto",
    bottom: "bottom-0 inset-x-0 w-full",
  };

  const sizeClasses =
    position === "bottom"
      ? heightSizes[size]
      : clsx("w-full h-full max-h-[90vh] md:max-h-full", widthResponsiveSizes[size]);

  // Side edges use theme radius via CSS var (no rounded-l/r-theme utility exists yet).
  const radiusClasses =
    position === "bottom"
      ? "rounded-t-theme border-t"
      : clsx(
          "rounded-t-theme border-t border-theme-border md:rounded-t-none",
          position === "left"
            ? "md:rounded-r-[var(--radius)] md:border-r md:border-t-0"
            : "md:rounded-l-[var(--radius)] md:border-l md:border-t-0"
        );

  const motionClasses =
    position === "bottom"
      ? "animate-sheetSlideUp"
      : "animate-sheetSlideUp md:animate-none md:transition-all md:duration-300";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop — Full Page Cover with Consistent Blur */}
      <div
        className="fixed inset-0 w-screen h-screen min-h-[100dvh] bg-theme-overlay backdrop-blur-md transition-opacity duration-300"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      <div className={clsx("fixed flex", transitions[position])}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          className={twMerge(
            clsx(
              "w-full bg-theme-card border-theme-border shadow-2xl flex flex-col outline-none",
              radiusClasses,
              motionClasses,
              sizeClasses,
              className
            )
          )}
        >
          {(position === "bottom" || position === "right" || position === "left") && (
            <div
              className={clsx(
                "flex justify-center pt-2 pb-0",
                position !== "bottom" && "md:hidden"
              )}
              aria-hidden="true"
            >
              <div className="h-1 w-10 rounded-full bg-theme-border" />
            </div>
          )}

          {/* Header */}
          <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between gap-3 shrink-0">
            <h3
              id={titleId}
              className="text-base font-semibold text-theme-text truncate"
            >
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className={
                "p-2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme text-theme-muted hover:text-theme-text transition-colors cursor-pointer " +
                "border-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              }
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div
            className={twMerge(
              clsx(
                "flex-1 min-h-0 overflow-y-auto px-6 py-5 text-theme-text text-xs sm:text-sm leading-relaxed",
                !footer && "pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-5"
              )
            )}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4 border-t border-theme-border bg-theme-surface/50 flex justify-end items-center gap-3 flex-wrap shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
