import { useId } from "react";

/** Shared control chrome — DLS v1.2 + Wave 4 Form Contract (draft). */
export const FIELD_CONTROL_CLASS =
  "w-full px-3 py-2 border rounded-theme text-base sm:text-sm shadow-sm transition-colors duration-200 " +
  "bg-theme-surface border-theme-border text-theme-text " +
  "focus-visible:outline-none focus-visible:border-theme-accent focus-visible:ring-2 focus-visible:ring-theme-ring";

export const FIELD_CONTROL_ERROR_CLASS =
  "border-theme-danger focus-visible:border-theme-danger focus-visible:ring-theme-danger";

export const FIELD_LABEL_CLASS =
  "type-label font-semibold text-theme-muted";

export const FIELD_HELPER_CLASS =
  "text-[10px] sm:text-xs font-medium text-theme-muted";

export const FIELD_ERROR_CLASS =
  "text-[10px] sm:text-xs font-medium text-theme-danger";

export interface FormFieldIds {
  fieldId: string;
  errorId: string;
  helperId: string;
  /** Combined aria-describedby when error and/or helper present. Error wins over helper for display; both may describe. */
  describedBy?: string;
}

/**
 * Auto-generates a stable field id when omitted, plus error/helper ids for aria-describedby.
 * Presentation-only — does not own form state.
 */
export function useFormFieldIds(
  id: string | undefined,
  opts: { error?: string; helperText?: string }
): FormFieldIds {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;
  const parts: string[] = [];
  if (opts.error) parts.push(errorId);
  else if (opts.helperText) parts.push(helperId);
  return {
    fieldId,
    errorId,
    helperId,
    describedBy: parts.length > 0 ? parts.join(" ") : undefined,
  };
}
