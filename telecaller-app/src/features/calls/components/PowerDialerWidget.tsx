import { Zap, AlertTriangle, Play, Pause, SkipForward, Power } from "lucide-react";
import { Lead, Project } from "@/shared/types";

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
    <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 border border-amber-500/25 dark:border-amber-500/35 rounded-2xl p-5 shadow-lg backdrop-blur-md animate-fadeIn flex flex-col md:flex-row items-center justify-between gap-5 transition-all duration-300">
      <div className="flex-1 w-full space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-amber-500 dark:bg-amber-600 rounded-lg text-white">
              <Zap className="w-4 h-4 fill-current text-white animate-pulse" />
            </span>
            <span className="font-extrabold text-sm text-gray-900 dark:text-white tracking-tight uppercase">
              Power Dialer Campaign
            </span>
          </div>
          <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200/50">
            {isCompleted ? "Campaign Finished 🎉" : `Dialing Lead ${currentNum} of ${totalLeads}`}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-gradient-to-r from-amber-500 to-indigo-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-gray-550 dark:text-gray-400 font-bold">
            <span>{percent}% Completed</span>
            <span>
              {powerDialerIndex} / {totalLeads} Called
            </span>
          </div>
        </div>

        {/* Active Lead Summary */}
        {!isCompleted ? (
          currentLead ? (
            <div className="p-3.5 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-white/50 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <p className="text-xs font-black text-gray-950 dark:text-white flex items-center gap-1.5">
                  {currentLead.name}
                  <span
                    className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                      currentLead.priority === "hot"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                        : currentLead.priority === "cold"
                          ? "bg-sky-105 text-sky-800 dark:bg-sky-955/40 dark:text-sky-300"
                          : "bg-indigo-100 text-indigo-800 dark:bg-indigo-955/40 dark:text-indigo-300"
                    }`}
                  >
                    {currentLead.priority}
                  </span>
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">{currentLead.phone}</p>
              </div>
              <div className="text-[10px] text-gray-400 font-bold text-right">
                <span>
                  Project Interest:{" "}
                  <strong className="text-gray-900 dark:text-white font-black">
                    {projects[currentLead.projectId || ""]?.name || "Golden Acres"}
                  </strong>
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-rose-500 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Loading next lead details...
            </p>
          )
        ) : (
          <div className="p-3 bg-emerald-500/10 dark:bg-emerald-955/20 border border-emerald-500/20 rounded-xl text-center">
            <p className="text-xs font-extrabold text-emerald-605 dark:text-emerald-400">
              Congratulations! You have completed all calls in this outreach campaign.
            </p>
          </div>
        )}
      </div>

      {/* Dialer Status / Actions Control */}
      <div className="flex flex-col items-center sm:items-end justify-center gap-3 shrink-0 w-full sm:w-auto">
        {!isCompleted && (
          <div className="flex flex-col items-center sm:items-end gap-1.5">
            {activeDialerLead ? (
              <span className="px-3.5 py-1.5 bg-indigo-600 text-white text-[11px] font-black rounded-lg shadow-sm animate-pulse flex items-center gap-1">
                📞 Call in progress...
              </span>
            ) : isCallLogModalOpen ? (
              <span className="px-3.5 py-1.5 bg-purple-600 text-white text-[11px] font-black rounded-lg shadow-sm animate-pulse flex items-center gap-1">
                📝 Log Call Notes...
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isCountdownPaused ? "bg-amber-500" : "bg-green-500 animate-ping"}`} />
                <span className="text-xs font-black text-slate-800 dark:text-white">
                  {isCountdownPaused ? "Auto-Dial Paused" : `Auto-dialing in ${powerDialerCountdown}s...`}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {!isCompleted && !activeDialerLead && !isCallLogModalOpen && (
            <>
              <button
                type="button"
                onClick={() => setIsCountdownPaused((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer border ${
                  isCountdownPaused
                    ? "bg-green-600 hover:bg-green-700 text-white border-green-500/20"
                    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                }`}
              >
                {isCountdownPaused ? (
                  <Play className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                )}
                <span>{isCountdownPaused ? "Resume" : "Pause"}</span>
              </button>
              <button
                type="button"
                onClick={handleSkipLead}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Skip Lead</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleQuitCampaign}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer border ${
              isCompleted
                ? "bg-green-600 hover:bg-green-700 text-white border-green-500/20"
                : "bg-rose-600/10 hover:bg-rose-600/20 border-rose-500/20 text-rose-500"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isCompleted ? "Close Campaign" : "Quit Campaign"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
