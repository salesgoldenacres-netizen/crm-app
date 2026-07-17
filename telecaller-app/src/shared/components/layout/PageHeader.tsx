import { ReactNode } from "react";

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
}

/**
 * Compact control-panel command bar — shared by all Admin / Control Panel tabs.
 */
export default function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
}: PageHeaderProps) {
  return (
    <div className="bg-theme-card border-b border-theme-border transition-colors duration-300 header-brand-strip shrink-0">
      <div className="px-3 md:px-4 min-h-14 h-14 flex items-center gap-3">
        <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
          {breadcrumb && (
            <div className="text-[10px] text-theme-muted font-medium select-none flex items-center gap-1 leading-none min-w-0">
              {breadcrumb}
            </div>
          )}
          <div className="flex items-baseline gap-2 min-w-0">
            <h1 className="text-sm font-black text-theme-text tracking-tight leading-tight truncate">
              {title}
            </h1>
            {description && (
              <p className="text-[10px] text-theme-muted leading-snug truncate max-w-xl hidden sm:block">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-1.5 shrink-0 justify-end flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
