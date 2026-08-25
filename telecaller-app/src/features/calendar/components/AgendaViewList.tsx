import { useMemo } from "react";
import { CalendarEvent, CALENDAR_EVENT_TYPES } from "../types";
import { Phone, Calendar as CalendarIcon, ExternalLink, Clock, Building2 } from "lucide-react";
import { formatCurrency } from "@/features/deals/components/DealsKanbanBoard";

interface AgendaViewListProps {
  filteredEvents: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onStartCall?: (phone: string, name: string) => void;
  navigate: (path: string) => void;
}

export default function AgendaViewList({
  filteredEvents,
  onSelectEvent,
  onStartCall,
  navigate,
}: AgendaViewListProps) {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const groupedByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((evt) => {
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    });
    return Object.entries(map).sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
  }, [filteredEvents]);

  if (groupedByDate.length === 0) {
    return (
      <div className="bg-theme-card border border-theme-border rounded-xl p-12 text-center text-theme-muted animate-fadeIn">
        <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <h3 className="text-sm font-bold text-theme-text">No Scheduled Events Found</h3>
        <p className="text-xs text-theme-muted mt-1">There are no callbacks or site visits matching your filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {groupedByDate.map(([dateYmd, events]) => {
        const isToday = dateYmd === todayStr;
        const isPast = dateYmd < todayStr;

        const dateObj = new Date(`${dateYmd}T00:00:00`);
        const formattedDate = dateObj.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        return (
          <div key={dateYmd} className="bg-theme-card border border-theme-border rounded-xl p-4 shadow-xs space-y-3">
            {/* Date Group Header */}
            <div className="flex items-center justify-between border-b border-theme-border/60 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-extrabold px-2.5 py-1 rounded-md border ${
                    isToday
                      ? "bg-theme-accent text-white border-theme-accent shadow-xs"
                      : isPast
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      : "bg-theme-surface text-theme-text border-theme-border"
                  }`}
                >
                  {isToday ? "TODAY" : isPast ? "OVERDUE" : formattedDate.toUpperCase()}
                </span>
                <span className="text-xs font-bold text-theme-text">{formattedDate}</span>
              </div>

              <span className="text-xs font-semibold text-theme-muted">
                {events.length} {events.length === 1 ? "Event" : "Events"}
              </span>
            </div>

            {/* Events Items List */}
            <div className="space-y-2">
              {events.map((evt) => {
                const typeConfig = CALENDAR_EVENT_TYPES.find((t) => t.type === evt.type);

                return (
                  <div
                    key={evt.id}
                    onClick={() => onSelectEvent(evt)}
                    className={`bg-theme-surface/60 border border-theme-border hover:border-theme-accent/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer hover:shadow-xs group`}
                  >
                    {/* Left info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                          typeConfig?.dotClass || "bg-theme-accent"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-extrabold text-theme-text group-hover:text-theme-accent transition-colors truncate">
                            {evt.leadName}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              typeConfig?.badgeClass
                            }`}
                          >
                            {typeConfig?.label}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-theme-muted mt-0.5 truncate">
                          {evt.title}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] font-medium text-theme-muted mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-theme-muted" />
                            <span>{evt.time || "All Day"}</span>
                          </span>

                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-theme-muted" />
                            <span>{evt.phone}</span>
                          </span>

                          {evt.projectName && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-theme-muted" />
                              <span>{evt.projectName} {evt.plotNumber ? `· Plot ${evt.plotNumber}` : ""}</span>
                            </span>
                          )}

                          {evt.amount && (
                            <span className="font-extrabold text-theme-accent">
                              {formatCurrency(evt.amount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {evt.phone && onStartCall && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartCall(evt.phone, evt.leadName);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/lead/${evt.leadId}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-theme-surface border border-theme-border text-theme-text hover:bg-theme-accent hover:text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Dossier</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
