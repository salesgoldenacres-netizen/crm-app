/**
 * Next Best Action panel — display only.
 * Agent 2 wires from frozen `next-action-v1` / Wave 6 intelligence.
 * Do not invent a parallel decision table here.
 */

import Card from "@/shared/components/ui/Card";
import EmptyState from "@/shared/components/ui/EmptyState";
import Badge from "@/shared/components/ui/Badge";

export interface NextActionCardProps {
  /** From `LeadNextAction.type` — Agent 2 supplies. */
  type?: string;
  /** From `LeadNextAction.reason` — show verbatim. */
  reason?: string;
  /** Optional channel (call / whatsapp / …). */
  channel?: string;
}

export default function NextActionCard({
  type,
  reason,
  channel,
}: NextActionCardProps) {
  const hasData = Boolean(type || reason);

  return (
    <Card
      className="shadow-none px-3 py-3 space-y-1.5"
      aria-label="Next best action"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted">
          Next best action
        </h3>
        {hasData && channel && (
          <Badge variant="primary">{channel}</Badge>
        )}
      </div>

      {!hasData && (
        <EmptyState
          variant="compact"
          title="No next action"
          description="Open Copilot from a loaded lead so Wave 6 next-action-v1 can populate this card. Recommend-only; no write CTAs."
        />
      )}

      {hasData && (
        <>
          <p className="text-sm font-semibold text-theme-text capitalize">
            {(type || "—").replace(/_/g, " ")}
          </p>
          {reason && (
            <p className="text-xs text-theme-muted leading-relaxed">{reason}</p>
          )}
        </>
      )}
    </Card>
  );
}
