import { useMemo } from "react";
import { CalendarEvent, CALENDAR_EVENT_TYPES } from "../types";

interface WeekViewGridProps {
  currentDate: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  isDayOnly?: boolean;
  onSelectEvent: (event: CalendarEvent) => void;
}

export function getWeekDays(date: Date) {
  const current = new Date(date);
  const dayOfWeek = current.getDay(); // 0 = Sun
  const sunday = new Date(current);
  sunday.setDate(current.getDate() - dayOfWeek);

  const days: Array<{ dateYmd: string; dayName: string; dayNum: number }> = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);

    const year = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, "0");
    const dStr = String(d.getDate()).padStart(2, "0");
    const dateYmd = `${year}-${mStr}-${dStr}`;

    days.push({
      dateYmd,
      dayName: dayNames[i],
      dayNum: d.getDate(),
    });
  }

  return days;
}

export default function WeekViewGrid({
  currentDate,
  eventsByDate,
  isDayOnly = false,
  onSelectEvent,
}: WeekViewGridProps) {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const targetDateYmd = useMemo(() => {
    const year = currentDate.getFullYear();
    const mStr = String(currentDate.getMonth() + 1).padStart(2, "0");
    const dStr = String(currentDate.getDate()).padStart(2, "0");
    return `${year}-${mStr}-${dStr}`;
  }, [currentDate]);

  const displayDays = isDayOnly
    ? weekDays.filter((d) => d.dateYmd === targetDateYmd)
    : weekDays;

  // Time slots from 8 AM to 8 PM
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  return (
    <div className="bg-theme-card border border-theme-border rounded-xl overflow-hidden shadow-xs animate-fadeIn">
      {/* Week Header Days */}
      <div
        className={`grid ${
          isDayOnly ? "grid-cols-1" : "grid-cols-7"
        } border-b border-theme-border bg-theme-surface text-center text-xs font-bold text-theme-muted`}
      >
        {displayDays.map((day) => {
          const isToday = day.dateYmd === todayStr;
          return (
            <div
              key={day.dateYmd}
              className={`py-3 border-r last:border-r-0 border-theme-border/60 ${
                isToday ? "bg-theme-accent/10 text-theme-accent" : ""
              }`}
            >
              <div>{day.dayName}</div>
              <div className="text-base font-extrabold text-theme-text mt-0.5">{day.dayNum}</div>
            </div>
          );
        })}
      </div>

      {/* Hourly Schedule Body */}
      <div className="divide-y divide-theme-border/50 max-h-[650px] overflow-y-auto scrollbar-thin">
        {hours.map((hour) => {
          const timeLabel = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;

          return (
            <div
              key={hour}
              className={`grid ${
                isDayOnly ? "grid-cols-1" : "grid-cols-7"
              } min-h-[70px] relative`}
            >
              {displayDays.map((day) => {
                const dayEvents = eventsByDate[day.dateYmd] || [];

                // Filter events scheduled around this hour
                const hourEvents = dayEvents.filter((evt) => {
                  if (!evt.time) return hour === 10; // Default fallback to 10 AM slot
                  const evtHour = parseInt(evt.time.split(":")[0], 10);
                  return evtHour === hour;
                });

                return (
                  <div
                    key={day.dateYmd}
                    className="p-1.5 border-r last:border-r-0 border-theme-border/40 relative group hover:bg-theme-surface/30 transition-colors"
                  >
                    <span className="text-[9px] font-semibold text-theme-muted absolute top-1 left-1 opacity-40">
                      {timeLabel}
                    </span>

                    <div className="space-y-1 mt-4">
                      {hourEvents.map((evt) => {
                        const typeConfig = CALENDAR_EVENT_TYPES.find(
                          (t) => t.type === evt.type
                        );

                        return (
                          <div
                            key={evt.id}
                            onClick={() => onSelectEvent(evt)}
                            className={`p-2 rounded-lg border text-xs font-bold transition-all hover:scale-[1.01] hover:shadow-xs cursor-pointer ${
                              typeConfig?.badgeClass ||
                              "bg-theme-surface border-theme-border text-theme-text"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="truncate">{evt.leadName}</span>
                              <span className="text-[9px] opacity-80 shrink-0">
                                {evt.time || timeLabel}
                              </span>
                            </div>
                            <p className="text-[10px] font-medium opacity-90 truncate">
                              {evt.title}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
