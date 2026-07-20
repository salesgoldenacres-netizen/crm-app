/**
 * Returns Tailwind css classes for badge styling based on lead status.
 * Uses DLS semantic tokens (no raw purple/blue islands).
 */
export function getLeadStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case "new":
      return "bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800";
    case "contacted":
      return "bg-theme-warning/10 text-theme-warning border-theme-warning/20";
    case "interested":
      return "bg-theme-success/10 text-theme-success border-theme-success/20";
    case "not_interested":
    case "not-interested":
      return "bg-theme-danger/10 text-theme-danger border-theme-danger/20";
    case "booked":
    case "reserved":
      return "bg-theme-accent-muted text-theme-accent border-theme-border";
    case "raw":
      return "bg-theme-surface text-theme-muted border-theme-border";
    default:
      return "bg-theme-surface text-theme-text border-theme-border";
  }
}

/** Shared Badge variant mapping for lead status chips. */
export function getLeadStatusBadgeVariant(
  status: string
): "default" | "primary" | "success" | "warning" | "danger" | "info" {
  switch (status?.toLowerCase()) {
    case "new":
      return "info";
    case "contacted":
    case "interested":
    case "sitevisit-confirmed":
    case "site-visit-confirmed":
      return "warning";
    case "sitevisit-completed":
    case "site-visit-completed":
    case "booked":
    case "reserved":
      return "success";
    case "not_interested":
    case "not-interested":
      return "danger";
    case "raw":
      return "default";
    default:
      return "primary";
  }
}
