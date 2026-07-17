import { Map } from "lucide-react";
import { Project, Lead } from "@/shared/types";

interface PlotLocatorProps {
  activeProj: Project | undefined;
  activeLead: Lead;
}

export default function PlotLocator({ activeProj, activeLead }: PlotLocatorProps) {
  if (!activeProj || !activeLead.plotId) return null;

  const plotObj = activeProj.plots?.find(
    (p) => p.number === activeLead.plotId || p.id === activeLead.plotId
  );
  if (!plotObj || !plotObj.points || plotObj.points.length === 0) return null;

  let pointsStr: string;
  let minX: number, maxX: number, minY: number, maxY: number;
  let w: number, h: number;
  let vb: string;
  const padding = 15;

  try {
    pointsStr = plotObj.points.map((pt: any) => {
      if (Array.isArray(pt)) return pt.join(",");
      if (pt.x !== undefined && pt.y !== undefined) return `${pt.x},${pt.y}`;
      return "";
    }).join(" ");

    const xCoords = plotObj.points.map((p: any) => (Array.isArray(p) ? p[0] : p.x || 0));
    const yCoords = plotObj.points.map((p: any) => (Array.isArray(p) ? p[1] : p.y || 0));

    minX = Math.min(...xCoords);
    maxX = Math.max(...xCoords);
    minY = Math.min(...yCoords);
    maxY = Math.max(...yCoords);
    w = maxX - minX;
    h = maxY - minY;
    vb = `${minX - padding} ${minY - padding} ${w + padding * 2} ${h + padding * 2}`;
  } catch (e) {
    console.error("PlotLocator points parsing error:", e);
    return null;
  }

  return (
    <div className="card-premium p-6 space-y-4 hover:border-theme-accent/40 transition-all duration-300">
      <h4 className="text-xs font-black text-theme-muted uppercase tracking-wider flex items-center">
        <Map className="w-4 h-4 mr-1.5 text-theme-accent" />
        Interactive Plot Locator
      </h4>
      <div className="bg-theme-surface border border-theme-border rounded-xl flex items-center justify-center p-3.5 h-40 relative overflow-hidden bg-[linear-gradient(color-mix(in_srgb,var(--primary-color)_8%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--primary-color)_8%,transparent)_1px,transparent_1px)] bg-[size:16px_16px]">
        <div className="absolute inset-0 bg-radial-gradient from-[color-mix(in_srgb,var(--primary-color)_10%,transparent)] via-transparent to-transparent pointer-events-none" />

        <svg
          viewBox={vb}
          className="w-full h-full max-h-32 drop-shadow-sm"
        >
          <rect
            x={minX - padding}
            y={minY - padding}
            width={w + padding * 2}
            height={h + padding * 2}
            fill="none"
            stroke="currentColor"
            className="text-theme-border"
            strokeWidth="0.5"
          />
          <line
            x1={minX - padding}
            y1={minY - 5}
            x2={maxX + padding}
            y2={minY - 5}
            stroke="currentColor"
            className="text-theme-accent/20"
            strokeWidth="3"
          />
          <polygon
            points={pointsStr}
            className="fill-[color-mix(in_srgb,var(--primary-color)_20%,transparent)] stroke-[var(--primary-color)] animate-pulse"
            strokeWidth="1.5"
          />
          <text
            x={(minX + maxX) / 2}
            y={(minY + maxY) / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[5px] font-black fill-[var(--primary-color)]"
          >
            {plotObj.number}
          </text>
        </svg>
        <div className="absolute bottom-2.5 right-3 text-[10px] text-slate-600 dark:text-slate-350 font-bold bg-white/90 dark:bg-slate-800/90 px-2 py-0.5 rounded border border-theme-border">
          Area: {plotObj.size} sqft
        </div>
      </div>
      <div className="text-xs text-slate-500 dark:text-gray-400 flex justify-between font-bold mt-1 bg-theme-surface/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
        <span>
          Rate:{" "}
          <strong className="text-slate-800 dark:text-white">
            ₹{plotObj.rate || "0"}/sqft
          </strong>
        </span>
        <span>
          Total Price:{" "}
          <strong className="text-theme-accent">
            ₹{plotObj.price || "0"}
          </strong>
        </span>
      </div>
    </div>
  );
}
