import { Users } from "lucide-react";
import { User, AttendanceRecord } from "@/shared/types";

interface LiveTelecallersTrackerProps {
  users: User[];
  isManagerial: (role: string) => boolean;
  agentStatuses: Record<string, { status: string; updatedAt?: string } | undefined>;
  allAttendance: AttendanceRecord[];
  todayStr: string;
  currentTime: Date;
  parseSafeDate: (dateStr: string) => Date | null;
  handleForceClockOut: (userId: string, username: string) => void;
}

function statusBadge(liveStatus: string) {
  if (liveStatus === "available")
    return "bg-theme-success/15 text-theme-success border-theme-success/30";
  if (liveStatus === "on-call")
    return "bg-theme-danger/15 text-theme-danger border-theme-danger/30";
  if (liveStatus === "away")
    return "bg-theme-warning/15 text-theme-warning border-theme-warning/30";
  if (liveStatus === "break" || liveStatus === "lunch")
    return "bg-theme-accent-muted text-theme-accent border-theme-accent/30";
  return "bg-theme-surface text-theme-muted border-theme-border";
}

function statusLabel(liveStatus: string) {
  if (liveStatus === "lunch") return "Lunch";
  if (liveStatus === "break") return "Break";
  return liveStatus;
}

export default function LiveTelecallersTracker({
  users,
  isManagerial: checkIsManagerial,
  agentStatuses,
  allAttendance,
  todayStr,
  currentTime,
  parseSafeDate,
  handleForceClockOut,
}: LiveTelecallersTrackerProps) {
  const telecallers = users.filter((u) => !checkIsManagerial(u.role));
  const activeCount = telecallers.filter(
    (u) => (agentStatuses[u.id]?.status || "offline") !== "offline"
  ).length;

  return (
    <div className="rounded-xl border border-theme-border bg-theme-card p-3 xl:col-span-2 flex flex-col gap-2.5">
      <div className="flex justify-between items-center border-b border-theme-border pb-2">
        <h2 className="text-xs font-bold text-theme-text flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-theme-accent" />
          Live Telecallers
          <span className="text-[9px] bg-theme-success/15 text-theme-success border border-theme-success/30 px-1.5 py-0.5 rounded font-bold ml-1 tabular-nums">
            {activeCount} active
          </span>
        </h2>
      </div>

      <div className="overflow-x-auto max-h-[320px] overflow-y-auto scrollbar-thin">
        <table className="min-w-full divide-y divide-theme-border text-[11px]">
          <thead className="bg-theme-surface sticky top-0 z-[1]">
            <tr>
              <th className="px-2.5 py-1.5 text-left text-[9px] font-bold text-theme-muted uppercase tracking-wider">
                Telecaller
              </th>
              <th className="px-2.5 py-1.5 text-left text-[9px] font-bold text-theme-muted uppercase tracking-wider">
                Status
              </th>
              <th className="px-2.5 py-1.5 text-left text-[9px] font-bold text-theme-muted uppercase tracking-wider">
                Check In
              </th>
              <th className="px-2.5 py-1.5 text-left text-[9px] font-bold text-theme-muted uppercase tracking-wider">
                Hours
              </th>
              <th className="px-2.5 py-1.5 text-right text-[9px] font-bold text-theme-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border">
            {telecallers.map((tc) => {
              const liveStatus = agentStatuses[tc.id]?.status || "offline";
              const attendance = allAttendance.find(
                (a) => a.userId === tc.id && a.date === todayStr
              );

              let checkInTime = "—";
              let workHours = "—";
              if (attendance) {
                const checkInDate = parseSafeDate(attendance.checkIn);
                checkInTime = checkInDate
                  ? checkInDate.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";
                if (attendance.checkOut) {
                  workHours = `${attendance.totalWorkHours} hrs`;
                } else {
                  const checkInMs = checkInDate
                    ? checkInDate.getTime()
                    : currentTime.getTime();
                  let elapsedMs = currentTime.getTime() - checkInMs;
                  (attendance.breaks || []).forEach((b) => {
                    const start =
                      parseSafeDate(b.start)?.getTime() || currentTime.getTime();
                    const end = b.end
                      ? parseSafeDate(b.end)?.getTime() || currentTime.getTime()
                      : currentTime.getTime();
                    elapsedMs -= end - start;
                  });
                  workHours = `${Math.max(0, parseFloat((elapsedMs / 3600000).toFixed(2)))} hrs`;
                }
              }

              return (
                <tr
                  key={tc.id}
                  className="hover:bg-theme-surface/60 transition-colors"
                >
                  <td className="px-2.5 py-2 font-semibold text-theme-text">
                    {tc.username}
                  </td>
                  <td className="px-2.5 py-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${statusBadge(liveStatus)}`}
                    >
                      {statusLabel(liveStatus)}
                    </span>
                  </td>
                  <td className="px-2.5 py-2 text-theme-muted font-medium tabular-nums">
                    {checkInTime}
                  </td>
                  <td className="px-2.5 py-2 text-theme-muted font-semibold tabular-nums">
                    {workHours}
                  </td>
                  <td className="px-2.5 py-2 text-right">
                    {attendance && !attendance.checkOut && (
                      <button
                        type="button"
                        onClick={() => handleForceClockOut(tc.id, tc.username)}
                        className="px-2 py-0.5 text-[9px] font-bold border border-theme-danger/40 text-theme-danger hover:bg-theme-danger/10 rounded transition-colors bg-transparent cursor-pointer"
                      >
                        Force Out
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
