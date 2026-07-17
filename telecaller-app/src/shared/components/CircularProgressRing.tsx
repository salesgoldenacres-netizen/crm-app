import React, { useState, useEffect } from "react";

interface CircularProgressRingProps {
  value: number;
  max: number;
  label: string;
  colorClass?: string;
  strokeWidth?: number;
  size?: number;
  inline?: boolean;
}

/**
 * %-to-goal ring. Prefer for progress-toward-target KPIs only
 * (Calls / Bookings / Team Goals). Do not use for arbitrary decoration.
 * API is stable — presentation uses theme tokens.
 */
function CircularProgressRing({
  value,
  max,
  label,
  colorClass = "text-theme-accent",
  strokeWidth = 8,
  size = 80,
  inline = false,
}: CircularProgressRingProps) {
  const actualPct = max > 0 ? Math.round((value / max) * 100) : 0;
  const strokePct = Math.max(0, Math.min(actualPct, 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const finalOffset = circumference - (strokePct / 100) * circumference;

  // Animate stroke from empty → real value on mount
  const [strokeDashoffset, setStrokeDashoffset] = useState(circumference);
  useEffect(() => {
    const t = setTimeout(() => setStrokeDashoffset(finalOffset), 80);
    return () => clearTimeout(t);
  }, [finalOffset]);

  const ring = (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg className="w-full h-full transform -rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          className="text-theme-border"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          className={`${colorClass} transition-all duration-700 ease-out`}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span
          className={`type-kpi text-theme-text leading-none ${
            inline ? "text-xs" : "text-sm"
          }`}
        >
          {value}
        </span>
        <span className="text-[8px] text-theme-muted mt-0.5 leading-none font-medium">
          /{max}
        </span>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="flex flex-col items-center justify-center p-1 w-24">
        {ring}
        <span
          className="type-label text-[9px] text-theme-text mt-1.5 text-center truncate w-full font-medium"
          title={label}
        >
          {label}
        </span>
        <span className="type-secondary text-[8px] text-theme-muted mt-0.5">
          {actualPct}%
        </span>
      </div>
    );
  }

  // Non-inline: no nested gray card — transparent shell so WidgetGrid provides chrome
  return (
    <div className="flex flex-col items-center justify-center p-3.5 w-36 rounded-theme">
      {ring}
      <span
        className="type-label text-[10px] text-theme-text mt-2.5 text-center truncate w-full font-medium"
        title={label}
      >
        {label}
      </span>
      <span className="type-secondary text-[9px] text-theme-muted mt-0.5">
        {actualPct}% Complete
      </span>
    </div>
  );
}

export default React.memo(CircularProgressRing);
