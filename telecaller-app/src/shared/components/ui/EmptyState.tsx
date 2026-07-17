import React from "react";
import {
  FolderOpen,
  CheckSquare,
  Activity,
  Search,
  CalendarCheck,
  type LucideIcon,
} from "lucide-react";
import { twMerge } from "tailwind-merge";

/** Preset copy/icon for common dashboard empty patterns (one component, not five). */
export type EmptyStatePreset =
  | "default"
  | "leads"
  | "tasks"
  | "activity"
  | "search"
  | "bookings";

const PRESETS: Record<
  EmptyStatePreset,
  { title: string; description: string; Icon: LucideIcon }
> = {
  default: {
    title: "No data found",
    description: "There are no records matching your request at this time.",
    Icon: FolderOpen,
  },
  leads: {
    title: "No leads yet",
    description: "New leads will show up here when they are assigned.",
    Icon: FolderOpen,
  },
  tasks: {
    title: "No tasks yet",
    description: "Add a task to keep today’s priorities in view.",
    Icon: CheckSquare,
  },
  activity: {
    title: "No recent activity",
    description: "Calls and updates will appear here as you work.",
    Icon: Activity,
  },
  search: {
    title: "No matches",
    description: "Try a different search or clear filters.",
    Icon: Search,
  },
  bookings: {
    title: "No bookings yet",
    description: "Booked site visits will show up here.",
    Icon: CalendarCheck,
  },
};

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  /**
   * `default` — page/panel empty (larger padding).
   * `compact` — dashboard widget bodies (~280px tiles).
   */
  variant?: "default" | "compact";
  /** Optional semantic preset; overridden by title/description/icon props. */
  preset?: EmptyStatePreset;
  /** Compact: hide the icon circle for denser tiles */
  hideIcon?: boolean;
}

export default function EmptyState({
  title,
  description,
  icon,
  action,
  variant = "default",
  preset = "default",
  hideIcon = false,
  className,
  ...props
}: EmptyStateProps) {
  const resolved = PRESETS[preset] ?? PRESETS.default;
  const Icon = resolved.Icon;
  const resolvedTitle = title ?? resolved.title;
  const resolvedDescription = description ?? resolved.description;
  const isCompact = variant === "compact";

  return (
    <div
      className={twMerge(
        "flex flex-col items-center justify-center text-center w-full mx-auto space-y-2",
        "bg-theme-card border border-theme-border rounded-theme text-theme-text",
        isCompact
          ? "p-3 max-w-none shadow-none space-y-1.5 border-dashed bg-theme-surface/40"
          : "p-8 max-w-lg shadow-elevation-sm space-y-4",
        className
      )}
      {...props}
    >
      {!hideIcon && (
        <div
          className={twMerge(
            "bg-theme-surface text-theme-muted rounded-full",
            isCompact ? "p-1.5" : "p-3"
          )}
        >
          {icon || (
            <Icon className={isCompact ? "w-4 h-4" : "w-8 h-8"} aria-hidden />
          )}
        </div>
      )}
      <div className={isCompact ? "space-y-0.5" : "space-y-1"}>
        <h3
          className={twMerge(
            "text-theme-text",
            isCompact
              ? "text-[11px] font-semibold"
              : "text-sm sm:text-base font-semibold"
          )}
        >
          {resolvedTitle}
        </h3>
        <p
          className={twMerge(
            "text-theme-muted max-w-sm",
            isCompact ? "text-[10px] leading-snug" : "text-[11px] sm:text-xs"
          )}
        >
          {resolvedDescription}
        </p>
      </div>
      {action && <div className={isCompact ? "pt-1" : "pt-2"}>{action}</div>}
    </div>
  );
}

/** Convenience: compact empty for call-log / activity widgets */
export function EmptyStateCompact(props: Omit<EmptyStateProps, "variant">) {
  return <EmptyState variant="compact" {...props} />;
}
