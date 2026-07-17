interface ThemeConfig {
  accentText?: string;
  accentBg?: string;
  card?: string;
  text?: string;
}

interface CoachingTip {
  tip?: string;
  category?: string;
}

interface CoachingTipWidgetProps {
  coachingTip?: CoachingTip | null;
  activeThemeConfig: ThemeConfig;
}

export default function CoachingTipWidget({ coachingTip, activeThemeConfig }: CoachingTipWidgetProps) {
  return (
    <div className="flex h-full w-full flex-col justify-between gap-widget py-1 text-center">
      <div
        className={`text-3xl leading-none opacity-50 ${activeThemeConfig.accentText || "text-theme-accent"}`}
        aria-hidden
      >
        “
      </div>
      <p className="type-secondary px-3 text-xs font-medium italic leading-relaxed text-theme-text">
        {coachingTip?.tip ||
          "Focus on active listening. Understanding lead pain points is key to site visit bookings."}
      </p>
      <div
        className={`mt-1 text-3xl leading-none opacity-50 ${activeThemeConfig.accentText || "text-theme-accent"}`}
        aria-hidden
      >
        ”
      </div>
      {coachingTip?.category && (
        <span
          className="mt-2 self-center rounded-theme border border-theme-border bg-theme-accent-muted px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-theme-accent"
        >
          {coachingTip.category}
        </span>
      )}
    </div>
  );
}
