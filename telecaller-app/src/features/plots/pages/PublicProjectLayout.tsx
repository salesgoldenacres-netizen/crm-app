import { useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import ProjectMapCanvas from "@/features/plots/components/ProjectMapCanvas";
import Badge from "@/shared/components/ui/Badge";
import type { Plot } from "@/shared/types";
import { areaSqFt } from "@/features/plots/utils/adminMapMetrics";

/**
 * Authenticated public layout share view.
 * Requires sign-in (Firestore projects read is auth-only). Token must match
 * project.publicLayout.shareToken when publicLayout.enabled is true.
 * Route: /public/layout/:projectId?token=
 */
export default function PublicProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const { projects, isLoaded } = useProjectsStore();
  const project = projectId ? projects[projectId] : undefined;

  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [hoveredPlot, setHoveredPlot] = useState<Plot | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showLabels, setShowLabels] = useState(true);
  const [flashPlotId] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const transformRef = useRef<unknown>(null);

  const handleImageLoad = () => {
    const t = transformRef.current as { centerView?: () => void } | null;
    t?.centerView?.();
  };

  const calculatePolygonArea = (
    points: [number, number][] | undefined,
    scaleRatio: number | null | undefined
  ) => {
    if (!points || points.length < 3) return 0;
    if (scaleRatio && Number.isFinite(scaleRatio)) {
      return Math.round(areaSqFt(points, scaleRatio));
    }
    return 0;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (hoveredPlot && mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handlePlotHover = (plot: Plot, e: MouseEvent) => {
    setHoveredPlot(plot);
    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const filteredPlots = useMemo(() => {
    if (!project?.plots) return [];
    const phases = project.phases || [];
    if (!phases.length) return project.plots;
    const visible = new Set(
      phases.filter((p) => p.visible).map((p) => p.id)
    );
    return project.plots.filter(
      (p) => !p.phase || visible.has(p.phase)
    );
  }, [project]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center">
        <div
          className="w-16 h-16 border-4 border-theme-accent border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Loading public layout"
        />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-10 text-center text-theme-text">Project not found</div>
    );
  }

  const layout = project.publicLayout;
  const tokenOk =
    !!layout?.enabled &&
    !!layout.shareToken &&
    !!token &&
    layout.shareToken === token;

  if (!tokenOk) {
    return (
      <div className="p-10 text-center text-theme-muted">
        This layout share link is invalid or disabled.
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-theme-bg text-theme-text transition-colors duration-300">
      <header className="bg-theme-card/85 backdrop-blur-md border-b border-theme-border z-10">
        <div className="px-3 md:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              to="/"
              className="p-1.5 min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme bg-theme-surface hover:bg-theme-card text-theme-muted hover:text-theme-text transition-all border border-theme-border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              title="Back to CRM"
              aria-label="Back to CRM"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </Link>
            <h1 className="type-card-title text-theme-text truncate max-w-[150px] md:max-w-none tracking-tight">
              {project.name}
            </h1>
            <span className="text-[10px] text-theme-muted uppercase tracking-wider hidden sm:inline">
              Public layout
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex flex-col md:flex-row space-y-1 md:space-y-0 md:space-x-2">
              <Badge variant="success" className="normal-case tracking-wide">
                <span className="hidden sm:inline">Available: </span>
                <span className="sm:hidden">Avail: </span>
                {filteredPlots.filter((p) => p.status === "available").length}
              </Badge>
              <Badge variant="danger" className="normal-case tracking-wide">
                <span className="hidden sm:inline">Sold: </span>
                <span className="sm:hidden">Sold: </span>
                {filteredPlots.filter((p) => p.status === "sold").length}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <ProjectMapCanvas
          project={project}
          filteredPlots={filteredPlots}
          selectedPlot={selectedPlot}
          setSelectedPlot={setSelectedPlot}
          hoveredPlot={hoveredPlot}
          setHoveredPlot={setHoveredPlot}
          tooltipPos={tooltipPos}
          setTooltipPos={setTooltipPos}
          mapContainerRef={mapContainerRef}
          transformRef={transformRef}
          handleImageLoad={handleImageLoad}
          handleMouseMove={handleMouseMove}
          handlePlotHover={handlePlotHover}
          showLabels={showLabels}
          setShowLabels={setShowLabels}
          flashPlotId={flashPlotId}
          calculatePolygonArea={calculatePolygonArea}
        />

        {selectedPlot && (
          <aside
            className="w-full md:w-80 bg-theme-card border-t md:border-t-0 md:border-l border-theme-border p-4 overflow-y-auto flex-shrink-0"
            aria-label="Plot details"
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="text-xs font-semibold text-theme-muted uppercase tracking-wider">
                  Plot
                </p>
                <p className="font-semibold text-theme-text text-lg">
                  {selectedPlot.number || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlot(null)}
                className="min-h-11 px-3 text-xs font-semibold text-theme-muted hover:text-theme-text rounded-theme hover:bg-theme-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              >
                Close
              </button>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-theme-muted">Status</dt>
                <dd className="text-theme-text capitalize">{selectedPlot.status}</dd>
              </div>
              {selectedPlot.size ? (
                <div className="flex justify-between">
                  <dt className="text-theme-muted">Size</dt>
                  <dd className="text-theme-text">{selectedPlot.size} Sq.Ft</dd>
                </div>
              ) : null}
              {selectedPlot.price ? (
                <div className="flex justify-between">
                  <dt className="text-theme-muted">Price</dt>
                  <dd className="text-theme-text">₹{selectedPlot.price}</dd>
                </div>
              ) : null}
            </dl>
          </aside>
        )}
      </div>
    </div>
  );
}
