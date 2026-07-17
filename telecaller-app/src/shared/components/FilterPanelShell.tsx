import type { ReactNode } from "react";

/**
 * Quiet command-surface chrome for advanced / multi-field filter panels.
 * Presentation wrapper only — does not own filter draft/applied state.
 */
export interface FilterPanelShellProps {
  title?: string;
  subtitle?: string;
  /** Secondary / destructive actions (e.g. Clear All) — right of header */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Optional footer (e.g. Apply row). Prefer Primary Search outside if Apply model is column-based. */
  footer?: ReactNode;
}

export default function FilterPanelShell({
  title,
  subtitle,
  actions,
  children,
  className = "",
  footer,
}: FilterPanelShellProps) {
  const showHeader = Boolean(title || subtitle || actions);

  return (
    <div
      className={`bg-theme-surface border border-theme-border rounded-theme ${className}`}
    >
      {showHeader && (
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-theme-border">
          <div className="min-w-0">
            {title && (
              <h3 className="type-label text-xs font-semibold uppercase tracking-wider text-theme-text">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[11px] text-theme-muted">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      )}
      <div className="px-4 py-3">{children}</div>
      {footer && (
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-theme-border">
          {footer}
        </div>
      )}
    </div>
  );
}
