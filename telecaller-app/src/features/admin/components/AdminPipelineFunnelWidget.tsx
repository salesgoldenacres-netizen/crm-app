import { TrendingUp } from "lucide-react";
import { Lead } from "@/shared/types";

interface AdminPipelineFunnelWidgetProps {
  leads: Lead[];
  totalLeadsCount: number;
}

export default function AdminPipelineFunnelWidget({
  leads,
  totalLeadsCount,
}: AdminPipelineFunnelWidgetProps) {
  const inboxCount = totalLeadsCount;
  const engagedCount = leads.filter(
    (l) => !["new", "raw", "not-attempted"].includes(l.status)
  ).length;
  const visitCount = leads.filter((l) =>
    [
      "site-visit-confirmed",
      "site-visit-completed",
      "booked",
      "reserved",
    ].includes(l.status)
  ).length;
  const bookedCount = leads.filter((l) =>
    ["booked", "reserved"].includes(l.status)
  ).length;

  const getPercent = (value: number, base: number) =>
    base > 0 ? Math.round((value / base) * 100) : 0;
  const getDropoff = (value: number, base: number) =>
    base > 0 ? Math.round((1 - value / base) * 100) : 0;

  const funnelStages = [
    {
      label: "All Leads",
      count: inboxCount,
      percentage: 100,
      tone: "bg-theme-accent text-theme-accent-fg",
    },
    {
      label: "Engaged",
      count: engagedCount,
      percentage: getPercent(engagedCount, inboxCount),
      dropoff: getDropoff(engagedCount, inboxCount),
      tone: "bg-theme-warning text-white",
    },
    {
      label: "Site Visit",
      count: visitCount,
      percentage: getPercent(visitCount, inboxCount),
      dropoff: getDropoff(visitCount, engagedCount),
      tone: "bg-theme-accent/80 text-theme-accent-fg",
    },
    {
      label: "Booked",
      count: bookedCount,
      percentage: getPercent(bookedCount, inboxCount),
      dropoff: getDropoff(bookedCount, visitCount),
      tone: "bg-theme-success text-white",
    },
  ];

  return (
    <div className="rounded-xl border border-theme-border bg-theme-card p-3 flex flex-col gap-3">
      <div className="flex items-center gap-1.5 border-b border-theme-border pb-2">
        <TrendingUp className="w-3.5 h-3.5 text-theme-success" />
        <h2 className="text-xs font-bold text-theme-text">Pipeline Funnel</h2>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-1.5">
        {funnelStages.map((stage, idx) => {
          const visualWidth = Math.max(36, stage.percentage);
          return (
            <div key={stage.label} className="flex flex-col items-center w-full">
              {idx > 0 && (
                <div className="my-0.5 text-[9px] font-bold text-theme-danger bg-theme-danger/10 px-1.5 py-0.5 rounded border border-theme-danger/20">
                  Drop-off {stage.dropoff}%
                </div>
              )}
              <div
                className={`w-full ${stage.tone} py-1.5 px-2.5 rounded-lg flex justify-between items-center`}
                style={{ width: `${visualWidth}%` }}
              >
                <span className="text-[10px] font-bold tracking-wide">
                  {stage.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black tabular-nums">
                    {stage.count}
                  </span>
                  <span className="text-[9px] font-bold bg-black/15 px-1 py-0.5 rounded">
                    {stage.percentage}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
