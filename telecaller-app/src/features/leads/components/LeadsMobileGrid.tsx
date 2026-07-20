import { Lead, Project } from "@/shared/types";

interface LeadsMobileGridProps {
  myLeads: Lead[];
  projects: Record<string, Project>;
  todayStr: string;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent, lead: Lead) => void;
}

export default function LeadsMobileGrid({
  myLeads,
  projects,
  todayStr,
  handleTouchStart,
  handleTouchEnd,
}: LeadsMobileGridProps) {
  return (
    <div className="block md:hidden divide-y divide-theme-border">
      {myLeads.map((lead) => {
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
            key={lead.id}
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => handleTouchEnd(e, lead)}
            className="p-3 bg-theme-card hover:bg-theme-surface/60 active:bg-theme-surface transition-colors flex flex-col gap-2 relative overflow-hidden select-none border-l-4"
            style={{ borderLeftColor: borderLeft }}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-theme-text truncate">
                  {lead.name}
                </h4>
                <span className="text-[10px] font-semibold text-theme-muted">
                  {lead.leadReference ? lead.leadReference.substring(0, 10) + "..." : lead.leadNumber || "No ID"}
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
      })}
    </div>
  );
}
