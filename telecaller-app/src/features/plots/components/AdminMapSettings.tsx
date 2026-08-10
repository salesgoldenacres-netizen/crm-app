import { useState, type ChangeEvent } from "react";
import {
  Settings,
  X,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Ruler,
  Upload,
  Trash2,
  Plus,
  Wand2,
} from "lucide-react";
import {
  Project,
  ProjectPhase,
  PlotLabelContentMode,
} from "@/shared/types";
import { useToast } from "@/shared/components/Toast";
import { downloadGeoJSON, geoJSONToPlots } from "@/features/plots/utils/adminMapIo";
import {
  applyRateToAvailablePlots,
  estimatePricingSandbox,
  formatCurrencyInr,
} from "@/features/plots/utils/adminMapPricing";
import DigitizingWizard, {
  activateDigitizingWizardStep,
} from "@/features/plots/components/DigitizingWizard";

type UnderlayDraft = {
  bgX: number;
  bgY: number;
  bgScale: number;
  bgRotate: number;
  bgOpacity: number;
};

interface AdminMapSettingsProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  project: Project;
  updateProject: (id: string, updates: Project) => Promise<void>;
  projectId: string;
  pushToHistory: () => void;
  layers: Record<string, { visible: boolean; locked?: boolean }>;
  setLayers: (layers: Record<string, { visible: boolean; locked?: boolean }>) => void;
  setMode: (mode: string) => void;
  setCalibrationPoints: (points: unknown[]) => void;
  handleMapEditorImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  uploadingImage: boolean;
  handleRemoveMapImage: () => void;
  handleClearCalibration: () => void;
  setDrawingPoints?: (points: [number, number][]) => void;
  setSlicePoints?: (points: [number, number][]) => void;
  setActivePlotId?: (id: string | null) => void;
  setSelectedPlotIds?: (ids: string[]) => void;
}

const settingsBtn =
  "flex items-center justify-center min-h-11 py-2 px-2 rounded-theme text-xs font-semibold cursor-pointer " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";

const fieldClass =
  "mt-1 block w-full rounded-theme border border-theme-border bg-theme-card text-theme-text shadow-sm " +
  "focus:border-theme-accent focus:ring-2 focus:ring-theme-ring text-xs sm:text-sm p-2.5 min-h-11";

const labelCapsClass =
  "block text-xs font-semibold text-theme-muted uppercase tracking-wider";

function newPhaseId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `phase-${Date.now()}`;
}

function newShareToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `tok${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
}

export default function AdminMapSettings({
  showSettings,
  setShowSettings,
  project,
  updateProject,
  projectId,
  pushToHistory,
  layers,
  setLayers,
  setMode,
  setCalibrationPoints,
  handleMapEditorImageUpload,
  uploadingImage,
  handleRemoveMapImage,
  handleClearCalibration,
  setDrawingPoints,
  setSlicePoints,
  setActivePlotId,
  setSelectedPlotIds,
}: AdminMapSettingsProps) {
  const { toast } = useToast();
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [sandboxLots, setSandboxLots] = useState(10);
  const [sandboxAvgSize, setSandboxAvgSize] = useState(1000);
  const [sandboxRate, setSandboxRate] = useState(500);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [underlayDraft, setUnderlayDraft] = useState<UnderlayDraft | null>(null);
  const [phaseNameDrafts, setPhaseNameDrafts] = useState<Record<string, string>>({});

  const persist = async (updates: Partial<Project>) => {
    await updateProject(projectId, { ...project, ...updates });
  };

  const underlay: UnderlayDraft = underlayDraft ?? {
    bgX: project.bgX ?? 0,
    bgY: project.bgY ?? 0,
    bgScale: project.bgScale ?? 1,
    bgRotate: project.bgRotate ?? 0,
    bgOpacity: project.bgOpacity ?? 1,
  };

  const commitUnderlay = async (next: UnderlayDraft) => {
    try {
      await persist(next);
      setUnderlayDraft(null);
    } catch {
      toast("Failed to update underlay", "error");
    }
  };

  const sandboxEstimate = estimatePricingSandbox(project.plots || [], {
    lotCount: sandboxLots,
    avgSizeSqFt: sandboxAvgSize,
    ratePerSqFt: sandboxRate,
  });

  const shareToken = project.publicLayout?.shareToken || "";
  const shareEnabled = !!project.publicLayout?.enabled;
  const shareUrl =
    typeof window !== "undefined" && shareToken
      ? `${window.location.origin}/public/layout/${projectId}?token=${shareToken}`
      : "";

  const phases: ProjectPhase[] = project.phases || [];

  const wizardToolProps = {
    setMode,
    setCalibrationPoints,
    setDrawingPoints: setDrawingPoints || (() => undefined),
    setSlicePoints: setSlicePoints || (() => undefined),
    setActivePlotId: setActivePlotId || (() => undefined),
    setSelectedPlotIds: setSelectedPlotIds || (() => undefined),
  };

  if (!showSettings && !showWizard) return null;

  return (
    <>
      {showSettings && (
        <div className="absolute top-16 right-4 md:right-8 bg-theme-card shadow-xl border border-theme-border rounded-theme p-4 z-20 w-72 space-y-4 animate-fadeIn text-sm max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b border-theme-border pb-2">
            <h3 className="font-semibold text-theme-text flex items-center">
              <Settings className="w-4 h-4 mr-1.5 text-theme-accent" aria-hidden="true" />{" "}
              Editor Settings
            </h3>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              aria-label="Close settings"
              className={
                "min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme text-theme-muted " +
                "hover:text-theme-text hover:bg-theme-surface transition-colors " +
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              }
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-theme-muted uppercase tracking-wider">
              JSON Database Operations
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const dataStr = JSON.stringify(project.plots, null, 2);
                  const dataBlob = new Blob([dataStr], { type: "application/json" });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${project.id}-plots-backup.json`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}
                className={`${settingsBtn} bg-theme-accent text-theme-accent-fg hover:opacity-90`}
              >
                Export JSON
              </button>

              <input
                type="file"
                id="import-json-file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (event) => {
                    try {
                      const parsedPlots = JSON.parse(String(event.target?.result || ""));
                      if (!Array.isArray(parsedPlots)) {
                        throw new Error("Plots database should be a JSON array.");
                      }
                      parsedPlots.forEach((p, idx) => {
                        if (!p.id || !p.points) {
                          throw new Error(`Item at index ${idx} is missing id or points.`);
                        }
                      });
                      pushToHistory();
                      await updateProject(projectId, { ...project, plots: parsedPlots });
                      toast(
                        `Successfully imported ${parsedPlots.length} plots!`,
                        "success"
                      );
                    } catch (err: unknown) {
                      const message = err instanceof Error ? err.message : String(err);
                      toast("Failed to import JSON: " + message, "error");
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = "";
                }}
              />
              <label
                htmlFor="import-json-file"
                className={`${settingsBtn} border border-theme-accent text-theme-accent hover:bg-theme-accent-muted text-center`}
              >
                Import JSON
              </label>

              <button
                type="button"
                onClick={() => {
                  downloadGeoJSON(
                    project.plots || [],
                    `${project.id}-plots.geojson`
                  );
                  toast("GeoJSON exported", "success");
                }}
                className={`${settingsBtn} bg-theme-accent text-theme-accent-fg hover:opacity-90`}
              >
                Export GeoJSON
              </button>

              <input
                type="file"
                id="import-geojson-file"
                accept=".geojson,.json,application/geo+json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (event) => {
                    try {
                      const parsed = JSON.parse(String(event.target?.result || ""));
                      const plots = geoJSONToPlots(parsed);
                      pushToHistory();
                      await updateProject(projectId, { ...project, plots });
                      toast(
                        `Successfully imported ${plots.length} plots from GeoJSON!`,
                        "success"
                      );
                    } catch (err: unknown) {
                      const message = err instanceof Error ? err.message : String(err);
                      toast("Failed to import GeoJSON: " + message, "error");
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = "";
                }}
              />
              <label
                htmlFor="import-geojson-file"
                className={`${settingsBtn} border border-theme-accent text-theme-accent hover:bg-theme-accent-muted text-center`}
              >
                Import GeoJSON
              </label>
            </div>
          </div>

          <div className="space-y-2 border-t border-theme-border pt-3">
            <h4 className="font-semibold text-xs text-theme-muted uppercase tracking-wider flex items-center">
              <Wand2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Guided Wizard
            </h4>
            <button
              type="button"
              onClick={() => {
                setWizardStep(0);
                activateDigitizingWizardStep("calibrate", wizardToolProps);
                setShowWizard(true);
                setShowSettings(false);
              }}
              className={`${settingsBtn} w-full border border-theme-accent text-theme-accent hover:bg-theme-accent-muted`}
            >
              Start Digitizing Wizard
            </button>
          </div>

          <div className="space-y-2 border-t border-theme-border pt-3">
            <h4 className="font-semibold text-xs text-theme-muted uppercase tracking-wider">
              Underlay Align
            </h4>
            {(
              [
                { key: "bgX", label: "X offset (px)", min: -2000, max: 2000, step: 1 },
                { key: "bgY", label: "Y offset (px)", min: -2000, max: 2000, step: 1 },
                { key: "bgScale", label: "Scale", min: 0.1, max: 5, step: 0.01 },
                { key: "bgRotate", label: "Rotate (°)", min: -180, max: 180, step: 1 },
                { key: "bgOpacity", label: "Opacity", min: 0, max: 1, step: 0.01 },
              ] as const
            ).map(({ key, label, min, max, step }) => {
              const value = underlay[key];
              return (
                <div key={key}>
                  <label className={labelCapsClass}>
                    {label}: <span className="text-theme-text normal-case">{value}</span>
                  </label>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => {
                      const nextVal = parseFloat(e.target.value);
                      setUnderlayDraft({ ...underlay, [key]: nextVal });
                    }}
                    onMouseUp={(e) => {
                      const nextVal = parseFloat((e.target as HTMLInputElement).value);
                      void commitUnderlay({ ...underlay, [key]: nextVal });
                    }}
                    onTouchEnd={(e) => {
                      const nextVal = parseFloat((e.target as HTMLInputElement).value);
                      void commitUnderlay({ ...underlay, [key]: nextVal });
                    }}
                    className="mt-1 w-full accent-[var(--theme-accent)]"
                  />
                  <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => {
                      const nextVal = parseFloat(e.target.value);
                      if (!Number.isFinite(nextVal)) return;
                      setUnderlayDraft({ ...underlay, [key]: nextVal });
                    }}
                    onBlur={(e) => {
                      const nextVal = parseFloat(e.target.value);
                      if (!Number.isFinite(nextVal)) return;
                      void commitUnderlay({ ...underlay, [key]: nextVal });
                    }}
                    className={fieldClass}
                  />
                </div>
              );
            })}
          </div>

          <div className="space-y-2 border-t border-theme-border pt-3">
            <h4 className="font-semibold text-xs text-theme-muted uppercase tracking-wider">
              Label Content
            </h4>
            <select
              value={project.labelContentMode || "number"}
              onChange={async (e) => {
                try {
                  await persist({
                    labelContentMode: e.target.value as PlotLabelContentMode,
                  });
                } catch {
                  toast("Failed to update label mode", "error");
                }
              }}
              className={fieldClass}
            >
              <option value="number">Number</option>
              <option value="number+area">Number + area</option>
              <option value="number+area+facing">Number + area + facing</option>
            </select>
          </div>

          <div className="space-y-2 border-t border-theme-border pt-3">
            <h4 className="font-semibold text-xs text-theme-muted uppercase tracking-wider">
              Phases
            </h4>
            <div className="space-y-2">
              {phases.map((phase) => (
                <div
                  key={phase.id}
                  className="flex items-center gap-2 border border-theme-border rounded-theme p-2"
                >
                  <input
                    type="text"
                    value={phaseNameDrafts[phase.id] ?? phase.name}
                    onChange={(e) => {
                      setPhaseNameDrafts((prev) => ({
                        ...prev,
                        [phase.id]: e.target.value,
                      }));
                    }}
                    onBlur={async (e) => {
                      const name = e.target.value.trim() || phase.name;
                      setPhaseNameDrafts((prev) => {
                        const next = { ...prev };
                        delete next[phase.id];
                        return next;
                      });
                      if (name === phase.name) return;
                      try {
                        await persist({
                          phases: phases.map((p) =>
                            p.id === phase.id ? { ...p, name } : p
                          ),
                        });
                      } catch {
                        toast("Failed to rename phase", "error");
                      }
                    }}
                    className={`${fieldClass} mt-0 flex-1 min-h-9 py-1.5`}
                    aria-label={`Phase name ${phase.name}`}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await persist({
                          phases: phases.map((p) =>
                            p.id === phase.id ? { ...p, visible: !p.visible } : p
                          ),
                        });
                      } catch {
                        toast("Failed to toggle phase", "error");
                      }
                    }}
                    aria-label={`${phase.visible ? "Hide" : "Show"} phase ${phase.name}`}
                    className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme hover:bg-theme-surface cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                      phase.visible ? "text-theme-accent" : "text-theme-muted"
                    }`}
                  >
                    {phase.visible ? (
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await persist({
                          phases: phases.filter((p) => p.id !== phase.id),
                        });
                      } catch {
                        toast("Failed to remove phase", "error");
                      }
                    }}
                    aria-label={`Remove phase ${phase.name}`}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme text-theme-danger hover:bg-theme-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPhaseName}
                onChange={(e) => setNewPhaseName(e.target.value)}
                placeholder="New phase name"
                className={`${fieldClass} mt-0 flex-1`}
              />
              <button
                type="button"
                onClick={async () => {
                  const name = newPhaseName.trim();
                  if (!name) return;
                  try {
                    await persist({
                      phases: [
                        ...phases,
                        { id: newPhaseId(), name, visible: true },
                      ],
                    });
                    setNewPhaseName("");
                  } catch {
                    toast("Failed to add phase", "error");
                  }
                }}
                className={`${settingsBtn} border border-theme-accent text-theme-accent hover:bg-theme-accent-muted px-3`}
                aria-label="Add phase"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="space-y-2 border-t border-theme-border pt-3">
            <h4 className="font-semibold text-xs text-theme-muted uppercase tracking-wider">
              Public Layout
            </h4>
            <label className="flex items-center justify-between gap-2 text-xs text-theme-text">
              <span className="font-medium">Enable share link</span>
              <input
                type="checkbox"
                checked={shareEnabled}
                onChange={async (e) => {
                  const enabled = e.target.checked;
                  try {
                    const token =
                      project.publicLayout?.shareToken || newShareToken();
                    await persist({
                      publicLayout: { enabled, shareToken: token },
                    });
                  } catch {
                    toast("Failed to update public layout", "error");
                  }
                }}
                className="h-4 w-4 accent-[var(--theme-accent)]"
              />
            </label>
            <button
              type="button"
              onClick={async () => {
                try {
                  const token = newShareToken();
                  await persist({
                    publicLayout: {
                      enabled: project.publicLayout?.enabled ?? true,
                      shareToken: token,
                    },
                  });
                  toast("Share token regenerated", "success");
                } catch {
                  toast("Failed to regenerate token", "error");
                }
              }}
              className={`${settingsBtn} w-full border border-theme-accent text-theme-accent hover:bg-theme-accent-muted`}
            >
              {shareToken ? "Regenerate Token" : "Generate Token"}
            </button>
            {shareUrl ? (
              <div className="space-y-1">
                <p className="text-[10px] text-theme-muted break-all">{shareUrl}</p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      toast("Share URL copied", "success");
                    } catch {
                      toast("Could not copy URL", "error");
                    }
                  }}
                  className={`${settingsBtn} w-full border border-theme-border text-theme-text hover:bg-theme-surface`}
                >
                  Copy Share URL
                </button>
                <p className="text-[10px] text-theme-muted">
                  Recipients must be signed in. Token is checked client-side against
                  project.publicLayout.
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-theme-muted">
                Generate a token to create a share URL.
              </p>
            )}
          </div>

          <div className="space-y-2 border-t border-theme-border pt-3">
            <h4 className="font-semibold text-xs text-theme-muted uppercase tracking-wider">
              Pricing / Yield Sandbox
            </h4>
            <div>
              <label className={labelCapsClass}>N lots</label>
              <input
                type="number"
                min={0}
                value={sandboxLots}
                onChange={(e) => setSandboxLots(Math.max(0, parseInt(e.target.value) || 0))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelCapsClass}>Avg size (sq ft)</label>
              <input
                type="number"
                min={0}
                value={sandboxAvgSize}
                onChange={(e) =>
                  setSandboxAvgSize(Math.max(0, parseFloat(e.target.value) || 0))
                }
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelCapsClass}>Rate (₹ / sq ft)</label>
              <input
                type="number"
                min={0}
                value={sandboxRate}
                onChange={(e) =>
                  setSandboxRate(Math.max(0, parseFloat(e.target.value) || 0))
                }
                className={fieldClass}
              />
            </div>
            <p className="text-[10px] text-theme-muted">
              Sellable area: {Math.round(sandboxEstimate.sellableAreaSqFt).toLocaleString("en-IN")}{" "}
              sq ft
              {sandboxEstimate.sellableAreaPct != null
                ? ` (${sandboxEstimate.sellableAreaPct.toFixed(1)}% of project total size)`
                : ""}
            </p>
            <p className="text-[10px] text-theme-muted">
              Est. revenue: {formatCurrencyInr(sandboxEstimate.revenue)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    pushToHistory();
                    const plots = applyRateToAvailablePlots(
                      project.plots || [],
                      sandboxRate
                    );
                    await updateProject(projectId, { ...project, plots });
                    toast("Rates applied to available plots", "success");
                  } catch {
                    toast("Failed to apply rates", "error");
                  }
                }}
                className={`${settingsBtn} bg-theme-accent text-theme-accent-fg hover:opacity-90`}
              >
                Apply rates
              </button>
              <button
                type="button"
                onClick={() => {
                  setSandboxLots(10);
                  setSandboxAvgSize(1000);
                  setSandboxRate(500);
                }}
                className={`${settingsBtn} border border-theme-border text-theme-text hover:bg-theme-surface`}
              >
                Discard
              </button>
            </div>
          </div>

          <div className="space-y-2 border-t border-theme-border pt-3">
            <h4 className="font-semibold text-xs text-theme-muted uppercase tracking-wider flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Map Layers
            </h4>
            <div className="space-y-2">
              {Object.entries(layers).map(([layerKey, layerVal]) => (
                <div
                  key={layerKey}
                  className="flex items-center justify-between text-theme-text capitalize text-xs"
                >
                  <span className="font-medium">{layerKey}</span>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() =>
                        setLayers({
                          ...layers,
                          [layerKey]: {
                            ...layerVal,
                            visible: !layerVal.visible,
                          },
                        })
                      }
                      aria-label={`${layerVal.visible ? "Hide" : "Show"} ${layerKey} layer`}
                      className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme hover:bg-theme-surface cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                        layerVal.visible ? "text-theme-accent" : "text-theme-muted"
                      }`}
                    >
                      {layerVal.visible ? (
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                    </button>
                    {layerKey !== "labels" ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLayers({
                            ...layers,
                            [layerKey]: {
                              ...layerVal,
                              locked: !layerVal.locked,
                            },
                          })
                        }
                        aria-label={`${layerVal.locked ? "Unlock" : "Lock"} ${layerKey} layer`}
                        className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme hover:bg-theme-surface cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                          layerVal.locked ? "text-theme-danger" : "text-theme-muted"
                        }`}
                      >
                        {layerVal.locked ? (
                          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      <div className="w-11" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-theme-border pt-3">
            <h4 className="font-semibold text-xs text-theme-muted uppercase tracking-wider flex items-center">
              <Ruler className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Scale Ruler
            </h4>
            {project.scaleRatio ? (
              <p className="text-[10px] text-theme-muted">
                Current: 1 unit = {project.scaleRatio.toFixed(2)} ft
              </p>
            ) : (
              <p className="text-[10px] text-theme-muted">No scale calibrated yet.</p>
            )}
            <button
              type="button"
              onClick={() => {
                setMode("calibrate");
                setCalibrationPoints([]);
                setShowSettings(false);
              }}
              className={`${settingsBtn} w-full border border-theme-accent text-theme-accent hover:bg-theme-accent-muted`}
            >
              Calibrate Map Ruler
            </button>
            <button
              type="button"
              onClick={() => {
                handleClearCalibration();
                setShowSettings(false);
              }}
              disabled={!project.scaleRatio}
              className={`${settingsBtn} w-full border border-theme-danger text-theme-danger hover:bg-red-500/10 dark:hover:bg-red-500/20 disabled:opacity-40 disabled:pointer-events-none`}
            >
              Clear Scale Calibration
            </button>
          </div>

          <div className="space-y-3 border-t border-theme-border pt-3">
            <h4 className="font-semibold text-xs text-theme-muted uppercase tracking-wider flex items-center">
              <Upload className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Layout Image
            </h4>
            <input
              type="file"
              id="layout-image-upload"
              accept="image/*"
              className="hidden"
              onChange={handleMapEditorImageUpload}
              disabled={uploadingImage}
            />
            <label
              htmlFor="layout-image-upload"
              className={`${settingsBtn} w-full border border-theme-accent text-theme-accent hover:bg-theme-accent-muted text-center ${
                uploadingImage ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {uploadingImage ? "Uploading..." : "Upload New Image"}
            </label>
            <button
              type="button"
              onClick={() => {
                handleRemoveMapImage();
                setShowSettings(false);
              }}
              disabled={!project.image || uploadingImage}
              className={`${settingsBtn} w-full border border-theme-danger text-theme-danger hover:bg-red-500/10 dark:hover:bg-red-500/20 disabled:opacity-40 disabled:pointer-events-none gap-1.5`}
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              Remove Layout Image
            </button>
          </div>
        </div>
      )}

      <DigitizingWizard
        open={showWizard}
        stepIndex={wizardStep}
        setStepIndex={setWizardStep}
        onClose={() => setShowWizard(false)}
        {...wizardToolProps}
      />
    </>
  );
}
