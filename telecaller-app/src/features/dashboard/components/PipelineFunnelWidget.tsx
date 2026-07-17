import EmptyState from "@/shared/components/ui/EmptyState";

interface PipelineFunnelWidgetProps {
  newCount: number;
  contactedCount: number;
  interestedCount: number;
  bookedCount: number;
}

export default function PipelineFunnelWidget({
  newCount,
  contactedCount,
  interestedCount,
  bookedCount,
}: PipelineFunnelWidgetProps) {
  const totalActive = newCount + contactedCount + interestedCount + bookedCount;

  if (totalActive === 0) {
    return (
      <EmptyState
        variant="compact"
        preset="leads"
        hideIcon
        title="No active pipeline"
        description="Leads in New → Booked will appear here."
        className="border-0 bg-transparent"
      />
    );
  }

  // Cumulative funnel stages (math unchanged) — labels clarify drop-off meaning
  const funnelSteps = [
    {
      label: "All active",
      hint: "New + later stages",
      count: totalActive,
      pct: 100,
      bar: "bg-theme-accent",
    },
    {
      label: "Reached Contacted+",
      hint: "Contacted, Interested, or Booked",
      count: contactedCount + interestedCount + bookedCount,
      pct: Math.round(
        ((contactedCount + interestedCount + bookedCount) / totalActive) * 100
      ),
      bar: "bg-theme-accent/70",
    },
    {
      label: "Reached Interested+",
      hint: "Interested or Booked",
      count: interestedCount + bookedCount,
      pct: Math.round(((interestedCount + bookedCount) / totalActive) * 100),
      bar: "bg-theme-warning",
    },
    {
      label: "Booked",
      hint: "Converted",
      count: bookedCount,
      pct: Math.round((bookedCount / totalActive) * 100),
      bar: "bg-theme-success",
    },
  ];

  return (
    <div className="flex w-full flex-col gap-widget-tight text-xs font-semibold">
      {funnelSteps.map((step) => (
        <div key={step.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-[10px]">
            <span className="type-label text-theme-muted" title={step.hint}>
              {step.label}
            </span>
            <span className="type-kpi shrink-0 tabular-nums text-theme-text">
              {step.count}{" "}
              <span className="type-secondary font-normal text-theme-muted">
                ({step.pct}%)
              </span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-theme bg-theme-surface">
            <div
              className={`${step.bar} h-full transition-all duration-500`}
              style={{ width: `${step.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
