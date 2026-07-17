import React from "react";
import { twMerge } from "tailwind-merge";

export type WidgetHeaderDensity = "compact" | "comfortable";

export interface WidgetHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Lucide icon or other presentational node */
  icon?: React.ReactNode;
  title: React.ReactNode;
  /** Optional trailing actions (menus, links) */
  actions?: React.ReactNode;
  density?: WidgetHeaderDensity;
  /** Extra classes for the title row (weight/color overrides) */
  titleClassName?: string;
}

/**
 * Shared widget chrome header — icon + title + optional actions.
 * Matches the Wave 1 Widget Contract. Phase 3 adopts across widget interiors.
 */
export function WidgetHeader({
  icon,
  title,
  actions,
  density = "comfortable",
  titleClassName,
  className,
  children,
  ...props
}: WidgetHeaderProps) {
  return (
    <div
      className={twMerge(
        "widget-header flex items-center justify-between border-b border-theme-border select-none",
        density === "compact" ? "px-4 py-2" : "px-5 py-3",
        className
      )}
      {...props}
    >
      <h3
        className={twMerge(
          "type-card-title flex items-center min-w-0 text-theme-text",
          density === "compact" ? "text-xs" : "text-sm",
          titleClassName
        )}
      >
        {icon ? (
          <span className="mr-2 inline-flex shrink-0 items-center justify-center [&_svg]:w-4 [&_svg]:h-4">
            {icon}
          </span>
        ) : null}
        <span className="truncate">{title}</span>
      </h3>
      {actions ? (
        <div className="flex items-center gap-1.5 shrink-0 ml-2">{actions}</div>
      ) : null}
      {children}
    </div>
  );
}

export default WidgetHeader;
