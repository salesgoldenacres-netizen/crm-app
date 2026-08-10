import { useMemo, useRef } from "react";
import { Lead, Project } from "@/shared/types";
import { useVirtualization } from "@/shared/components/renderers/virtualization/hooks/useVirtualization";
import { FixedRowHeightStrategy } from "@/shared/components/renderers/virtualization/strategies/FixedRowHeightStrategy";

/** Align with ResponsiveDataView mobile auto-windowing default (F-3). */
const MOBILE_VIRTUALIZE_THRESHOLD = 80;
const ESTIMATED_CARD_HEIGHT = 108;
const VIRTUAL_OVERSCAN = 6;

interface LeadsMobileGridProps {
  myLeads: Lead[];
  projects: Record<string, Project>;
  todayStr: string;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent, lead: Lead) => void;
}

interface LeadMobileCardProps {
  lead: Lead;
  projects: Record<string, Project>;
  todayStr: string;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent, lead: Lead) => void;
}

function LeadMobileCard({
  lead,
  projects,
  todayStr,
  handleTouchStart,
  handleTouchEnd,
}: LeadMobileCardProps) {
  const projectObj = projects[lead.projectId || ""];
  const isOverdue =
    lead.followUpDate &&
    lead.followUpDate < todayStr &&
    lead.status !== "booked" &&
    lead.status !== "not-interested";
  const isToday = lead.followUpDate === todayStr;

  const borderLeft =
    lead.priority === "hot"
      ? "var(--theme-warning)"
      : lead.priority === "cold"
        ? "var(--theme-muted)"
        : "var(--theme-accent)";

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={(e) => handleTouchEnd(e, lead)}
      className="p-3 bg-theme-card hover:bg-theme-surface/60 active:bg-theme-surface transition-colors flex flex-col gap-2 relative overflow-hidden select-none border-l-4"
      style={{ borderLeftColor: borderLeft }}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-sm text-theme-text truncate">{lead.name}</h4>
          <span className="text-[10px] font-semibold text-theme-muted">
            {lead.leadReference
              ? lead.leadReference.substring(0, 10) + "..."
              : lead.leadNumber || "No ID"}
          </span>
        </div>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-theme border border-theme-border bg-theme-surface text-theme-muted uppercase tracking-wider shrink-0">
          {lead.status}
        </span>
      </div>

      <div className="flex justify-between items-end text-[11px] text-theme-muted gap-3">
        <div className="space-y-0.5 min-w-0">
          <p className="font-bold text-theme-text">{lead.phone}</p>
          <p className="text-[10px] truncate">
            {projectObj ? projectObj.name : "No Project"}
            {lead.plotId ? ` #${lead.plotId}` : ""}
          </p>
        </div>
        <div className="text-right shrink-0">
          {lead.followUpDate && (
            <p
              className={`text-[10px] font-bold ${
                isOverdue
                  ? "text-theme-danger"
                  : isToday
                    ? "text-theme-warning"
                    : "text-theme-muted"
              }`}
            >
              {isOverdue ? "Overdue" : isToday ? "Today" : lead.followUpDate}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LeadsMobileGridPlain(props: LeadsMobileGridProps) {
  const { myLeads } = props;

  return (
    <div className="block md:hidden divide-y divide-theme-border">
      {myLeads.map((lead) => (
        <LeadMobileCard key={lead.id} {...props} lead={lead} />
      ))}
    </div>
  );
}

function LeadsMobileGridVirtualized({
  myLeads,
  projects,
  todayStr,
  handleTouchStart,
  handleTouchEnd,
}: LeadsMobileGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const strategy = useMemo(
    () => new FixedRowHeightStrategy(ESTIMATED_CARD_HEIGHT),
    []
  );

  const { startIndex, endIndex, startPad, totalHeight } = useVirtualization({
    containerRef,
    totalItems: myLeads.length,
    overscan: VIRTUAL_OVERSCAN,
    strategy,
  });

  const visibleRows: Array<{ index: number; lead: Lead }> = [];
  for (let i = startIndex; i <= endIndex && i < myLeads.length; i++) {
    visibleRows.push({ index: i, lead: myLeads[i] });
  }

  return (
    <div
      ref={containerRef}
      className="block md:hidden relative overflow-auto w-full max-h-[min(78dvh,820px)] divide-y divide-theme-border scrollbar-thin"
      role="list"
      aria-rowcount={myLeads.length}
    >
      <div style={{ height: `${totalHeight}px`, position: "relative" }}>
        {visibleRows.map(({ index, lead }) => (
          <div
            key={lead.id}
            role="listitem"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${startPad + (index - startIndex) * ESTIMATED_CARD_HEIGHT}px)`,
            }}
          >
            <LeadMobileCard
              lead={lead}
              projects={projects}
              todayStr={todayStr}
              handleTouchStart={handleTouchStart}
              handleTouchEnd={handleTouchEnd}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeadsMobileGrid(props: LeadsMobileGridProps) {
  const shouldVirtualize = props.myLeads.length >= MOBILE_VIRTUALIZE_THRESHOLD;

  if (shouldVirtualize) {
    return <LeadsMobileGridVirtualized {...props} />;
  }

  return <LeadsMobileGridPlain {...props} />;
}
