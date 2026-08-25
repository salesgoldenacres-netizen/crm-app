import React, { forwardRef, useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Eye, EyeOff } from "lucide-react";
import {
  FIELD_CONTROL_CLASS,
  FIELD_CONTROL_ERROR_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_HELPER_CLASS,
  FIELD_LABEL_CLASS,
  useFormFieldIds,
} from "./formField";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Muted hint under the field. Hidden when `error` is set. */
  helperText?: string;
  wrapperClassName?: string;
  /** Force enable or disable password hide/unhide toggle for type="password" */
  togglePassword?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      className,
      type = "text",
      wrapperClassName,
      id,
      required,
      togglePassword,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const { fieldId, errorId, helperId, describedBy } = useFormFieldIds(id, {
      error,
      helperText,
    });

    const isPasswordType = type === "password";
    const isToggleEnabled = togglePassword ?? isPasswordType;
    const actualType = isPasswordType && isToggleEnabled && showPassword ? "text" : type;

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
        <div className="relative w-full">
          <input
            id={fieldId}
            type={actualType}
            ref={ref}
            required={required}
            disabled={disabled}
            className={twMerge(
              clsx(
                FIELD_CONTROL_CLASS,
                error && FIELD_CONTROL_ERROR_CLASS,
                isPasswordType && isToggleEnabled && "pr-10"
              ),
              className
            )}
            {...props}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
          />
          {isPasswordType && isToggleEnabled && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={disabled}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-theme-muted hover:text-theme transition-colors cursor-pointer focus:outline-none disabled:opacity-50"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
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

Input.displayName = "Input";

export default Input;
