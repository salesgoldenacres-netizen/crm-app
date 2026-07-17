import { Layout, Phone, MessageCircle, ArrowRight } from "lucide-react";
import { Lead, Project } from "@/shared/types";

interface LeadsKanbanBoardProps {
  kanbanLeads: Lead[];
  projects: Record<string, Project>;
  handleKanbanDrop: (leadId: string, status: string) => void;
  handleTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  handleTouchEnd: (e: React.TouchEvent<HTMLDivElement>, lead: Lead) => void;
  onStartCall: (lead: Lead) => void;
  onStartWhatsApp: (lead: Lead) => void;
  todayStr: string;
  navigate: (path: string) => void;
}

interface Column {
  id: string;
  name: string;
  statuses: string[];
  bar: string;
  badge: string;
}

export default function LeadsKanbanBoard({
  kanbanLeads,
  projects,
  handleKanbanDrop,
  handleTouchStart,
  handleTouchEnd,
  onStartCall,
  onStartWhatsApp,
  todayStr,
  navigate,
}: LeadsKanbanBoardProps) {
  const columns: Column[] = [
    {
      id: "raw",
      name: "Raw Inbox",
      statuses: ["raw"],
      bar: "bg-violet-500",
      badge: "text-violet-600 dark:text-violet-300 bg-violet-500/10 border-violet-500/25",
    },
    {
      id: "new",
      name: "New & Active",
      statuses: ["new", "not-attempted"],
      bar: "bg-blue-500",
      badge: "text-blue-600 dark:text-blue-300 bg-blue-500/10 border-blue-500/25",
    },
    {
      id: "contacted",
      name: "In Progress",
      statuses: ["contacted", "rnr"],
      bar: "bg-cyan-500",
      badge: "text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 border-cyan-500/25",
    },
    {
      id: "interested",
      name: "Interested",
      statuses: ["interested"],
      bar: "bg-amber-500",
      badge: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/25",
    },
    {
      id: "site-visit",
      name: "Site Visit",
      statuses: ["site-visit-confirmed", "site-visit-completed"],
      bar: "bg-purple-500",
      badge: "text-purple-600 dark:text-purple-300 bg-purple-500/10 border-purple-500/25",
    },
    {
      id: "booked",
      name: "Booked",
      statuses: ["booked", "reserved"],
      bar: "bg-emerald-500",
      badge: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
    },
  ];

  const priorityBar = (priority?: string) => {
    if (priority === "hot") return "bg-amber-500";
    if (priority === "cold") return "bg-slate-400 dark:bg-slate-500";
    return "bg-indigo-500";
  };

  const priorityPill = (priority?: string) => {
    if (priority === "hot")
      return "bg-theme-warning/15 text-theme-warning border-theme-warning/30";
    if (priority === "cold")
      return "bg-theme-surface text-theme-muted border-theme-border";
    return "bg-theme-accent-muted text-theme-accent border-theme-accent/30";
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      <div className="rounded-xl border border-theme-border bg-theme-card px-3 py-2.5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-theme-accent-muted text-theme-accent inline-flex items-center justify-center shrink-0">
          <Layout className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-black text-theme-text leading-tight">
            Pipeline Board
          </h1>
          <p className="text-[10px] text-theme-muted mt-0.5 leading-snug">
            Drag cards between columns to update status
          </p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {columns.map((col) => {
          const colLeads = kanbanLeads.filter((l) =>
            col.statuses.includes(l.status),
          );
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const leadId = e.dataTransfer.getData("text/plain");
                if (leadId) handleKanbanDrop(leadId, col.statuses[0]);
              }}
              className="flex flex-col w-[240px] shrink-0 bg-theme-surface/60 rounded-xl border border-theme-border p-2.5 min-h-[420px]"
            >
              {/* Fixed-height header — bar/title/badge share one center line */}
              <div className="flex items-center gap-2.5 h-8 mb-2.5">
                <span
                  className={`block w-1 h-4 rounded-full shrink-0 ${col.bar}`}
                  aria-hidden
                />
                <span className="font-bold text-[11px] text-theme-text truncate flex-1 leading-none">
                  {col.name}
                </span>
                <span
                  className={`inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full border text-[9px] font-black tabular-nums leading-none shrink-0 ${col.badge}`}
                >
                  {colLeads.length}
                </span>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto max-h-[560px] scrollbar-none">
                {colLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", lead.id);
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={(e) => handleTouchEnd(e, lead)}
                    className="bg-theme-card rounded-lg border border-theme-border shadow-sm hover:shadow-md hover:-translate-y-0.5 duration-200 cursor-grab active:cursor-grabbing transition-all select-none overflow-hidden"
                  >
                    {/* Full-bleed priority strip (avoids partial border-t with radius) */}
                    <div
                      className={`h-1 w-full ${priorityBar(lead.priority)}`}
                      aria-hidden
                    />

                    <div className="px-2.5 pt-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 min-h-5">
                        <span className="font-bold text-[12px] text-theme-text truncate leading-none">
                          {lead.name}
                        </span>
                        <span
                          className={`inline-flex items-center text-[9px] font-bold px-1.5 h-5 rounded border shrink-0 leading-none ${priorityPill(lead.priority)}`}
                        >
                          {lead.priority === "hot"
                            ? "Hot"
                            : lead.priority === "cold"
                              ? "Cold"
                              : "Warm"}
                        </span>
                      </div>

                      <div className="space-y-0.5 text-[10px] text-theme-muted leading-snug">
                        <p className="truncate font-semibold text-theme-text/80">
                          {lead.phone}
                        </p>
                        <p className="truncate">
                          {projects[lead.projectId || ""]?.name || "No Project"}
                          {lead.plotId ? ` · Plot ${lead.plotId}` : ""}
                        </p>
                        {lead.followUpDate && (
                          <p className="italic text-[9px]">
                            {lead.followUpDate === todayStr
                              ? "Follow-up today"
                              : `Follow-up ${lead.followUpDate}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action row — same horizontal padding as body, equal icon boxes */}
                    <div className="mt-2 flex items-center gap-1 px-2.5 py-1.5 border-t border-theme-border">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartCall?.(lead);
                        }}
                        className="inline-flex items-center justify-center size-7 rounded-md text-indigo-500 dark:text-indigo-400 hover:bg-theme-surface cursor-pointer border-0 bg-transparent transition-colors"
                        title="Call"
                      >
                        <Phone className="size-3.5 shrink-0" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartWhatsApp?.(lead);
                        }}
                        className="inline-flex items-center justify-center size-7 rounded-md text-green-500 dark:text-green-400 hover:bg-theme-surface cursor-pointer border-0 bg-transparent transition-colors"
                        title="WhatsApp"
                      >
                        <MessageCircle className="size-3.5 shrink-0" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/lead/${lead.id}`);
                        }}
                        className="inline-flex items-center justify-center size-7 rounded-md text-theme-muted hover:bg-theme-surface cursor-pointer border-0 bg-transparent transition-colors ml-auto"
                        title="Details"
                      >
                        <ArrowRight className="size-3.5 shrink-0" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
