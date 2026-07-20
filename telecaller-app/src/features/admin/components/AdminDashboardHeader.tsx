import { Activity, Clock } from "lucide-react";

interface AdminDashboardHeaderProps {
  currentTime: Date;
  pendingCount?: number;
}

export default function AdminDashboardHeader({
  currentTime,
  pendingCount = 0,
}: AdminDashboardHeaderProps) {
  return (
    <div className="shrink-0 rounded-theme border border-theme-border bg-theme-card shadow-elevation-sm px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h1 className="text-sm font-bold text-theme-text tracking-tight flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-theme-accent shrink-0" />
            Company Overview
          </h1>
          {pendingCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-theme-warning/15 text-theme-warning border border-theme-warning/30 tabular-nums">
              {pendingCount} pending
            </span>
          )}
        </div>
        <p className="text-[10px] text-theme-muted mt-0.5">
          Live agents, approvals, and business health
        </p>
      </div>

      <div className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-theme-border bg-theme-surface text-theme-accent font-mono text-[11px] font-bold shrink-0 self-start sm:self-auto">
        <Clock className="w-3.5 h-3.5" />
        {currentTime.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </div>
    </div>
  );
}
