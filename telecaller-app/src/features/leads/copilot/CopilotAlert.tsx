import type { ReactNode } from "react";
import { AlertCircle, Info, WifiOff } from "lucide-react";
import { twMerge } from "tailwind-merge";

/**
 * Feature-local alert banner for Sales Copilot UX states.
 * There is no shared DLS `Alert` primitive — this mirrors existing
 * role="alert" / warning strip patterns (Login, RolesSettings) with theme tokens.
 * Not a DLS addition; keep scoped to Copilot.
 */

export type CopilotAlertTone = "info" | "warning" | "danger" | "muted";

export interface CopilotAlertProps {
  tone?: CopilotAlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
  /** Optional icon override; defaults by tone. */
  icon?: ReactNode;
}

const TONE_CLASS: Record<CopilotAlertTone, string> = {
  info: "border-theme-accent/30 bg-theme-accent-muted/40 text-theme-accent",
  warning:
    "border-theme-warning/30 bg-theme-warning/10 text-theme-warning",
  danger: "border-theme-danger/25 bg-theme-danger/10 text-theme-danger",
  muted: "border-theme-border bg-theme-surface/80 text-theme-muted",
};

function DefaultIcon({ tone }: { tone: CopilotAlertTone }) {
  const cls = "w-3.5 h-3.5 shrink-0 mt-0.5";
  if (tone === "warning") return <WifiOff className={cls} aria-hidden />;
  if (tone === "danger") return <AlertCircle className={cls} aria-hidden />;
  return <Info className={cls} aria-hidden />;
}

export default function CopilotAlert({
  tone = "muted",
  title,
  children,
  className,
  icon,
}: CopilotAlertProps) {
  return (
    <div
      role="alert"
      className={twMerge(
        "flex items-start gap-2 rounded-theme border px-2.5 py-2 text-[11px] leading-relaxed",
        TONE_CLASS[tone],
        className,
      )}
    >
      {icon ?? <DefaultIcon tone={tone} />}
      <div className="min-w-0 space-y-0.5">
        {title && (
          <p className="font-semibold text-theme-text uppercase tracking-wider text-[10px]">
            {title}
          </p>
        )}
        <div className="text-theme-muted [&_strong]:text-theme-text [&_strong]:font-semibold">
          {children}
        </div>
      </div>
    </div>
  );
}
