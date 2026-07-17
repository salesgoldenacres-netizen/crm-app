import CircularProgressRing from "@/shared/components/CircularProgressRing";

interface ThemeConfig {
  accentText?: string;
  accentBg?: string;
  card?: string;
  text?: string;
}

interface TeamGoalsWidgetProps {
  teamCallsThisMonth: number;
  callGoal: number;
  teamBookingsThisMonth: number;
  bookingGoal: number;
  customGoalText?: string;
  activeThemeConfig: ThemeConfig;
}

/**
 * TeamGoalsWidget (Wave 8 Phase 2C)
 * Decoupled presentation component.
 * Performs zero inline reductions or direct Firestore queries.
 */
export default function TeamGoalsWidget({
  teamCallsThisMonth,
  callGoal,
  teamBookingsThisMonth,
  bookingGoal,
  customGoalText,
  activeThemeConfig,
}: TeamGoalsWidgetProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-widget w-full">
      <div className="flex items-center justify-center gap-widget-tight">
        <CircularProgressRing
          value={teamCallsThisMonth}
          max={callGoal}
          label="Team Calls"
          colorClass={activeThemeConfig.accentText || "text-theme-accent"}
          size={68}
          strokeWidth={6}
          inline={true}
        />
        <CircularProgressRing
          value={teamBookingsThisMonth}
          max={bookingGoal}
          label="Team Booked"
          colorClass="text-theme-success"
          size={68}
          strokeWidth={6}
          inline={true}
        />
      </div>

      {customGoalText && (
        <div
          className="w-full truncate rounded-theme border border-theme-border bg-theme-accent-muted/50 px-2 py-1.5 text-center text-[9px] font-semibold leading-relaxed text-theme-accent"
          title={customGoalText}
        >
          {customGoalText}
        </div>
      )}
    </div>
  );
}
