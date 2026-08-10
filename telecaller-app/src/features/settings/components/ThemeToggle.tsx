import { Monitor, Moon, Sun } from "lucide-react";
import {
  useAppearanceStore,
} from "@/features/settings/hooks/useThemeStore";
import type { Appearance } from "@/shared/types/theme";

interface ThemeToggleProps {
  /** Compact icon-only control for tight headers */
  compact?: boolean;
  className?: string;
}

const OPTIONS: { value: Appearance; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const btnFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";

export default function ThemeToggle({ compact = false, className = "" }: ThemeToggleProps) {
  const { appearance, updateAppearance } = useAppearanceStore();

  return (
    <div
      className={`inline-flex items-center rounded-theme border border-theme-border bg-theme-surface p-0.5 ${className}`}
      role="group"
      aria-label="Appearance"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = appearance === value;
        return (
          <button
            key={value}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => updateAppearance(value)}
            className={`flex items-center justify-center gap-1.5 rounded-lg transition-colors cursor-pointer border-0 ${btnFocus} ${
              compact ? "min-h-11 min-w-11 sm:min-h-0 sm:h-8 sm:w-8" : "min-h-11 sm:min-h-0 sm:h-8 px-2.5"
            } ${
              active
                ? "bg-theme-card text-theme-accent shadow-sm"
                : "bg-transparent text-theme-muted hover:text-theme-text"
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {!compact && (
              <span className="text-[10px] font-bold tracking-wide">{label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
