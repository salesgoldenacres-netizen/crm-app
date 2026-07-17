import Badge from "@/shared/components/ui/Badge";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import type { Lead } from "@/shared/types";
import {
  AI_ACTION_TYPES,
  type AiActionProposal,
} from "@/shared/ai";

export interface ProposalRenderModel {
  title: string;
  currentValue: string;
  newValue: string;
  reason: string;
  impactSummary: string;
  confidenceLabel?: string;
}

export interface ProposalRendererProps {
  proposal: AiActionProposal;
  lead: Lead;
  disabled?: boolean;
  onReview?: (proposal: AiActionProposal) => void;
  resolveAssigneeName?: (userId: string) => string | undefined;
}

export function buildProposalRenderModel(
  proposal: AiActionProposal,
  lead: Lead,
  resolveAssigneeName?: (userId: string) => string | undefined,
): ProposalRenderModel | null {
  switch (proposal.type) {
    case AI_ACTION_TYPES.STATUS_CHANGE:
      return {
        title: "Status change",
        currentValue: lead.status || "new",
        newValue: proposal.payload.toStatus,
        reason:
          proposal.payload.rationale ||
          proposal.rationale ||
          "AI recommends updating the lead status.",
        impactSummary:
          proposal.impactSummary ||
          proposal.summary ||
          `Moves this lead from ${lead.status || "new"} to ${proposal.payload.toStatus}.`,
        confidenceLabel: toConfidenceLabel(proposal.confidence),
      };

    case AI_ACTION_TYPES.PRIORITY_CHANGE:
      return {
        title: "Priority change",
        currentValue: String(lead.priority || "warm"),
        newValue: proposal.payload.toPriority,
        reason:
          proposal.payload.rationale ||
          proposal.rationale ||
          "AI recommends adjusting the manual lead priority.",
        impactSummary:
          proposal.impactSummary ||
          proposal.summary ||
          `Sets the manual priority to ${proposal.payload.toPriority}.`,
        confidenceLabel: toConfidenceLabel(proposal.confidence),
      };

    case AI_ACTION_TYPES.FOLLOW_UP:
      return {
        title: "Follow-up update",
        currentValue: lead.followUpDate || lead.followUpOn || "Not set",
        newValue: proposal.payload.followUpTime
          ? `${proposal.payload.followUpDate} ${proposal.payload.followUpTime}`
          : proposal.payload.followUpDate,
        reason:
          proposal.payload.rationale ||
          proposal.rationale ||
          "AI recommends updating the next follow-up date.",
        impactSummary:
          proposal.impactSummary ||
          proposal.summary ||
          `Sets the next follow-up date to ${proposal.payload.followUpDate}.`,
        confidenceLabel: toConfidenceLabel(proposal.confidence),
      };

    case AI_ACTION_TYPES.ADD_NOTE:
      return {
        title: "Add note",
        currentValue: "Timeline note only",
        newValue: proposal.payload.noteText,
        reason:
          proposal.rationale ||
          "AI recommends saving this note to the lead timeline.",
        impactSummary:
          proposal.impactSummary ||
          proposal.summary ||
          "Appends a note via the existing call log / timeline note path.",
        confidenceLabel: toConfidenceLabel(proposal.confidence),
      };

    case AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT: {
      const currentAssignee = lead.assignedToName || "Unassigned";
      const nextAssignee =
        proposal.payload.assignedToName ||
        resolveAssigneeName?.(proposal.payload.assignedTo) ||
        proposal.payload.assignedTo;
      return {
        title: "Assignment change",
        currentValue: currentAssignee,
        newValue: nextAssignee,
        reason:
          proposal.payload.rationale ||
          proposal.rationale ||
          "AI recommends reassigning this lead.",
        impactSummary:
          proposal.impactSummary ||
          proposal.summary ||
          `Reassigns the lead to ${nextAssignee}.`,
        confidenceLabel: toConfidenceLabel(proposal.confidence),
      };
    }

    default:
      return null;
  }
}

export default function ProposalRenderer({
  proposal,
  lead,
  disabled = false,
  onReview,
  resolveAssigneeName,
}: ProposalRendererProps) {
  const model = buildProposalRenderModel(
    proposal,
    lead,
    resolveAssigneeName,
  );
  if (!model) return null;

  return (
    <Card className="shadow-none px-3 py-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-xs font-semibold text-theme-text">
            {model.title}
          </h4>
          <p className="text-[11px] text-theme-muted mt-1">
            {model.impactSummary}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <Badge variant="warning">Review required</Badge>
          {model.confidenceLabel && (
            <Badge variant="default">{model.confidenceLabel}</Badge>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-theme border border-theme-border bg-theme-surface px-2.5 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-theme-muted">
            Current value
          </dt>
          <dd className="text-xs text-theme-text mt-1 break-words">
            {model.currentValue}
          </dd>
        </div>
        <div className="rounded-theme border border-theme-border bg-theme-surface px-2.5 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-theme-muted">
            New value
          </dt>
          <dd className="text-xs text-theme-text mt-1 break-words">
            {model.newValue}
          </dd>
        </div>
      </dl>

      <div className="rounded-theme border border-theme-border bg-theme-surface px-2.5 py-2">
        <p className="text-[10px] uppercase tracking-wider text-theme-muted">
          Reason
        </p>
        <p className="text-xs text-theme-text mt-1 break-words">
          {model.reason}
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onReview?.(proposal)}
        >
          Review action
        </Button>
      </div>
    </Card>
  );
}

function toConfidenceLabel(confidence: number | undefined): string | undefined {
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) {
    return undefined;
  }
  return `Confidence ${Math.round(confidence * 100)}%`;
}
