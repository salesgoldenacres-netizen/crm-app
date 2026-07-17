import { PhoneCall, Phone, Clock, Activity } from "lucide-react";
import { User } from "@/shared/types";

interface ProductivityTelemetryProps {
  users: User[];
  isManagerial: (role: string) => boolean;
  agentStatuses: Record<string, { status: string; updatedAt?: string } | undefined>;
  productivity: Record<
    string,
    | {
        totalCalls?: number;
        totalTalkTimeSeconds?: number;
        lastActiveTime?: string | null;
        idleWarning?: boolean;
        bookedCount?: number;
        interestedCount?: number;
      }
    | undefined
  >;
  todayStr: string;
  currentTime: Date;
  parseSafeDate: (dateStr: string) => Date | null;
}

function statusBadge(liveStatus: string, idleWarning: boolean) {
  if (liveStatus === "available") {
    if (idleWarning)
      return "bg-theme-warning/15 text-theme-warning border-theme-warning/40 animate-pulse";
    return "bg-theme-success/15 text-theme-success border-theme-success/30";
  }
  if (liveStatus === "on-call")
    return "bg-theme-danger/15 text-theme-danger border-theme-danger/30";
  if (liveStatus === "break" || liveStatus === "lunch")
    return "bg-theme-accent-muted text-theme-accent border-theme-accent/30";
  if (liveStatus === "away")
    return "bg-theme-warning/15 text-theme-warning border-theme-warning/30";
  return "bg-theme-surface text-theme-muted border-theme-border";
}

function statusLabel(liveStatus: string, idleWarning: boolean) {
  if (liveStatus === "available") return idleWarning ? "Idle" : "Available";
  if (liveStatus === "on-call") return "On Call";
  if (liveStatus === "lunch") return "Lunch";
  if (liveStatus === "break") return "Break";
  if (liveStatus === "away") return "Away";
  if (liveStatus === "offline") return "Offline";
  return liveStatus;
}

export default function ProductivityTelemetry({
  users,
  isManagerial: checkIsManagerial,
  agentStatuses,
  productivity,
  todayStr,
  currentTime,
  parseSafeDate,
}: ProductivityTelemetryProps) {
  const telecallers = users.filter((u) => !checkIsManagerial(u.role));

  const formatTalktime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${h}h ${m}m ${s}s`;
  };

  const getRelativeTime = (timestamp: string | null | undefined) => {
    if (!timestamp) return "No activity today";
    const safeDate = parseSafeDate(timestamp);
    if (!safeDate) return "No activity today";
    const diffMs = currentTime.getTime() - safeDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins === 1) return "1 minute ago";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1 hour ago";
    return `${diffHours} hours ago`;
  };

  const agentMetrics = telecallers.map((tc) => {
    const dailyProd = productivity[`${tc.id}_${todayStr}`] || {
      totalCalls: 0,
      totalTalkTimeSeconds: 0,
      lastActiveTime: null,
      idleWarning: false,
      bookedCount: 0,
      interestedCount: 0,
    };
    return {
      ...tc,
      totalCalls: dailyProd.totalCalls || 0,
      totalTalktime: dailyProd.totalTalkTimeSeconds || 0,
      lastActiveTime: dailyProd.lastActiveTime,
      idleWarning: !!dailyProd.idleWarning,
      bookedCount: dailyProd.bookedCount || 0,
      interestedCount: dailyProd.interestedCount || 0,
    };
  });

  const grandTotalTalktime = agentMetrics.reduce((s, a) => s + a.totalTalktime, 0);
  const grandTotalCalls = agentMetrics.reduce((s, a) => s + a.totalCalls, 0);
  const grandTotalBookings = agentMetrics.reduce((s, a) => s + a.bookedCount, 0);
  const grandTotalInterested = agentMetrics.reduce(
    (s, a) => s + a.interestedCount,
    0
  );

  return (
    <div className="rounded-xl border border-theme-border bg-theme-card overflow-hidden">
      <div className="px-3 py-2.5 border-b border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-theme-accent text-theme-accent-fg shrink-0">
            <PhoneCall className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-theme-text">
              Agent Productivity
            </h2>
            <p className="text-[9px] text-theme-muted">
              Talktime, activity, and idle warnings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-theme-surface border border-theme-border rounded-md font-bold text-theme-text tabular-nums">
            <Phone className="w-3 h-3 text-theme-accent" />
            {grandTotalCalls} calls
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-theme-surface border border-theme-border rounded-md font-bold text-theme-text tabular-nums">
            <Clock className="w-3 h-3 text-theme-success" />
            {formatTalktime(grandTotalTalktime)}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-theme-surface border border-theme-border rounded-md font-bold text-theme-text tabular-nums">
            <Activity className="w-3 h-3 text-theme-warning" />
            {grandTotalBookings} booked · {grandTotalInterested} interested
          </span>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[min(50dvh,420px)] overflow-y-auto scrollbar-thin">
        <table className="min-w-full divide-y divide-theme-border">
          <thead className="bg-theme-surface sticky top-0 z-[1]">
            <tr>
              {[
                "Telecaller",
                "Status",
                "Calls",
                "Talktime",
                "Avg",
                "Conversion",
                "Last Activity",
              ].map((label) => (
                <th
                  key={label}
                  className="px-3 py-1.5 text-left text-[9px] font-bold text-theme-muted uppercase tracking-wider whitespace-nowrap"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border">
            {agentMetrics.map((tc) => {
              const liveStatus = agentStatuses[tc.id]?.status || "offline";
              const avgDurationSecs =
                tc.totalCalls > 0
                  ? Math.round(tc.totalTalktime / tc.totalCalls)
                  : 0;
              const formattedAvgDuration = `${Math.floor(avgDurationSecs / 60)}m ${avgDurationSecs % 60}s`;

              return (
                <tr
                  key={tc.id}
                  className={`hover:bg-theme-surface/60 transition-colors ${
                    tc.idleWarning && liveStatus !== "offline"
                      ? "bg-theme-warning/5"
                      : ""
                  }`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-theme-accent text-theme-accent-fg flex items-center justify-center text-[10px] font-bold shrink-0">
                        {tc.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-theme-text flex items-center gap-1.5">
                          {tc.username}
                          {tc.idleWarning && liveStatus !== "offline" && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-danger opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-theme-danger" />
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-theme-muted uppercase tracking-wider">
                          {tc.role}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${statusBadge(liveStatus, tc.idleWarning)}`}
                    >
                      {statusLabel(liveStatus, tc.idleWarning)}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex px-1.5 py-0.5 rounded bg-theme-accent-muted text-theme-accent text-[11px] font-bold tabular-nums">
                      {tc.totalCalls}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-[11px] font-mono font-bold text-theme-text tabular-nums">
                      {formatTalktime(tc.totalTalktime)}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-[11px] font-mono text-theme-muted tabular-nums">
                      {formattedAvgDuration}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-[9px]">
                      <span className="px-1.5 py-0.5 rounded bg-theme-success/15 text-theme-success border border-theme-success/25 font-bold tabular-nums">
                        {tc.bookedCount} booked
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-theme-warning/15 text-theme-warning border border-theme-warning/25 font-bold tabular-nums">
                        {tc.interestedCount} interested
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] ${
                          tc.idleWarning && liveStatus !== "offline"
                            ? "text-theme-warning font-bold"
                            : "text-theme-muted"
                        }`}
                      >
                        {getRelativeTime(tc.lastActiveTime)}
                      </span>
                      {tc.idleWarning && liveStatus !== "offline" && (
                        <span className="inline-flex px-1 py-0.5 rounded text-[8px] font-extrabold uppercase bg-theme-danger/15 text-theme-danger border border-theme-danger/30 animate-pulse">
                          Idle 45m+
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-theme-surface border-t border-theme-border">
              <td className="px-3 py-2 whitespace-nowrap" colSpan={2}>
                <span className="text-[10px] font-black text-theme-text uppercase tracking-wider">
                  Grand Total
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-[11px] font-black text-theme-accent tabular-nums">
                  {grandTotalCalls}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-[11px] font-mono font-black text-theme-success tabular-nums">
                  {formatTalktime(grandTotalTalktime)}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-[11px] font-mono text-theme-muted tabular-nums">
                  {grandTotalCalls > 0
                    ? `${Math.floor(grandTotalTalktime / grandTotalCalls / 60)}m ${Math.round((grandTotalTalktime / grandTotalCalls) % 60)}s`
                    : "0m 0s"}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <div className="flex items-center gap-1.5 text-[10px] font-black">
                  <span className="text-theme-success tabular-nums">
                    {grandTotalBookings} booked
                  </span>
                  <span className="text-theme-border">|</span>
                  <span className="text-theme-warning tabular-nums">
                    {grandTotalInterested} interested
                  </span>
                </div>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-[9px] text-theme-muted">Live</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
