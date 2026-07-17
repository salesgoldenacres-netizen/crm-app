import { Activity } from "lucide-react";

interface AcquisitionChannelsWidgetProps {
  totalLeadsCount: number;
  getSourceDetails: (source: string) => { count: number; rate: string };
}

export default function AcquisitionChannelsWidget({
  totalLeadsCount,
  getSourceDetails,
}: AcquisitionChannelsWidgetProps) {
  const channels = [
    { id: "google", label: "Google Ads", bar: "bg-theme-danger" },
    { id: "meta", label: "Meta Ads", bar: "bg-theme-accent" },
    { id: "bulk", label: "Bulk Import", bar: "bg-theme-success" },
    { id: "direct", label: "Direct / Manual", bar: "bg-theme-warning" },
  ];

  return (
    <div className="rounded-xl border border-theme-border bg-theme-card p-3 flex flex-col gap-3">
      <div className="border-b border-theme-border pb-2">
        <h2 className="text-xs font-bold text-theme-text flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-theme-accent" />
          Acquisition Channels
        </h2>
      </div>

      <div className="space-y-3">
        {channels.map((item) => {
          const details = getSourceDetails(item.id);
          const percent =
            totalLeadsCount > 0
              ? Math.round((details.count / totalLeadsCount) * 100)
              : 0;
          return (
            <div key={item.id} className="space-y-1">
              <div className="flex justify-between items-center gap-2 text-[10px] font-semibold">
                <span className="text-theme-text truncate">{item.label}</span>
                <span className="text-theme-muted shrink-0 tabular-nums">
                  <strong className="text-theme-text">{details.count}</strong> ({percent}%)
                  {" · "}
                  <strong className="text-theme-accent">{details.rate}%</strong>
                </span>
              </div>
              <div className="w-full bg-theme-surface h-1.5 rounded-full overflow-hidden border border-theme-border/60">
                <div
                  className={`${item.bar} h-full rounded-full`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
