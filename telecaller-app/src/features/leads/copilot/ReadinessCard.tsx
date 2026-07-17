/**
 * Booking readiness panel — display only.
 * Agent 2 wires from `pBook-v1` + explainable gaps (no new score formula).
 */

import Card from "@/shared/components/ui/Card";
import EmptyState from "@/shared/components/ui/EmptyState";
import Badge from "@/shared/components/ui/Badge";

export interface ReadinessCardProps {
  /** 0–1 booking prior from Wave 6 intelligence. */
  bookingProbability?: number;
  /** Human-readable gap checklist (Agent 2). */
  gaps?: string[];
  /** Optional band label (e.g. low / medium / high). */
  band?: string;
}

export default function ReadinessCard({
  bookingProbability,
  gaps,
  band,
}: ReadinessCardProps) {
  const hasData =
    bookingProbability != null ||
    Boolean(band) ||
    (gaps && gaps.length > 0);

  return (
    <Card
      className="shadow-none px-3 py-3 space-y-1.5"
      aria-label="Booking readiness"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted">
          Booking readiness
        </h3>
        {hasData && band && (
          <Badge
            variant={
              band === "high"
                ? "success"
                : band === "medium"
                  ? "warning"
                  : "default"
            }
          >
            {band}
          </Badge>
        )}
      </div>

      {!hasData && (
        <EmptyState
          variant="compact"
          title="Readiness unavailable"
          description="Needs Wave 6 pBook-v1 prior from lead intelligence. No parallel probability model."
        />
      )}

      {hasData && (
        <>
          <p className="text-sm font-semibold text-theme-text tabular-nums">
            {bookingProbability != null
              ? `${Math.round(bookingProbability * 100)}%`
              : "—"}
          </p>
          {gaps && gaps.length > 0 && (
            <ul className="list-disc pl-4 space-y-0.5">
              {gaps.map((gap, i) => (
                <li key={i} className="text-xs text-theme-muted">
                  {gap}
                </li>
              ))}
            </ul>
          )}
          {gaps && gaps.length === 0 && bookingProbability != null && (
            <p className="text-xs text-theme-muted leading-relaxed">
              No readiness gaps flagged for this lead.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
