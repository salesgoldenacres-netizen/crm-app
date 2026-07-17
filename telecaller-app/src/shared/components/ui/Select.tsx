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

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  /** Muted hint under the field. Hidden when `error` is set. */
  helperText?: string;
  options?: SelectOption[];
  wrapperClassName?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options = [],
      children,
      className,
      wrapperClassName,
      id,
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
        <select
          id={fieldId}
          ref={ref}
          required={required}
          className={twMerge(
            clsx(
              FIELD_CONTROL_CLASS,
              "cursor-pointer appearance-none bg-no-repeat bg-[right_0.75rem_center] pr-8",
              error && FIELD_CONTROL_ERROR_CLASS
            ),
            className
          )}
          {...props}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          {children}
        </select>
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

Select.displayName = "Select";

export default Select;
