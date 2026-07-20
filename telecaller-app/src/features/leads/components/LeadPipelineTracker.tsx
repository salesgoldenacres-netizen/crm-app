import { useState } from "react";
import { Ban } from "lucide-react";
import Dialog from "@/shared/components/ui/Dialog";

export interface PipelineStage {
  id: string;
  label: string;
  matches: string[];
}

export const LEAD_PIPELINE_STAGES: PipelineStage[] = [
  { id: "raw", label: "Inbox", matches: ["raw"] },
  { id: "new", label: "New Lead", matches: ["new", "not-attempted"] },
  { id: "contacted", label: "Contacted", matches: ["contacted"] },
  { id: "interested", label: "Interested", matches: ["interested"] },
  {
    id: "site-visit",
    label: "Site Visit",
    matches: ["site-visit-confirmed", "site-visit-completed"],
  },
  { id: "booked", label: "Booked", matches: ["reserved", "booked"] },
];

interface LeadPipelineTrackerProps {
  leadName: string;
  currentStatus: string;
  onSelectStage: (targetStatus: string, label: string) => void;
  onToggleNotInterested: () => void;
}

export default function LeadPipelineTracker({
  leadName,
  currentStatus,
  onSelectStage,
  onToggleNotInterested,
}: LeadPipelineTrackerProps) {
  const [pendingStage, setPendingStage] = useState<{
    status: string;
    label: string;
  } | null>(null);

  const isTerminalNotInterested = currentStatus === "not-interested";
  const activeIndex = LEAD_PIPELINE_STAGES.findIndex((stage) =>
    stage.matches.includes(currentStatus)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="type-label font-semibold text-theme-muted uppercase tracking-wider">
          Pipeline Stage
        </h4>
        <button
          type="button"
          onClick={onToggleNotInterested}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-theme border text-[10px] font-bold transition-colors cursor-pointer ${
            isTerminalNotInterested
              ? "bg-theme-danger text-white border-theme-danger"
              : "bg-theme-card text-theme-danger border-theme-danger/30 hover:bg-theme-danger/10"
          }`}
        >
          <Ban className="w-3 h-3" aria-hidden="true" />
          Not Interested
        </button>
      </div>

      <div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {LEAD_PIPELINE_STAGES.map((stage, index) => {
            const isActive = stage.matches.includes(currentStatus);
            const isCompleted =
              !isTerminalNotInterested && activeIndex > index;

            let tone =
              "bg-theme-surface text-theme-muted border-theme-border hover:bg-theme-card";
            if (isActive) {
              tone =
                "bg-brand-gradient text-white border-transparent shadow-md shadow-[color-mix(in_srgb,var(--primary-color)_35%,transparent)] font-bold";
            } else if (isCompleted) {
              tone =
                "bg-theme-accent-muted text-theme-accent border-theme-accent/25 font-bold";
            }

            return (
              <button
                key={stage.id}
                type="button"
                title={`Move to ${stage.label}`}
                onClick={() =>
                  setPendingStage({
                    status: stage.matches[0],
                    label: stage.label,
                  })
                }
                className={`relative min-h-10 px-1.5 sm:px-2 rounded-theme border text-[10px] sm:text-[11px] text-center transition-all cursor-pointer flex items-center justify-center leading-tight ${tone}`}
              >
                {isCompleted && !isActive && (
                  <span className="absolute top-1 right-1 size-1.5 rounded-full bg-theme-accent" />
                )}
                <span className="truncate">{stage.label}</span>
              </button>
            );
          })}
        </div>

        {/* Progress rail under stages */}
        <div className="mt-3 h-1 rounded-full bg-theme-surface overflow-hidden border border-theme-border/60">
          <div
            className="h-full bg-brand-gradient transition-all duration-300"
            style={{
              width: isTerminalNotInterested
                ? "0%"
                : activeIndex < 0
                  ? "0%"
                  : `${((activeIndex + 1) / LEAD_PIPELINE_STAGES.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <Dialog
        isOpen={!!pendingStage}
        onClose={() => setPendingStage(null)}
        title="Change pipeline stage?"
        description={
          pendingStage
            ? `Change status of ${leadName} to "${pendingStage.label}"?`
            : undefined
        }
        confirmLabel="Change Stage"
        onConfirm={() => {
          if (pendingStage) {
            onSelectStage(pendingStage.status, pendingStage.label);
          }
          setPendingStage(null);
        }}
      />
    </div>
  );
}
