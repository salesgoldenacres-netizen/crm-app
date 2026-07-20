import { Zap, AlertTriangle, Play, Pause, SkipForward, Power, Phone, FileText } from "lucide-react";
import { Lead, Project } from "@/shared/types";
import Badge from "@/shared/components/ui/Badge";

interface PowerDialerWidgetProps {
  isPowerDialerActive: boolean;
  powerDialerQueue: string[];
  powerDialerIndex: number;
  powerDialerCountdown: number;
  isCountdownPaused: boolean;
  setIsCountdownPaused: React.Dispatch<React.SetStateAction<boolean>>;
  handleSkipLead: () => void;
  handleQuitCampaign: () => void;
  activeDialerLead: Lead | null;
  isCallLogModalOpen: boolean;
  leads: Lead[];
  projects: Record<string, Project>;
}

const ctrlBtn =
  "inline-flex items-center justify-center gap-1.5 min-h-11 min-w-11 px-3 py-2 " +
  "rounded-theme text-xs font-semibold transition-colors cursor-pointer border " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";

export default function PowerDialerWidget({
  isPowerDialerActive,
  powerDialerQueue,
  powerDialerIndex,
  powerDialerCountdown,
  isCountdownPaused,
  setIsCountdownPaused,
  handleSkipLead,
  handleQuitCampaign,
  activeDialerLead,
  isCallLogModalOpen,
  leads,
  projects,
}: PowerDialerWidgetProps) {
  if (!isPowerDialerActive || powerDialerQueue.length === 0) return null;

  const totalLeads = powerDialerQueue.length;
  const isCompleted = powerDialerIndex >= totalLeads;
  const currentNum = Math.min(powerDialerIndex + 1, totalLeads);
  const percent = Math.round((Math.min(powerDialerIndex, totalLeads) / totalLeads) * 100);
  const currentLeadId = !isCompleted ? powerDialerQueue[powerDialerIndex] : null;
  const currentLead = currentLeadId ? leads.find((l) => l.id === currentLeadId) : null;

  return (
    <div className="w-full max-w-full min-w-0 rounded-theme border border-theme-border bg-theme-card p-4 sm:p-5 shadow-elevation-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 transition-colors">
      <div className="flex-1 min-w-0 w-full space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-2 bg-theme-warning/15 text-theme-warning rounded-theme shrink-0">
              <Zap className="w-4 h-4" aria-hidden />
            </span>
            <span className="font-semibold text-sm text-theme-text tracking-tight truncate">
              Power Dialer Campaign
            </span>
          </div>
          <Badge variant={isCompleted ? "success" : "warning"}>
            {isCompleted ? "Campaign Finished" : `Dialing Lead ${currentNum} of ${totalLeads}`}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div
            className="w-full bg-theme-surface h-2 rounded-theme overflow-hidden"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Campaign progress"
          >
            <div
              className="bg-theme-accent h-full transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-theme-muted font-semibold tabular-nums">
            <span>{percent}% Completed</span>
            <span>
              {powerDialerIndex} / {totalLeads} Called
            </span>
          </div>
        </div>

        {!isCompleted ? (
          currentLead ? (
            <div className="p-3 bg-theme-surface rounded-theme border border-theme-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-semibold text-theme-text flex flex-wrap items-center gap-1.5">
                  <span className="truncate">{currentLead.name}</span>
                  <Badge
                    variant={
                      currentLead.priority === "hot"
                        ? "warning"
                        : currentLead.priority === "cold"
                          ? "info"
                          : "default"
                    }
                  >
                    {currentLead.priority || "warm"}
                  </Badge>
                </p>
                <p className="text-[10px] text-theme-muted font-semibold tabular-nums">
                  {currentLead.phone}
                </p>
              </div>
              <div className="text-[10px] text-theme-muted font-semibold sm:text-right shrink-0">
                Project:{" "}
                <strong className="text-theme-text font-semibold">
                  {projects[currentLead.projectId || ""]?.name || "Golden Acres"}
                </strong>
              </div>
            </div>
          ) : (
            <p
              className="text-xs text-theme-warning font-semibold flex items-center gap-1"
              role="status"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
              Loading next lead details...
            </p>
          )
        ) : (
          <div className="p-3 bg-theme-success/10 border border-theme-success/25 rounded-theme text-center">
            <p className="text-xs font-semibold text-theme-success">
              Congratulations! You have completed all calls in this outreach campaign.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-stretch sm:items-end justify-center gap-3 shrink-0 w-full md:w-auto min-w-0">
        {!isCompleted && (
          <div
            className="flex flex-col items-center sm:items-end gap-1.5"
            role="status"
            aria-live="polite"
          >
            {activeDialerLead ? (
              <span className="inline-flex items-center gap-1.5 px-3 min-h-11 rounded-theme bg-theme-accent text-theme-accent-fg text-[11px] font-semibold">
                <Phone className="w-3.5 h-3.5" aria-hidden />
                Call in progress...
              </span>
            ) : isCallLogModalOpen ? (
              <span className="inline-flex items-center gap-1.5 px-3 min-h-11 rounded-theme bg-theme-surface text-theme-text border border-theme-border text-[11px] font-semibold">
                <FileText className="w-3.5 h-3.5" aria-hidden />
                Log Call Notes...
              </span>
            ) : (
              <div className="flex items-center gap-2 min-h-11">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isCountdownPaused ? "bg-theme-warning" : "bg-theme-success"
                  }`}
                  aria-hidden
                />
                <span className="text-xs font-semibold text-theme-text tabular-nums">
                  {isCountdownPaused
                    ? "Auto-Dial Paused"
                    : `Auto-dialing in ${powerDialerCountdown}s...`}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full">
          {!isCompleted && !activeDialerLead && !isCallLogModalOpen && (
            <>
              <button
                type="button"
                onClick={() => setIsCountdownPaused((prev) => !prev)}
                aria-pressed={isCountdownPaused}
                className={`${ctrlBtn} ${
                  isCountdownPaused
                    ? "bg-theme-success text-white border-transparent hover:opacity-90"
                    : "bg-theme-card text-theme-text border-theme-border hover:bg-theme-surface"
                }`}
              >
                {isCountdownPaused ? (
                  <Play className="w-3.5 h-3.5 fill-current" aria-hidden />
                ) : (
                  <Pause className="w-3.5 h-3.5 fill-current" aria-hidden />
                )}
                <span>{isCountdownPaused ? "Resume" : "Pause"}</span>
              </button>
              <button
                type="button"
                onClick={handleSkipLead}
                className={`${ctrlBtn} bg-theme-card text-theme-text border-theme-border hover:bg-theme-surface`}
              >
                <SkipForward className="w-3.5 h-3.5" aria-hidden />
                <span>Skip Lead</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleQuitCampaign}
            className={`${ctrlBtn} ${
              isCompleted
                ? "bg-theme-success text-white border-transparent hover:opacity-90"
                : "bg-theme-danger/10 hover:bg-theme-danger/20 border-theme-danger/25 text-theme-danger"
            }`}
          >
            <Power className="w-3.5 h-3.5" aria-hidden />
            <span>{isCompleted ? "Close Campaign" : "Quit Campaign"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
