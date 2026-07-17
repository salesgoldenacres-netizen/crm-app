import { useId, useState } from "react";
import { User } from "@/shared/types";
import { Widget } from "@/features/dashboard/hooks/useDashboardWidgets";
import Drawer from "@/shared/components/ui/Drawer";
import Dialog from "@/shared/components/ui/Dialog";

interface CustomizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: Widget[];
  setWidgets: (widgets: Widget[]) => void;
  updateWidgets: (widgets: Widget[]) => void;
  widgetStyle: string;
  updateWidgetStyle: (style: string) => void;
  widgetDensity: string;
  updateWidgetDensity: (density: string) => void;
  resetPreferences: () => void;
  isManagerial: (role: string) => boolean;
  user: User;
}

export default function CustomizerDrawer({
  isOpen,
  onClose,
  widgets,
  setWidgets,
  updateWidgets,
  widgetStyle,
  updateWidgetStyle,
  widgetDensity,
  updateWidgetDensity,
  resetPreferences,
  isManagerial: _isManagerial,
  user: _user,
}: CustomizerDrawerProps) {
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const descriptionId = useId();

  const moveWidget = (id: string, direction: "up" | "down") => {
    const idx = widgets.findIndex((w) => w.id === id);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= widgets.length) return;

    const updated = [...widgets];
    const [removed] = updated.splice(idx, 1);
    updated.splice(targetIdx, 0, removed);
    setWidgets(updated);
    updateWidgets(updated);
  };

  const footer = (
    <div className="flex w-full gap-2">
      <button
        type="button"
        onClick={() => setConfirmResetOpen(true)}
        className="flex-1 py-2 text-[11px] font-bold text-theme-danger border border-theme-danger/30 hover:bg-theme-danger hover:text-white rounded-theme transition-colors cursor-pointer text-center bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
      >
        Reset
      </button>
      <button
        type="button"
        onClick={onClose}
        className="flex-1 py-2 text-[11px] font-bold text-theme-accent-fg bg-theme-accent rounded-theme transition-colors cursor-pointer text-center border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
      >
        Save & Close
      </button>
    </div>
  );

  return (
    <>
      {/* Hide Drawer while confirm Dialog is open to avoid dual focus traps (same z-index). */}
      <Drawer
        isOpen={isOpen && !confirmResetOpen}
        onClose={onClose}
        title="Customize Dashboard"
        position="right"
        size="md"
        descriptionId={descriptionId}
        footer={footer}
      >
        <p id={descriptionId} className="text-[10px] text-theme-muted -mt-1 mb-4">
          Layout, widgets, and density
        </p>

        <div className="space-y-5">
          <div>
            <h3 className="type-label text-[10px] text-theme-muted uppercase tracking-wider mb-2">
              Card style
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "standard", label: "Standard" },
                { id: "borderless", label: "Borderless" },
                { id: "raised", label: "Raised" },
                { id: "frosted", label: "Frosted" },
              ].map((style) => {
                const isSelected = widgetStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => updateWidgetStyle(style.id)}
                    className={`py-2 px-2.5 rounded-theme border text-center font-bold text-[11px] cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                      isSelected
                        ? "border-theme-accent bg-theme-accent-muted ring-1 ring-theme-accent text-theme-accent"
                        : "border-theme-border text-theme-text hover:bg-theme-surface"
                    }`}
                  >
                    {style.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="type-label text-[10px] text-theme-muted uppercase tracking-wider mb-2">
              Density
            </h3>
            <div className="flex rounded-theme p-0.5 bg-theme-surface border border-theme-border">
              {[
                { id: "comfortable", label: "Comfortable" },
                { id: "compact", label: "Compact" },
              ].map((density) => {
                const isSelected = widgetDensity === density.id;
                return (
                  <button
                    key={density.id}
                    type="button"
                    onClick={() => updateWidgetDensity(density.id)}
                    className={`flex-1 py-1.5 rounded-lg text-center font-bold text-[11px] cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                      isSelected
                        ? "bg-theme-card text-theme-accent shadow-sm border border-theme-border"
                        : "text-theme-muted hover:text-theme-text border border-transparent"
                    }`}
                  >
                    {density.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="type-label text-[10px] text-theme-muted uppercase tracking-wider mb-2">
              Visible widgets
            </h3>
            <div className="space-y-1.5">
              {widgets.map((w) => {
                const widgetIdx = widgets.indexOf(w);
                return (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 p-2 rounded-theme border border-theme-border bg-theme-surface/50 hover:bg-theme-surface select-none"
                  >
                    <span className="text-[11px] font-bold text-theme-text flex-1 truncate">
                      {w.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveWidget(w.id, "up")}
                        disabled={widgetIdx === 0}
                        className="p-1 rounded-theme hover:bg-theme-card text-theme-muted hover:text-theme-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors border-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                        title="Move Up"
                        aria-label={`Move ${w.title} up`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m18 15-6-6-6 6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveWidget(w.id, "down")}
                        disabled={widgetIdx === widgets.length - 1}
                        className="p-1 rounded-theme hover:bg-theme-card text-theme-muted hover:text-theme-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors border-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                        title="Move Down"
                        aria-label={`Move ${w.title} down`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      <input
                        type="checkbox"
                        checked={w.visible !== false}
                        onChange={() => {
                          const updated = widgets.map((item) =>
                            item.id === w.id
                              ? {
                                  ...item,
                                  visible:
                                    item.visible === false ? true : false,
                                }
                              : item
                          );
                          setWidgets(updated);
                          updateWidgets(updated);
                        }}
                        className="rounded text-theme-accent focus:ring-theme-ring cursor-pointer h-4 w-4 border-theme-border bg-theme-card ml-1"
                        aria-label={`Toggle ${w.title} visibility`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Drawer>

      <Dialog
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        title="Reset layout?"
        description="Are you sure you want to reset your layout to defaults?"
        confirmLabel="Reset"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          resetPreferences();
          setConfirmResetOpen(false);
        }}
      />
    </>
  );
}
