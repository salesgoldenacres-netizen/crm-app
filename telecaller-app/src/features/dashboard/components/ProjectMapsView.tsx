import { Link } from "react-router-dom";
import { useState } from "react";
import { Search, Map, MapPin } from "lucide-react";
import { Project, Plot } from "@/shared/types";
import InteractionDialog, {
  type InteractionDialogState,
} from "@/shared/components/ui/InteractionDialog";

interface ProjectMapsViewProps {
  activeTab: "projects" | "map";
  projects: Record<string, Project>;
  projectSearchQuery: string;
  setProjectSearchQuery: (val: string) => void;
  mapSelectedProject: string;
  setMapSelectedProject: (val: string) => void;
}

interface MatchedPlotInfo {
  project: Project;
  plot: Plot;
}

export default function ProjectMapsView({
  activeTab,
  projects,
  projectSearchQuery,
  setProjectSearchQuery,
  mapSelectedProject,
  setMapSelectedProject,
}: ProjectMapsViewProps) {
  const [interaction, setInteraction] =
    useState<InteractionDialogState | null>(null);
  if (activeTab === "projects") {
    const query = projectSearchQuery.toLowerCase();
    const filteredProjects = Object.values(projects).filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query)
    );

    // Search matches plots in projects
    const matchedPlots: MatchedPlotInfo[] = [];
    if (query.trim() !== "") {
      Object.values(projects).forEach((project) => {
        project.plots?.forEach((plot) => {
          if (plot.number && plot.number.toLowerCase().includes(query)) {
            matchedPlots.push({ project, plot });
          }
        });
      });
    }

    return (
      <div className="space-y-3">
        <div className="rounded-theme border border-theme-border bg-theme-card px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-theme-text tracking-tight leading-tight">
              {projectSearchQuery ? "Matching Projects" : "Available Projects"}
            </h1>
            <p className="text-[10px] text-theme-muted mt-0.5 leading-snug">
              Browse layouts and jump into interactive project maps.
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-theme-muted" />
            </div>
            <input
              type="text"
              className="block w-full pl-8 pr-2.5 h-8 border border-theme-border bg-theme-surface text-theme-text rounded-lg text-[11px] font-semibold outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-ring/20 transition-colors"
              placeholder="Search projects, location, or plot number…"
              value={projectSearchQuery}
              onChange={(e) => setProjectSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Matched Plots Section */}
        {matchedPlots.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-theme-text mb-2">
              Plots matching "{projectSearchQuery}"
            </h2>
            <div className="bg-theme-card rounded-theme overflow-hidden border border-theme-border transition-colors">
              <ul className="divide-y divide-theme-border">
                {matchedPlots.map(({ project, plot }, idx) => (
                  <li
                    key={idx}
                    className="p-3 hover:bg-theme-surface flex flex-col sm:flex-row sm:justify-between sm:items-center transition-colors"
                  >
                    <div className="mb-2 sm:mb-0 flex flex-col sm:block">
                      <span className="font-bold text-theme-text text-sm mr-2">
                        {plot.number}
                      </span>
                      <span className="text-theme-muted text-xs">
                        in {project.name}
                      </span>
                      {plot.price && (
                        <span className="text-theme-muted text-xs ml-0 sm:ml-2 mt-1 sm:mt-0 block sm:inline">
                          • {plot.price}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end space-x-4 w-full sm:w-auto">
                      <span
                        className={`px-2 py-1 text-[10px] font-semibold rounded-full capitalize
                        ${
                          plot.status === "available"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400"
                            : plot.status === "sold"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400"
                        }`}
                      >
                        {plot.status}
                      </span>
                      <Link
                        to={`/project/${project.id}`}
                        className="text-theme-accent hover:opacity-80 text-xs font-semibold"
                      >
                        View on Map →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const availablePlots = (project.plots || []).filter(
              (p) => p.status === "available"
            ).length;
            return (
              <div
                key={project.id}
                className="bg-theme-card overflow-hidden shadow-sm border border-theme-border rounded-theme hover:shadow-md transition-all"
              >
                <div className="p-3.5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-theme-accent-muted rounded-lg p-2">
                      <Map className="h-4 w-4 text-theme-accent" />
                    </div>
                    <div className="ml-3 w-0 flex-1">
                      <dl>
                        <dt className="text-[10px] font-medium text-theme-muted truncate">
                          {project.location}
                        </dt>
                        <dd>
                          <div className="text-sm font-bold text-theme-text truncate">
                            {project.name}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-theme-surface px-3.5 py-2 border-t border-theme-border transition-colors">
                  <div className="flex justify-between text-xs">
                    <div className="text-theme-muted">
                      Plots:{" "}
                      <span className="font-medium text-theme-text">
                        {project.totalPlots}
                      </span>
                    </div>
                    <div className="text-green-600 dark:text-green-400 font-bold">
                      {availablePlots} Available
                    </div>
                  </div>
                </div>
                <div className="bg-theme-card px-3.5 py-2 border-t border-theme-border transition-colors">
                  <Link
                    to={`/project/${project.id}`}
                    className="text-theme-accent hover:opacity-80 text-xs font-semibold flex items-center justify-center w-full"
                  >
                    View Interactive Map →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Renders "map" view
  return (
    <div className="w-full max-w-full mx-auto space-y-3">
      <div className="rounded-theme border border-theme-border bg-theme-card px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-theme-text tracking-tight leading-tight flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
            Interactive Inventory Map
          </h2>
          <p className="text-[10px] text-theme-muted mt-0.5 leading-snug">
            Select a project to inspect plot inventory on the layout.
          </p>
        </div>
        <select
          className="text-[11px] font-semibold h-8 border border-theme-border bg-theme-surface text-theme-text rounded-lg px-2.5 outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-ring/20"
          onChange={(e) => setMapSelectedProject(e.target.value)}
          value={mapSelectedProject}
        >
          {Object.values(projects).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {mapSelectedProject && projects[mapSelectedProject] ? (
        <div className="bg-theme-card rounded-theme shadow border border-theme-border p-4">
          <div className="relative w-full aspect-[4/3] bg-theme-surface rounded-lg overflow-hidden border border-theme-border">
            <div
              className="absolute inset-0 bg-contain bg-no-repeat bg-center"
              style={{
                backgroundImage: `url(${projects[mapSelectedProject].image})`,
              }}
            >
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
              >
                {projects[mapSelectedProject].plots?.map((plot) => (
                  <polygon
                    key={plot.id}
                    points={plot.points
                      ?.map((p: any) => {
                        if (Array.isArray(p)) return `${p[0]},${p[1]}`;
                        if (p.x !== undefined && p.y !== undefined) return `${p.x},${p.y}`;
                        return "";
                      })
                      .join(" ")}
                    fill={
                      plot.status === "available"
                        ? "rgba(34, 197, 94, 0.4)"
                        : plot.status === "sold"
                          ? "rgba(239, 68, 68, 0.4)"
                          : plot.status === "booked"
                            ? "rgba(234, 179, 8, 0.4)"
                            : plot.status === "hold"
                              ? "rgba(100, 116, 139, 0.6)"
                              : "rgba(156, 163, 175, 0.4)"
                    }
                    stroke={
                      plot.status === "available"
                        ? "rgb(34, 197, 94)"
                        : plot.status === "sold"
                          ? "rgb(239, 68, 68)"
                          : plot.status === "booked"
                            ? "rgb(234, 179, 8)"
                            : "rgb(156, 163, 175)"
                    }
                    strokeWidth="0.2"
                    className="transition-opacity hover:opacity-80 cursor-pointer"
                    onClick={() => {
                      setInteraction({
                        mode: "alert",
                        title: `Plot ${plot.number}`,
                        description: `Status: ${plot.status} · Size: ${plot.size} sqft · Price: ₹${plot.price || "N/A"}`,
                      });
                    }}
                  />
                ))}
              </svg>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-theme-muted">
          Please select a project to view its map.
        </div>
      )}

      <InteractionDialog
        state={interaction}
        onClose={() => setInteraction(null)}
      />
    </div>
  );
}
