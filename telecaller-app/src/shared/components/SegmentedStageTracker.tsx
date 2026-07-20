import { useState, useRef, useEffect, useMemo } from "react";

interface Stage {
  label: string;
  status: string;
  /** Dot color class only — chrome uses theme surfaces. */
  dot: string;
  text: string;
}

interface SegmentedStageTrackerProps {
  status: string;
  onChange?: (status: string) => void;
}

const stages: Stage[] = [
  {
    label: "Inbox",
    status: "new",
    dot: "bg-theme-accent",
    text: "text-theme-accent",
  },
  {
    label: "Engaged",
    status: "interested",
    dot: "bg-theme-warning",
    text: "text-theme-warning",
  },
  {
    label: "Visit",
    status: "site-visit-confirmed",
    dot: "bg-theme-accent",
    text: "text-theme-accent",
  },
  {
    label: "Booked",
    status: "booked",
    dot: "bg-theme-success",
    text: "text-theme-success",
  },
  {
    label: "Lost",
    status: "not-interested",
    dot: "bg-theme-danger",
    text: "text-theme-danger",
  },
];

const chromeBase =
  "w-full flex items-center px-2 py-1 text-[9px] font-semibold uppercase tracking-wider rounded-theme border border-theme-border bg-theme-card select-none";

export default function SegmentedStageTracker({ status, onChange }: SegmentedStageTrackerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentStageIndex = useMemo(() => {
    switch (status) {
      case "raw":
      case "new":
      case "not-attempted":
        return 0;
      case "contacted":
      case "re-engaged":
      case "interested":
      case "rnr":
        return 1;
      case "site-visit-confirmed":
      case "site-visit-completed":
        return 2;
      case "booked":
      case "reserved":
        return 3;
      case "not-interested":
        return -1;
      default:
        return 0;
    }
  }, [status]);

  const currentStage = useMemo(() => {
    if (currentStageIndex === -1) return stages[4];
    return stages[currentStageIndex] || stages[0];
  }, [currentStageIndex]);

  const handleSelect = (targetStatus: string) => {
    setIsOpen(false);
    if (onChange) {
      onChange(targetStatus);
    }
  };

  const isInteractive = !!onChange;

  return (
    <div
      className="relative inline-block text-left w-full max-w-[120px]"
      ref={dropdownRef}
    >
      {isInteractive ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`${chromeBase} justify-between transition-colors cursor-pointer hover:bg-theme-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${currentStage.text}`}
        >
          <span className="flex items-center gap-1.5 truncate">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentStage.dot}`}
              aria-hidden
            />
            <span className="truncate">{currentStage.label}</span>
          </span>
          <svg
            className="w-2.5 h-2.5 ml-1 opacity-60 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>
      ) : (
        <div className={`${chromeBase} ${currentStage.text}`}>
          <span
            className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${currentStage.dot}`}
            aria-hidden
          />
          <span className="truncate">{currentStage.label}</span>
        </div>
      )}

      {isOpen && (
        <div className="origin-top-left absolute left-0 mt-1 w-36 rounded-theme shadow-elevation-md bg-theme-card border border-theme-border z-50 py-1">
          {stages.map((stage) => {
            const isSelected = stage.status === currentStage.status;
            return (
              <button
                key={stage.status}
                type="button"
                onClick={() => handleSelect(stage.status)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-left transition-colors cursor-pointer hover:bg-theme-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                  isSelected
                    ? "text-theme-accent bg-theme-accent-muted"
                    : "text-theme-text"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${stage.dot}`}
                    aria-hidden
                  />
                  {stage.label}
                </span>
                {isSelected && (
                  <span className="text-theme-accent" aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
