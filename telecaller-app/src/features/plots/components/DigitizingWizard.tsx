import { X } from "lucide-react";

export type DigitizingWizardStepId =
  | "calibrate"
  | "draw"
  | "slice"
  | "subdivide"
  | "status"
  | "done";

type WizardStep = {
  id: DigitizingWizardStepId;
  title: string;
  hint: string;
};

const STEPS: WizardStep[] = [
  {
    id: "calibrate",
    title: "Calibrate",
    hint: "Click two points on a known distance, then enter feet.",
  },
  {
    id: "draw",
    title: "Draw boundary",
    hint: "Click corners to draw the outer boundary polygon, then Finish Shape.",
  },
  {
    id: "slice",
    title: "Road cut",
    hint: "Select an area, then click two points across it to cut a road.",
  },
  {
    id: "subdivide",
    title: "Subdivide",
    hint: "Open an area’s details panel and use Subdivide to split lots.",
  },
  {
    id: "status",
    title: "Status / pricing",
    hint: "Use Bulk Action to set status/rate, or Pricing Sandbox in Settings.",
  },
  {
    id: "done",
    title: "Done",
    hint: "Layout digitizing complete. Return to view mode anytime.",
  },
];

interface DigitizingWizardProps {
  open: boolean;
  stepIndex: number;
  setStepIndex: (index: number) => void;
  onClose: () => void;
  setMode: (mode: string) => void;
  setCalibrationPoints: (points: unknown[]) => void;
  setDrawingPoints: (points: [number, number][]) => void;
  setSlicePoints: (points: [number, number][]) => void;
  setActivePlotId: (id: string | null) => void;
  setSelectedPlotIds: (ids: string[]) => void;
}

const settingsBtn =
  "flex items-center justify-center min-h-11 py-2 px-2 rounded-theme text-xs font-semibold cursor-pointer " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";

function activateStep(
  stepId: DigitizingWizardStepId,
  props: Pick<
    DigitizingWizardProps,
    | "setMode"
    | "setCalibrationPoints"
    | "setDrawingPoints"
    | "setSlicePoints"
    | "setActivePlotId"
    | "setSelectedPlotIds"
  >
): void {
  const {
    setMode,
    setCalibrationPoints,
    setDrawingPoints,
    setSlicePoints,
    setActivePlotId,
    setSelectedPlotIds,
  } = props;

  switch (stepId) {
    case "calibrate":
      setMode("calibrate");
      setCalibrationPoints([]);
      break;
    case "draw":
      setMode("draw");
      setDrawingPoints([]);
      setActivePlotId(null);
      break;
    case "slice":
      setMode("slice");
      setSlicePoints([]);
      setActivePlotId(null);
      break;
    case "subdivide":
      setMode("view");
      setActivePlotId(null);
      break;
    case "status":
      setMode("bulk");
      setActivePlotId(null);
      setSelectedPlotIds([]);
      break;
    case "done":
      setMode("view");
      setActivePlotId(null);
      setSelectedPlotIds([]);
      break;
  }
}

export default function DigitizingWizard({
  open,
  stepIndex,
  setStepIndex,
  onClose,
  setMode,
  setCalibrationPoints,
  setDrawingPoints,
  setSlicePoints,
  setActivePlotId,
  setSelectedPlotIds,
}: DigitizingWizardProps) {
  if (!open) return null;

  const safeIndex = Math.min(Math.max(stepIndex, 0), STEPS.length - 1);
  const step = STEPS[safeIndex];
  const toolProps = {
    setMode,
    setCalibrationPoints,
    setDrawingPoints,
    setSlicePoints,
    setActivePlotId,
    setSelectedPlotIds,
  };

  const goTo = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), STEPS.length - 1);
    setStepIndex(clamped);
    activateStep(STEPS[clamped].id, toolProps);
  };

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-theme-card shadow-xl border border-theme-border rounded-theme p-4 z-30 w-[min(92vw,24rem)] space-y-3 animate-fadeIn text-sm">
      <div className="flex justify-between items-center border-b border-theme-border pb-2">
        <h3 className="font-semibold text-theme-text">
          Digitizing wizard ({safeIndex + 1}/{STEPS.length})
        </h3>
        <button
          type="button"
          onClick={() => {
            setMode("view");
            onClose();
          }}
          aria-label="Close wizard"
          className={
            "min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme text-theme-muted " +
            "hover:text-theme-text hover:bg-theme-surface transition-colors " +
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
          }
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div>
        <p className="font-semibold text-theme-text text-sm">{step.title}</p>
        <p className="text-[10px] text-theme-muted mt-1">{step.hint}</p>
      </div>

      <div className="flex flex-wrap gap-1">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(i)}
            className={`min-h-8 px-2 rounded-theme text-[10px] font-semibold border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
              i === safeIndex
                ? "bg-theme-accent text-theme-accent-fg border-theme-accent"
                : "bg-theme-surface text-theme-muted border-theme-border hover:bg-theme-card"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={safeIndex === 0}
          onClick={() => goTo(safeIndex - 1)}
          className={`${settingsBtn} border border-theme-border text-theme-text hover:bg-theme-surface disabled:opacity-40 disabled:pointer-events-none`}
        >
          Back
        </button>
        {safeIndex < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => goTo(safeIndex + 1)}
            className={`${settingsBtn} bg-theme-accent text-theme-accent-fg hover:opacity-90`}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              activateStep("done", toolProps);
              onClose();
            }}
            className={`${settingsBtn} bg-theme-success text-white hover:opacity-90`}
          >
            Finish
          </button>
        )}
      </div>
    </div>
  );
}

export { STEPS as DIGITIZING_WIZARD_STEPS, activateStep as activateDigitizingWizardStep };
