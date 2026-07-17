import EmptyState from "@/shared/components/ui/EmptyState";
import { User } from "@/shared/types";

interface ThemeConfig {
  accentText?: string;
  accentBg?: string;
  card?: string;
  text?: string;
}

interface RosterWeek {
  schedule?: Record<string, Record<string, string> | string>;
}

interface WeeklyRosterWidgetProps {
  user: User;
  rosters?: Record<string, RosterWeek> | null;
  activeThemeConfig: ThemeConfig;
}

function getShiftShort(shift: string): string {
  switch (shift) {
    case "morning_shift":
      return "AM";
    case "evening_shift":
      return "PM";
    case "night_shift":
      return "NT";
    case "off":
      return "Off";
    default:
      return "AM";
  }
}

function getShiftLabel(shift: string): string {
  switch (shift) {
    case "morning_shift":
      return "Morning (9am–5pm)";
    case "evening_shift":
      return "Evening (1pm–9pm)";
    case "night_shift":
      return "Night (9pm–5am)";
    case "off":
      return "Weekly Off";
    default:
      return "Morning (9am–5pm)";
  }
}

export default function WeeklyRosterWidget({ user, rosters, activeThemeConfig }: WeeklyRosterWidgetProps) {
  const getRosterWeekString = (dateVal = new Date()) => {
    const target = new Date(dateVal.valueOf());
    const dayNr = (dateVal.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(
        0,
        1 + ((4 - target.getDay() + 7) % 7)
      );
    }
    const weekNum =
      1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    const year = new Date(firstThursday).getFullYear();
    return `${year}-W${String(weekNum).padStart(2, "0")}`;
  };

  const currentWeekStr = getRosterWeekString(new Date());
  const weekSched = (rosters && rosters[currentWeekStr]?.schedule) || {};
  const rawSchedule = weekSched[user.id] || {};
  const tcSched = typeof rawSchedule === "string" ? {} : rawSchedule;

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayDayName = daysOfWeek[new Date().getDay()];
  const todayShift = tcSched[todayDayName] || "morning_shift";

  const hasAnySchedule = Object.keys(tcSched).length > 0;

  return (
    <div className="flex h-full w-full flex-col justify-between gap-widget text-xs">
      <div
        className={`flex flex-col items-center justify-center gap-1 rounded-theme border border-theme-border p-3 text-center ${
          activeThemeConfig.accentBg || "bg-theme-accent-muted/40"
        } ${activeThemeConfig.accentText || "text-theme-accent"}`}
      >
        <span className="type-label text-[10px] uppercase tracking-widest opacity-80">
          Today&apos;s assigned shift
        </span>
        <span className="type-card-title text-sm text-theme-text">
          {getShiftLabel(todayShift)}
        </span>
      </div>

      {!hasAnySchedule ? (
        <EmptyState
          variant="compact"
          hideIcon
          title="No roster this week"
          description="Your weekly schedule will appear when assigned."
          className="border-0 bg-transparent"
        />
      ) : (
        <div className="space-y-2 rounded-theme border border-theme-border bg-theme-surface/40 p-2.5">
          <div className="type-label flex items-center justify-between px-1 text-[10px] uppercase tracking-wider text-theme-muted">
            <span>Week {currentWeekStr}</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
              const shift = tcSched[day] || "morning_shift";
              const isToday = day === todayDayName;
              return (
                <div
                  key={day}
                  className={`flex flex-col items-center justify-center rounded-theme border p-1.5 transition-colors ${
                    isToday
                      ? "border-theme-accent bg-theme-accent-muted ring-1 ring-theme-ring/20"
                      : "border-theme-border bg-theme-card"
                  }`}
                  title={getShiftLabel(shift)}
                >
                  <span className="type-secondary mb-1 text-[9px] font-semibold text-theme-muted">
                    {day}
                  </span>
                  <span
                    className={`type-label text-[10px] font-bold tabular-nums ${
                      isToday ? "text-theme-accent" : "text-theme-text"
                    }`}
                  >
                    {getShiftShort(shift)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
