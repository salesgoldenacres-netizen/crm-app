import CircularProgressRing from "@/shared/components/CircularProgressRing";

interface ThemeConfig {
  accentText?: string;
  accentBg?: string;
  card?: string;
  text?: string;
}

interface CallsTodayWidgetProps {
  callsLoggedToday: number;
  callTarget: number;
  activeThemeConfig: ThemeConfig;
}

/**
 * CallsTodayWidget (Wave 8 Phase 2C)
 * Decoupled presentation component.
 * Performs zero inline reductions or direct Firestore queries.
 */
export default function CallsTodayWidget({
  callsLoggedToday,
  callTarget,
  activeThemeConfig,
}: CallsTodayWidgetProps) {
  const targetPct =
    callTarget > 0 ? Math.round((callsLoggedToday / callTarget) * 100) : 0;
  const remaining = Math.max(0, callTarget - callsLoggedToday);

  return (
    <div className="flex flex-col items-center justify-center gap-widget w-full">
      <CircularProgressRing
        value={callsLoggedToday}
        max={callTarget}
        label="Calls Today"
        colorClass={activeThemeConfig.accentText || "text-theme-accent"}
        size={96}
        strokeWidth={9}
      />
      <div className="flex flex-col items-center gap-0.5 text-center">
        <p
          className={`type-label text-[11px] ${
            targetPct >= 100 ? "text-theme-success" : "text-theme-muted"
          }`}
        >
          {targetPct >= 100 ? "Target met" : `${remaining} to go · ${targetPct}%`}
        </p>
        <p className="type-secondary text-[10px] text-theme-muted">
          Daily call goal
        </p>
      </div>
    </div>
  );
}
