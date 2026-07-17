import Dialog from "@/shared/components/ui/Dialog";
import type { Lead } from "@/shared/types";
import type { AiActionProposal } from "@/shared/ai";
import {
  buildProposalRenderModel,
} from "./ProposalRenderer";

export interface ConfirmActionDialogProps {
  isOpen: boolean;
  proposal: AiActionProposal | null;
  lead: Lead;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  resolveAssigneeName?: (userId: string) => string | undefined;
}

export default function ConfirmActionDialog({
  isOpen,
  proposal,
  lead,
  isLoading = false,
  onClose,
  onConfirm,
  resolveAssigneeName,
}: ConfirmActionDialogProps) {
  const model = proposal
    ? buildProposalRenderModel(proposal, lead, resolveAssigneeName)
    : null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={model ? `Confirm ${model.title.toLowerCase()}` : "Confirm action"}
      description="Review the proposed change carefully. Nothing is written unless you confirm."
      confirmLabel="Confirm"
      cancelLabel="Cancel"
      confirmVariant="primary"
      onConfirm={proposal && model ? onConfirm : undefined}
      isLoading={isLoading}
    >
      {model && (
        <div className="space-y-3">
          <div className="rounded-theme border border-theme-border bg-theme-surface px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-theme-muted">
              Proposed action
            </p>
            <p className="text-sm font-semibold text-theme-text mt-1">
              {model.title}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-theme border border-theme-border bg-theme-surface px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-theme-muted">
                Current value
              </p>
              <p className="text-xs text-theme-text mt-1 break-words">
                {model.currentValue}
              </p>
            </div>
            <div className="rounded-theme border border-theme-border bg-theme-surface px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-theme-muted">
                New value
              </p>
              <p className="text-xs text-theme-text mt-1 break-words">
                {model.newValue}
              </p>
            </div>
          </div>

          <div className="rounded-theme border border-theme-border bg-theme-surface px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-theme-muted">
              Reason
            </p>
            <p className="text-xs text-theme-text mt-1 break-words">
              {model.reason}
            </p>
          </div>

          {model.confidenceLabel && (
            <div className="rounded-theme border border-theme-border bg-theme-surface px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-theme-muted">
                AI confidence
              </p>
              <p className="text-xs text-theme-text mt-1">
                {model.confidenceLabel}
              </p>
            </div>
          )}

          <div className="rounded-theme border border-theme-border bg-theme-surface px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-theme-muted">
              Impact summary
            </p>
            <p className="text-xs text-theme-text mt-1 break-words">
              {model.impactSummary}
            </p>
          </div>
        </div>
      )}
    </Dialog>
  );
}
