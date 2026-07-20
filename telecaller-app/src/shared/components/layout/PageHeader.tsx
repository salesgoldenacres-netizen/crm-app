import { ReactNode } from "react";

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
}

/**
 * Compact control-panel command bar — shared by all Admin / Control Panel tabs.
 * Inviting surfaces: calm density, type-* hierarchy, theme tokens only.
 */
export default function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
}: PageHeaderProps) {
  return (
    <div className="bg-theme-card border-b border-theme-border transition-colors duration-300 header-brand-strip shrink-0">
      <div className="px-3 md:px-5 min-h-14 py-2.5 sm:py-0 sm:h-14 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
          {breadcrumb && (
            <div className="type-label text-[10px] text-theme-muted font-medium select-none flex items-center gap-1 leading-none min-w-0 overflow-x-auto scrollbar-none">
              {breadcrumb}
            </div>
          )}
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h1 className="type-page-title text-sm text-theme-text tracking-tight leading-tight truncate">
              {title}
            </h1>
            {description && (
              <p className="type-secondary text-[11px] text-theme-muted leading-snug truncate max-w-xl hidden sm:block">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 justify-start sm:justify-end flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
