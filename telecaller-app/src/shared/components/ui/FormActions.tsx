import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Button from "./Button";

/**
 * Thin form footer helper aligned with Command Surface §3d action hierarchy.
 * Presentation only — no form state, validation, or submit ownership.
 *
 * Order rendered (LTR): Destructive (optional) → Secondary → Primary
 * so Primary sits at the trailing edge of Modal footers.
 */
export interface FormActionsProps {
  primaryLabel?: string;
  onPrimary?: () => void;
  /** Defaults to `submit` when used inside a `<form>`; pass `button` for controlled clicks. */
  primaryType?: "button" | "submit";
  secondaryLabel?: string;
  onSecondary?: () => void;
  destructiveLabel?: string;
  onDestructive?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  /** Escape hatch for custom action nodes (replaces built-in buttons when set alone is rare — prefer slots). */
  children?: React.ReactNode;
}

export default function FormActions({
  primaryLabel = "Save",
  onPrimary,
  primaryType = "submit",
  secondaryLabel = "Cancel",
  onSecondary,
  destructiveLabel,
  onDestructive,
  isLoading = false,
  disabled = false,
  className,
  children,
}: FormActionsProps) {
  if (children) {
    return (
      <div
        className={twMerge(
          clsx("flex justify-end items-center gap-3 flex-wrap w-full", className)
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={twMerge(
        clsx("flex justify-end items-center gap-3 flex-wrap w-full", className)
      )}
    >
      {destructiveLabel && onDestructive && (
        <Button
          type="button"
          variant="ghost"
          className="text-theme-danger hover:text-theme-danger mr-auto"
          onClick={onDestructive}
          disabled={disabled || isLoading}
        >
          {destructiveLabel}
        </Button>
      )}
      {secondaryLabel && (
        <Button
          type="button"
          variant="outline"
          onClick={onSecondary}
          disabled={disabled || isLoading}
        >
          {secondaryLabel}
        </Button>
      )}
      {primaryLabel && (
        <Button
          type={primaryType}
          variant="primary"
          onClick={onPrimary}
          disabled={disabled || isLoading}
        >
          {isLoading ? "Saving…" : primaryLabel}
        </Button>
      )}
    </div>
  );
}
