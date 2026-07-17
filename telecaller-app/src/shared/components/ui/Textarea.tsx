import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  FIELD_CONTROL_CLASS,
  FIELD_CONTROL_ERROR_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_HELPER_CLASS,
  FIELD_LABEL_CLASS,
  useFormFieldIds,
} from "./formField";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  /** Muted hint under the field. Hidden when `error` is set. */
  helperText?: string;
  wrapperClassName?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      className,
      wrapperClassName,
      id,
      rows = 3,
      required,
      ...props
    },
    ref
  ) => {
    const { fieldId, errorId, helperId, describedBy } = useFormFieldIds(id, {
      error,
      helperText,
    });

    return (
      <div className={twMerge(clsx("flex flex-col space-y-1.5 w-full", wrapperClassName))}>
        {label && (
          <label htmlFor={fieldId} className={FIELD_LABEL_CLASS}>
            {label}
            {required && (
              <span className="text-theme-danger ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <textarea
          id={fieldId}
          ref={ref}
          rows={rows}
          required={required}
          className={twMerge(
            clsx(
              FIELD_CONTROL_CLASS,
              "resize-none",
              error && FIELD_CONTROL_ERROR_CLASS
            ),
            className
          )}
          {...props}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
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

Textarea.displayName = "Textarea";

export default Textarea;
