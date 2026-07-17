import { useState, useRef, useEffect, useMemo } from "react";

interface Stage {
  label: string;
  status: string;
  color: string;
}

interface SegmentedStageTrackerProps {
  status: string;
  onChange?: (status: string) => void;
}

const stages: Stage[] = [
  {
    label: "Inbox",
    status: "new",
    color:
      "bg-purple-500 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50",
  },
  {
    label: "Engaged",
    status: "interested",
    color:
      "bg-amber-500 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50",
  },
  {
    label: "Visit",
    status: "site-visit-confirmed",
    color:
      "bg-blue-500 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50",
  },
  {
    label: "Booked",
    status: "booked",
    color:
      "bg-emerald-500 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50",
  },
  {
    label: "Lost",
    status: "not-interested",
    color:
      "bg-rose-500 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50",
  },
];

export default function SegmentedStageTracker({ status, onChange }: SegmentedStageTrackerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
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
        return 0; // Inbox / New
      case "contacted":
      case "re-engaged":
      case "interested":
      case "rnr":
        return 1; // Engaged / Working
      case "site-visit-confirmed":
      case "site-visit-completed":
        return 2; // Site Visit
      case "booked":
      case "reserved":
        return 3; // Booked / Closed Won
      case "not-interested":
        return -1; // Lost
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
          className={`w-full flex items-center justify-between px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded border transition-all duration-200 shadow-sm cursor-pointer select-none bg-white dark:bg-gray-800 ${currentStage.color.split(" ")[1]} ${currentStage.color.split(" ")[2]} border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none`}
        >
          <span className="flex items-center gap-1.5 truncate">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentStage.color.split(" ")[0]}`}
            />
            <span className="truncate">{currentStage.label}</span>
          </span>
          <svg
            className="w-2.5 h-2.5 ml-1 opacity-60 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>
      ) : (
        <div
          className={`w-full flex items-center px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded border bg-white dark:bg-gray-800 ${currentStage.color.split(" ")[1]} ${currentStage.color.split(" ")[2]} border-gray-200 dark:border-gray-700 select-none`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${currentStage.color.split(" ")[0]}`}
          />
          <span className="truncate">{currentStage.label}</span>
        </div>
      )}

      {isOpen && (
        <div className="origin-top-left absolute left-0 mt-1 w-36 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50 py-1 transition-all">
          {stages.map((stage) => {
            const isSelected = stage.status === currentStage.status;
            return (
              <button
                key={stage.status}
                type="button"
                onClick={() => handleSelect(stage.status)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-left transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  isSelected
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${stage.color.split(" ")[0]}`}
                  />
                  {stage.label}
                </span>
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-indigo-600 dark:text-indigo-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
