/**
 * Timeline highlights — read-only display.
 * Agent 2 wires via `buildTimelineContext` / preloaded events.
 * Does not call Firestore or mutate timeline.
 */

import Card from "@/shared/components/ui/Card";
import EmptyState from "@/shared/components/ui/EmptyState";

export interface TimelineHighlightItem {
  summary: string;
  timestamp?: string;
  type?: string;
}

export interface TimelineHighlightsProps {
  /** Preloaded highlight rows — Agent 2 supplies. */
  items?: TimelineHighlightItem[];
  /** Optional packed summary string from context builders. */
  summaryText?: string;
}

export default function TimelineHighlights({
  items,
  summaryText,
}: TimelineHighlightsProps) {
  const hasItems = Boolean(items && items.length > 0);
  const hasSummary = Boolean(summaryText && summaryText.trim());

  return (
    <Card
      className="shadow-none px-3 py-3 space-y-1.5"
      aria-label="Timeline highlights"
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted">
        Timeline highlights
      </h3>

      {!hasItems && !hasSummary && (
        <EmptyState
          variant="compact"
          preset="activity"
          title="No recent activity"
          description="Highlights appear when timeline events are available. Read-only; no timeline writes."
        />
      )}

      {hasSummary && (
        <p className="text-xs text-theme-text leading-relaxed whitespace-pre-wrap">
          {summaryText}
        </p>
      )}

      {hasItems && (
        <ul className="space-y-2">
          {items!.map((item, i) => (
            <li
              key={`${item.timestamp ?? ""}-${i}`}
              className="text-xs text-theme-muted leading-relaxed"
            >
              {item.type && (
                <span className="font-semibold text-theme-text capitalize mr-1">
                  {item.type.replace(/_/g, " ")}:
                </span>
              )}
              {item.summary}
              {item.timestamp && (
                <span className="block text-[10px] text-theme-muted/80 mt-0.5">
                  {item.timestamp}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
