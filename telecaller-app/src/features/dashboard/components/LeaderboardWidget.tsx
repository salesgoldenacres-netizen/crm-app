import EmptyState from "@/shared/components/ui/EmptyState";
import { Lead } from "@/shared/types";

interface LeaderboardWidgetProps {
  leads: Lead[];
  activeThemeConfig: {
    accentText: string;
  };
}

interface AgentStat {
  calls: number;
  whatsapp: number;
  bookings: number;
  score?: number;
}

const RANK_STYLES = [
  "bg-theme-warning/15 text-theme-warning border-theme-warning/30",
  "bg-theme-muted/15 text-theme-muted border-theme-border",
  "bg-theme-accent-muted text-theme-accent border-theme-accent/25",
];

export default function LeaderboardWidget({ leads, activeThemeConfig }: LeaderboardWidgetProps) {
  const agentStats: Record<string, AgentStat> = {};
  leads.forEach((l) => {
    if (l.callLogs) {
      l.callLogs.forEach((log) => {
        const agentName = log.agent || "Unknown";
        if (!agentStats[agentName]) {
          agentStats[agentName] = { calls: 0, whatsapp: 0, bookings: 0 };
        }
        if (log.note && log.note.includes("[WhatsApp Sent]")) {
          agentStats[agentName].whatsapp += 1;
        } else {
          agentStats[agentName].calls += 1;
        }
        if (log.status === "booked" || log.status === "reserved") {
          agentStats[agentName].bookings += 1;
        }
      });
    }
  });

  const sortedAgents = Object.entries(agentStats)
    .map(([name, stats]) => ({
      name,
      ...stats,
      score: stats.calls * 10 + stats.whatsapp * 15 + stats.bookings * 100,
    }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  if (sortedAgents.length === 0) {
    return (
      <EmptyState
        variant="compact"
        hideIcon
        title="No stats yet"
        description="Call activity will rank agents here."
        className="border-0 bg-transparent"
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-widget-tight">
      <div className="type-label flex items-center justify-between px-0.5 text-[9px] uppercase tracking-wide text-theme-muted">
        <span>Agent</span>
        <span className="flex items-center gap-3" title="Score = calls×10 + WA×15 + bookings×100">
          <span>Calls</span>
          <span>Pts</span>
        </span>
      </div>
      {sortedAgents.slice(0, 3).map((agent, index) => (
        <div
          key={agent.name}
          className="flex items-center justify-between border-b border-theme-border pb-1.5 text-xs last:border-0 last:pb-0"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-theme border text-[10px] font-bold tabular-nums ${
                RANK_STYLES[index] || "bg-theme-surface text-theme-muted border-theme-border"
              }`}
            >
              {index + 1}
            </span>
            <span className="type-card-title truncate text-[12px] font-semibold text-theme-text">
              {agent.name}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-[10px] tabular-nums">
            <span className="type-secondary w-8 text-right text-theme-muted">
              {agent.calls}
            </span>
            <span
              className={`type-kpi w-12 text-right text-[11px] ${activeThemeConfig.accentText}`}
              title="Score = calls×10 + WA×15 + bookings×100"
            >
              {agent.score}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
