import React from "react";
import { AlertCircle } from "lucide-react";
import { twMerge } from "tailwind-merge";
import Button from "./Button";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  error?: Error | null;
  onRetry?: () => void;
  retryLabel?: string;
}

export default function ErrorState({
  title = "An error occurred",
  description = "We encountered an issue retrieving your data. Please check your connection or try again.",
  error,
  onRetry,
  retryLabel = "Retry Operation",
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={twMerge(
        "flex flex-col items-center justify-center p-8 text-center bg-theme-card border border-theme-border rounded-theme w-full max-w-lg mx-auto shadow-sm space-y-4",
        className
      )}
      {...props}
    >
      <div className="p-3 bg-theme-danger/10 text-theme-danger rounded-theme">
        <AlertCircle className="w-8 h-8" aria-hidden />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm sm:text-base font-semibold text-theme-text">
          {title}
        </h3>
        <p className="text-[11px] sm:text-xs text-theme-muted max-w-sm">
          {error?.message || description}
        </p>
      </div>
      {onRetry && (
        <div className="pt-2">
          <Button variant="danger" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
