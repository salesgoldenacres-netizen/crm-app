import { PhoneCall, MapPin, Flame, Award } from "lucide-react";
import { AgentStats } from "@/features/dashboard/utils/agentStats";

interface ThemeConfig {
  accentText: string;
  headerText?: string;
}

interface TelecallerMetricsWidgetProps {
  agentStats: AgentStats;
  activeThemeConfig: ThemeConfig;
}

export default function TelecallerMetricsWidget({
  agentStats,
  activeThemeConfig,
}: TelecallerMetricsWidgetProps) {
  const unlocked = agentStats.badges.filter((b) => b.unlocked).length;
  const nextBadge = agentStats.badges.find((b) => !b.unlocked);

  return (
    <div className="flex h-full w-full flex-col justify-between gap-widget">
      <div className="grid grid-cols-3 gap-widget-tight">
        <div className="rounded-theme border border-theme-border bg-theme-surface p-2.5 text-center">
          <PhoneCall className={`mx-auto mb-1 h-3.5 w-3.5 ${activeThemeConfig.accentText}`} />
          <p className="type-kpi text-base leading-none text-theme-text">
            {agentStats.totalCallsCount.toLocaleString()}
          </p>
          <p className="type-label mt-1 text-[9px] uppercase tracking-wide text-theme-muted">
            Calls
          </p>
        </div>
        <div className="rounded-theme border border-theme-border bg-theme-surface p-2.5 text-center">
          <MapPin className="mx-auto mb-1 h-3.5 w-3.5 text-theme-success" />
          <p className="type-kpi text-base leading-none text-theme-text">
            {agentStats.siteVisitsCount}
          </p>
          <p className="type-label mt-1 text-[9px] uppercase tracking-wide text-theme-muted">
            Visits
          </p>
        </div>
        <div className="rounded-theme border border-theme-border bg-theme-surface p-2.5 text-center">
          <Flame className="mx-auto mb-1 h-3.5 w-3.5 text-theme-warning" />
          <p className="type-kpi text-base leading-none text-theme-text">
            {agentStats.streak}
          </p>
          <p className="type-label mt-1 text-[9px] uppercase tracking-wide text-theme-muted">
            Streak
          </p>
        </div>
      </div>

      <div className="rounded-theme border border-theme-border bg-theme-accent-muted/40 px-3 py-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="type-label flex items-center gap-1 text-[10px] text-theme-accent">
            <Award className="h-3 w-3" aria-hidden />
            Badges unlocked
          </span>
          <span className="type-kpi text-[10px] text-theme-accent">
            {unlocked}/{agentStats.badges.length}
          </span>
        </div>
        {nextBadge ? (
          <div>
            <p className="truncate text-[10px] font-medium text-theme-text">
              Next: {nextBadge.name}
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-theme bg-theme-surface">
              <div
                className="h-full rounded-theme bg-theme-accent transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((nextBadge.progress / nextBadge.target) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <p className="text-[10px] font-semibold text-theme-success">
            All badges unlocked
          </p>
        )}
      </div>
    </div>
  );
}
