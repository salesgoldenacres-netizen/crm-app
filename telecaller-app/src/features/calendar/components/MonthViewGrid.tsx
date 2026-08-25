import { useMemo } from "react";
import { CalendarEvent, CALENDAR_EVENT_TYPES } from "../types";
import { formatCurrency } from "@/features/deals/components/DealsKanbanBoard";

interface MonthViewGridProps {
  currentDate: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectDay?: (dateYmd: string) => void;
}

export function getMonthMatrix(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon...
  const daysInMonth = lastDayOfMonth.getDate();

  const matrix: Array<{ dateYmd: string; dayNum: number; isCurrentMonth: boolean }> = [];

  // Previous month padding days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const pDate = new Date(year, month - 1, day);
    const dateYmd = pDate.toISOString().split("T")[0];
    matrix.push({ dateYmd, dayNum: day, isCurrentMonth: false });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    // Format YYYY-MM-DD manually to avoid UTC offset shifts
    const mStr = String(month + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const dateYmd = `${year}-${mStr}-${dStr}`;
    matrix.push({ dateYmd, dayNum: day, isCurrentMonth: true });
  }

  // Next month padding days to complete 35 or 42 cells
  const remaining = (7 - (matrix.length % 7)) % 7;
  for (let day = 1; day <= remaining; day++) {
    const nDate = new Date(year, month + 1, day);
    const mStr = String(nDate.getMonth() + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const dateYmd = `${nDate.getFullYear()}-${mStr}-${dStr}`;
    matrix.push({ dateYmd, dayNum: day, isCurrentMonth: false });
  }

  return matrix;
}

export default function MonthViewGrid({
  currentDate,
  eventsByDate,
  onSelectEvent,
  onSelectDay,
}: MonthViewGridProps) {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const matrix = useMemo(() => getMonthMatrix(currentDate), [currentDate]);
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const rowCount = Math.ceil(matrix.length / 7);

  return (
    <div className="bg-theme-card border border-theme-border rounded-xl overflow-hidden shadow-xs animate-fadeIn flex-1 min-h-0 h-full flex flex-col">
      {/* 7 Day Headers */}
      <div className="grid grid-cols-7 border-b border-theme-border bg-theme-surface text-center text-xs font-bold text-theme-muted shrink-0 py-2">
        {daysOfWeek.map((day) => (
          <div key={day} className="border-r last:border-r-0 border-theme-border/60">
            {day}
          </div>
        ))}
      </div>

      {/* Days Cell Grid — Auto-fits viewport height */}
      <div
        className="grid grid-cols-7 flex-1 min-h-0 bg-theme-border/40 gap-px"
        style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
      >
        {matrix.map(({ dateYmd, dayNum, isCurrentMonth }) => {
          const dayEvents = eventsByDate[dateYmd] || [];
          const isToday = dateYmd === todayStr;

          return (
            <div
              key={dateYmd}
              onClick={() => onSelectDay?.(dateYmd)}
              className={`bg-theme-card p-1 sm:p-1.5 flex flex-col justify-start h-full min-h-0 overflow-hidden transition-colors relative group ${
                !isCurrentMonth ? "bg-theme-surface/40 opacity-50" : ""
              } ${isToday ? "bg-theme-accent/5 ring-2 ring-theme-accent/40 z-10" : ""}`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between mb-0.5 shrink-0">
                <span
                  className={`text-[11px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full inline-flex items-center justify-center ${
                    isToday
                      ? "bg-theme-accent text-white shadow-xs"
                      : isCurrentMonth
                      ? "text-theme-text"
                      : "text-theme-muted"
                  }`}
                >
                  {dayNum}
                </span>

                {dayEvents.length > 0 && (
                  <span className="text-[9px] font-extrabold text-theme-muted tabular-nums">
                    {dayEvents.length} {dayEvents.length === 1 ? "evt" : "evts"}
                  </span>
                )}
              </div>

              {/* Day Event List Chips */}
              <div className="space-y-0.5 overflow-y-auto flex-1 min-h-0 scrollbar-none">
                {dayEvents.slice(0, 3).map((evt) => {
                  const typeConfig = CALENDAR_EVENT_TYPES.find((t) => t.type === evt.type);

                  return (
                    <div
                      key={evt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(evt);
                      }}
                      className={`text-[10px] font-bold px-1.5 py-1 rounded-md border truncate cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xs flex items-center justify-between gap-1 ${
                        typeConfig?.badgeClass ||
                        "bg-theme-surface border-theme-border text-theme-text"
                      }`}
                      title={`${evt.title} (${evt.time || "All day"})`}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeConfig?.dotClass}`} />
                        <span className="truncate">{evt.leadName || evt.title}</span>
                      </div>

                      {evt.amount ? (
                        <span className="shrink-0 text-[9px] opacity-90">{formatCurrency(evt.amount)}</span>
                      ) : (
                        <span className="shrink-0 text-[9px] opacity-75">{evt.time}</span>
                      )}
                    </div>
                  );
                })}

                {dayEvents.length > 3 && (
                  <div className="text-[9px] font-extrabold text-theme-accent pt-0.5 px-1 hover:underline cursor-pointer">
                    +{dayEvents.length - 3} more events
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
