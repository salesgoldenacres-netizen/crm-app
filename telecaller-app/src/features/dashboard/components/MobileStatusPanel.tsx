import { useState } from "react";
import { Clock, ChevronRight, Zap, Lightbulb, X } from "lucide-react";
import { safeFormatTime } from "@/shared/utils/dateUtils";
import { User, AttendanceRecord } from "@/shared/types";
import Dialog from "@/shared/components/ui/Dialog";
import {
  DashboardBreakDuration,
  DashboardShiftDuration,
} from "@/features/dashboard/components/DashboardTimerDisplay";

interface MobileStatusPanelProps {
  user: User;
  todayAttendance: AttendanceRecord | null | undefined;
  myAgentStatus: string;
  showAnnouncement: boolean;
  setShowAnnouncement: (val: boolean) => void;
  announcementText: string;
  coachingTip: string | undefined;
  isAgentPanelExpanded: boolean;
  setIsAgentPanelExpanded: (expanded: boolean) => void;
  startBreak: (username: string, type: string) => Promise<void>;
  endBreak: (username: string) => Promise<void>;
  clockOut: (username: string) => Promise<void>;
  updateAgentStatus: (userId: string, status: string, username: string) => Promise<void>;
}

export default function MobileStatusPanel({
  user,
  todayAttendance,
  myAgentStatus,
  showAnnouncement,
  setShowAnnouncement,
  announcementText,
  coachingTip,
  isAgentPanelExpanded,
  setIsAgentPanelExpanded,
  startBreak,
  endBreak,
  clockOut,
  updateAgentStatus,
}: MobileStatusPanelProps) {
  const [clockOutConfirmOpen, setClockOutConfirmOpen] = useState(false);

  if (!todayAttendance) return null;

  return (
    <div className="block md:hidden border-b border-theme-border bg-theme-card/95 backdrop-blur-md transition-all">
      <button
        type="button"
        onClick={() => setIsAgentPanelExpanded(!isAgentPanelExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-theme-text active:bg-theme-surface cursor-pointer border-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring focus-visible:ring-inset"
        aria-expanded={isAgentPanelExpanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-3.5 h-3.5 text-theme-accent shrink-0" aria-hidden />
          <span className="tabular-nums">
            Shift: <DashboardShiftDuration />
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              todayAttendance.checkOut ? "bg-theme-muted" : "bg-theme-success"
            }`}
            aria-hidden
          />
          <span className="text-[10px] text-theme-muted uppercase truncate">
            (
            {myAgentStatus === "working_from_home"
              ? "WFH"
              : myAgentStatus === "on-call"
                ? "On Call"
                : myAgentStatus === "out_of_office"
                  ? "Out Office"
                  : myAgentStatus === "family_time"
                    ? "Family"
                    : myAgentStatus}
            )
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {((showAnnouncement && announcementText) || coachingTip) && (
            <span className="bg-theme-accent-muted text-theme-accent border border-theme-accent/25 px-1.5 py-0.5 rounded-theme text-[9px] font-bold uppercase">
              {(showAnnouncement && announcementText ? 1 : 0) + (coachingTip ? 1 : 0)} alerts
            </span>
          )}
          <ChevronRight
            className={`w-3.5 h-3.5 text-theme-muted transition-transform ${
              isAgentPanelExpanded ? "rotate-90" : ""
            }`}
          />
        </div>
      </button>

      {isAgentPanelExpanded && (
        <div className="px-3 pb-3 pt-1.5 space-y-2.5 border-t border-theme-border text-[11px] text-theme-text animate-fadeIn">
          <div className="space-y-2 bg-theme-surface p-3 rounded-theme border border-theme-border">
            <div className="flex justify-between items-center">
              <span className="text-theme-muted font-bold uppercase tracking-wider text-[9px]">
                Shift started
              </span>
              <span className="font-bold text-theme-text tabular-nums">
                {safeFormatTime(todayAttendance.checkIn, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-theme-muted font-bold uppercase tracking-wider text-[9px]">
                Break duration
              </span>
              <span className="font-bold text-theme-text tabular-nums">
                <DashboardBreakDuration />
              </span>
            </div>

            <div className="flex justify-between items-center gap-2 pt-2 border-t border-theme-border">
              <span className="text-theme-muted font-bold uppercase tracking-wider text-[9px] shrink-0">
                Status
              </span>
              <select
                value={myAgentStatus}
                onChange={async (e) => {
                  const status = e.target.value;
                  if (status === "break") {
                    await startBreak(user.username, "break");
                  } else if (status === "lunch") {
                    await startBreak(user.username, "lunch");
                  } else if (status === "offline") {
                    setClockOutConfirmOpen(true);
                  } else {
                    const hasActiveBreak = (todayAttendance?.breaks || []).some(
                      (b) => b.end === null
                    );
                    if (hasActiveBreak) {
                      await endBreak(user.username);
                    }
                    await updateAgentStatus(user.id, status, user.username);
                  }
                }}
                className="bg-theme-card border border-theme-border rounded-lg px-2 py-1 text-[11px] font-bold text-theme-text focus:outline-none focus:ring-1 focus:ring-theme-ring cursor-pointer"
              >
                <option value="available">Available</option>
                <option value="working_from_home">WFH</option>
                <option value="on-call">On Call</option>
                <option value="away">Away</option>
                <option value="break">On Break</option>
                <option value="lunch">Lunch</option>
                <option value="out_sick">Out Sick</option>
                <option value="out_of_office">Out Office</option>
                <option value="family_time">Family</option>
                <option value="offline">Offline / Clock Out</option>
              </select>
            </div>
          </div>

          {showAnnouncement && announcementText && (
            <div className="bg-theme-accent-muted border border-theme-accent/25 p-2.5 rounded-theme flex items-start justify-between gap-2">
              <div className="flex items-start min-w-0">
                <Zap className="w-3.5 h-3.5 mr-2 text-theme-accent shrink-0 mt-0.5" aria-hidden />
                <p className="text-[11px] leading-relaxed text-theme-text">{announcementText}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAnnouncement(false)}
                className="text-theme-muted hover:text-theme-text cursor-pointer border-0 bg-transparent p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
                title="Dismiss"
                aria-label="Dismiss announcement"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {coachingTip && (
            <div className="bg-theme-warning/10 border border-theme-warning/25 p-2.5 rounded-theme flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-theme-warning shrink-0 mt-0.5" />
              <div>
                <span className="text-[9px] font-bold text-theme-warning uppercase block mb-0.5">
                  Coach tip
                </span>
                <p className="text-[11px] leading-relaxed text-theme-text">
                  &ldquo;{coachingTip}&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog
        isOpen={clockOutConfirmOpen}
        onClose={() => setClockOutConfirmOpen(false)}
        title="Clock out?"
        description="Are you sure you want to Clock Out for the day?"
        confirmLabel="Clock Out"
        confirmVariant="danger"
        onConfirm={async () => {
          await clockOut(user.username);
          setClockOutConfirmOpen(false);
        }}
      />
    </div>
  );
}
