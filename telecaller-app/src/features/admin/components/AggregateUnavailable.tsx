import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";

/**
 * Tier 2 aggregate placeholder — never compute from an empty global leads store.
 */
export default function AggregateUnavailable({
  title = "Aggregate unavailable",
  detail = "Company-wide lead math requires summary reports, not the in-memory lead store.",
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className="rounded-theme border border-theme-border bg-theme-card p-6 text-center space-y-2">
      <div className="inline-flex items-center justify-center w-9 h-9 rounded-theme bg-theme-surface text-theme-muted">
        <BarChart3 className="w-4 h-4" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-theme-text">{title}</p>
      <p className="text-xs text-theme-muted max-w-md mx-auto">{detail}</p>
      <Link
        to="/admin?tab=analytics"
        className="inline-flex text-xs font-bold text-theme-accent hover:opacity-80"
      >
        See Reports
      </Link>
    </div>
  );
}
