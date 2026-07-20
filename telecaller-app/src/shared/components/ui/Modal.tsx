import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Focusable controls inside an overlay panel (Modal / Drawer focus trap). */
export const OVERLAY_FOCUSABLE_SELECTOR = [
  'a[href]',
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function getOverlayFocusableElements(
  container: HTMLElement
): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(OVERLAY_FOCUSABLE_SELECTOR)
  ).filter((el) => {
    if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") {
      return false;
    }
    if (el.getAttribute("aria-hidden") === "true") return false;
    // OffsetParent null catches display:none; visibility/inert checked lightly
    return el.tabIndex >= 0 || el.tagName === "A" || el.tagName === "BUTTON" ||
      el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA";
  });
}

/**
 * Shared overlay a11y: body scroll lock, initial focus, Tab trap, Escape, return focus.
 * Used by Modal and Drawer so both stay on one contract (Wave 5 Phase 2).
 */
export function useOverlayFocus({
  isOpen,
  onClose,
  containerRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const frame = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const focusables = getOverlayFocusableElements(container);
      const target = focusables[0] ?? container;
      target.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      const previous = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (
        previous &&
        typeof previous.focus === "function" &&
        document.contains(previous)
      ) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [isOpen, containerRef]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;

      const focusables = getOverlayFocusableElements(container);
      if (focusables.length === 0) {
        e.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else if (active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, containerRef]);
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Prefer Command Surface hierarchy via `FormActions` (Primary / Secondary / Destructive). */
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  /**
   * Presentation variant on the same primitive (no Sheet.tsx fork).
   * `center` = desktop-style dialog (all breakpoints);
   * `sheet` = bottom sheet on small screens, centered on `sm+`.
   */
  variant?: "center" | "sheet";
  /** Optional id for `aria-describedby` (e.g. Dialog description). */
  descriptionId?: string;
  /** Backdrop click dismisses. Default true. Set false for destructive confirms. */
  closeOnBackdrop?: boolean;
  /** Accessible name for the header dismiss control. Default "Close". */
  closeLabel?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className,
  variant = "center",
  descriptionId,
  closeOnBackdrop = true,
  closeLabel = "Close",
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const isSheet = variant === "sheet";

  useOverlayFocus({ isOpen, onClose, containerRef: panelRef });

  if (!isOpen) return null;

  const sizes = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
  };

  return (
    <div
      className={clsx(
        "fixed inset-0 z-50 flex justify-center",
        isSheet
          ? "items-end p-0 sm:items-center sm:p-4"
          : "items-center p-4"
      )}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-theme-overlay backdrop-blur-sm transition-opacity duration-300"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={twMerge(
          clsx(
            "relative w-full bg-theme-card shadow-2xl overflow-hidden flex flex-col outline-none",
            sizes[size],
            isSheet
              ? [
                  // Mobile (under sm): bottom sheet layout, safe area aware
                  "h-[100dvh] max-h-none rounded-t-theme border-t border-x-0 border-b-0 border-theme-border animate-sheetSlideUp",
                  // Tablet/Desktop (sm and up): centered dialog layout
                  "sm:h-auto sm:max-h-[90vh] sm:rounded-theme sm:border sm:animate-none sm:scale-100 sm:border-b",
                ]
              : [
                  // Center: dialog at all breakpoints
                  "max-h-[90vh] rounded-theme border border-theme-border",
                ],
            className
          )
        )}
      >
        {/* Notch swipe handle — sheet variant, mobile only */}
        {isSheet && (
          <div
            className="sm:hidden flex justify-center pt-2 pb-0"
            aria-hidden="true"
          >
            <div className="h-1 w-10 rounded-full bg-theme-border" />
          </div>
        )}

        {/* Header */}
        <div
          className={clsx(
            "px-6 py-4 border-b border-theme-border flex items-center justify-between gap-3",
            isSheet && "pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-4"
          )}
        >
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
        <div className={clsx(
          "flex-1 overflow-y-auto px-6 py-5 text-theme-text text-xs sm:text-sm leading-relaxed",
          !footer && (isSheet
            ? "pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5"
            : "pb-5")
        )}>
          {children}
        </div>

        {/* Footer — right-aligned action hierarchy (Secondary → Primary / Destructive) */}
        {footer && (
          <div
            className={clsx(
              "px-6 py-4 border-t border-theme-border bg-theme-surface/50 flex justify-end items-center gap-3 flex-wrap",
              isSheet
                ? "pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4"
                : "pb-4"
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
