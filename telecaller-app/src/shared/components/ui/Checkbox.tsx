import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  FIELD_ERROR_CLASS,
  FIELD_HELPER_CLASS,
  useFormFieldIds,
} from "./formField";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  /** Muted hint under the control. Hidden when `error` is set. */
  helperText?: string;
  wrapperClassName?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    { label, error, helperText, className, wrapperClassName, id, ...props },
    ref
  ) => {
    const { fieldId, errorId, helperId, describedBy } = useFormFieldIds(id, {
      error,
      helperText,
    });

    return (
      <div className={twMerge(clsx("flex flex-col space-y-1 w-full", wrapperClassName))}>
        <div className="flex items-center space-x-2.5">
          <input
            id={fieldId}
            type="checkbox"
            ref={ref}
            className={twMerge(
              clsx(
                "h-4 w-4 rounded-theme border-theme-border text-theme-accent cursor-pointer transition-colors",
                "bg-theme-surface",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring focus-visible:ring-offset-0",
                error ? "border-theme-danger focus-visible:ring-theme-danger" : ""
              ),
              className
            )}
            {...props}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
          />
          {label && (
            <label
              htmlFor={fieldId}
              className="text-xs sm:text-sm font-semibold text-theme-text select-none cursor-pointer"
            >
              {label}
            </label>
          )}
        </div>
        {error ? (
          <span id={errorId} className={FIELD_ERROR_CLASS} role="alert">
            {error}
          </span>
        ) : helperText ? (
          <span id={helperId} className={FIELD_HELPER_CLASS}>
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
