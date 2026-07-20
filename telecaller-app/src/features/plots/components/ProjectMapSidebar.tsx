import { Link } from "react-router-dom";
import {
  Search,
  X,
  Filter,
  MapPin,
  Ruler,
  IndianRupee,
  ClipboardList,
  Phone,
  PlusCircle,
  Info,
} from "lucide-react";
import clsx from "clsx";
import { Plot, Project, Lead, User } from "@/shared/types";
import Drawer from "@/shared/components/ui/Drawer";
import Button from "@/shared/components/ui/Button";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";

interface ProjectMapSidebarProps {
  selectedPlot: Plot | null;
  setSelectedPlot: (plot: Plot | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filter: string;
  setFilter: (filter: string) => void;
  handleSearchPlot: (number: string) => void;
  getStatusBadge: (status: string) => string;
  calculatePolygonArea: (
    points: [number, number][] | undefined,
    scaleRatio: number | null | undefined
  ) => number;
  project: Project;
  leads: Lead[];
  user: User;
  handleStartCall: (lead: Lead) => void;
  setActiveMapLead: (lead: Lead) => void;
  setCallLogForm: (form: { note: string; status: string; followUpDate: string }) => void;
  setIsLinkLeadModalOpen: (open: boolean) => void;
  setLeadLinkMode: (mode: "existing" | "new") => void;
  setSelectedExistingLeadId: (id: string) => void;
  setNewLeadForm: (form: {
    name: string;
    phone: string;
    email: string;
    notes: string;
    priority: "warm" | "hot" | "cold";
  }) => void;
}

const iconBtn =
  "min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme " +
  "text-theme-muted hover:text-theme-text hover:bg-theme-surface transition-colors cursor-pointer " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";

export default function ProjectMapSidebar(props: ProjectMapSidebarProps) {
  const { selectedPlot, setSelectedPlot } = props;
  const isMdUp = useMediaQuery("(min-width: 768px)");

  const searchFilters = <SearchAndFilters {...props} />;
  const plotDetails = selectedPlot ? (
    <PlotDetailsBody {...props} selectedPlot={selectedPlot} showClose={isMdUp} />
  ) : (
    <EmptyPlotHint />
  );

  if (!isMdUp) {
    return (
      <>
        <div className="w-full bg-theme-card border-t border-theme-border z-10 shadow-lg">
          <div className="p-3 space-y-3">{searchFilters}</div>
        </div>
        <Drawer
          isOpen={!!selectedPlot}
          onClose={() => setSelectedPlot(null)}
          title={
            selectedPlot
              ? ["road", "market", "park"].includes(selectedPlot.status)
                ? selectedPlot.status.toUpperCase()
                : `Plot ${selectedPlot.number}`
              : "Plot details"
          }
          position="bottom"
          size="lg"
        >
          {selectedPlot && (
            <PlotDetailsBody {...props} selectedPlot={selectedPlot} showClose={false} />
          )}
        </Drawer>
      </>
    );
  }

  return (
    <aside
      className="hidden md:flex w-80 h-full bg-theme-card border-l border-theme-border flex-col transition-all duration-300 z-10 shadow-xl"
      aria-label="Map plot details"
    >
      <div className="p-4 border-b border-theme-border space-y-4">{searchFilters}</div>
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">{plotDetails}</div>
    </aside>
  );
}

function SearchAndFilters({
  searchQuery,
  setSearchQuery,
  handleSearchPlot,
  filter,
  setFilter,
}: Pick<
  ProjectMapSidebarProps,
  "searchQuery" | "setSearchQuery" | "handleSearchPlot" | "filter" | "setFilter"
>) {
  return (
    <>
      <div>
        <label className="block text-[10px] font-semibold text-theme-muted uppercase tracking-widest mb-1.5 flex items-center">
          <Search className="w-3.5 h-3.5 mr-1 text-theme-accent" aria-hidden="true" /> Search
          Plot
        </label>
        <div className="relative flex items-center bg-theme-bg rounded-theme px-3 min-h-11 border border-theme-border hover:border-theme-accent/40 transition-colors">
          <input
            type="text"
            placeholder="Enter plot number..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearchPlot(e.target.value);
            }}
            aria-label="Search plot by number"
            className="bg-transparent border-none outline-none text-xs text-theme-text w-full pr-10 font-medium placeholder:text-theme-muted"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className={clsx(iconBtn, "absolute right-1")}
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-[10px] font-semibold text-theme-muted uppercase tracking-widest flex items-center">
          <Filter className="w-3.5 h-3.5 mr-1 text-theme-accent" aria-hidden="true" /> Filters
        </h2>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Plot status filters">
          {["all", "available", "sold", "reserved", "road", "market", "park"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={clsx(
                "min-h-11 px-3 py-2 rounded-theme text-[10px] font-semibold capitalize transition-all duration-200 border cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring",
                filter === f
                  ? "bg-theme-accent border-theme-accent text-theme-accent-fg"
                  : "bg-theme-surface border-theme-border text-theme-muted hover:bg-theme-card hover:text-theme-text"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function EmptyPlotHint() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-theme-muted text-center py-8">
      <Info className="w-12 h-12 mb-2 opacity-35 text-theme-accent" aria-hidden="true" />
      <p className="text-xs font-semibold leading-relaxed">
        Select an area on the map
        <br />
        to view details
      </p>
    </div>
  );
}

function PlotDetailsBody({
  selectedPlot,
  setSelectedPlot,
  getStatusBadge,
  calculatePolygonArea,
  project,
  leads,
  user,
  handleStartCall,
  setActiveMapLead,
  setCallLogForm,
  setIsLinkLeadModalOpen,
  setLeadLinkMode,
  setSelectedExistingLeadId,
  setNewLeadForm,
  showClose,
}: ProjectMapSidebarProps & { selectedPlot: Plot; showClose: boolean }) {
  return (
    <div className="space-y-4 animate-fadeIn">
      {showClose && (
        <div className="flex items-center justify-between border-b border-theme-border pb-3">
          <h3 className="text-lg font-bold text-theme-text">
            {["road", "market", "park"].includes(selectedPlot.status)
              ? selectedPlot.status.toUpperCase()
              : `Plot ${selectedPlot.number}`}
          </h3>
          <div className="flex items-center space-x-2">
            <span
              className={clsx(
                "px-2 py-0.5 rounded-theme text-[10px] font-semibold uppercase border tracking-wider",
                getStatusBadge(selectedPlot.status)
              )}
            >
              {selectedPlot.status}
            </span>
            <button
              type="button"
              onClick={() => setSelectedPlot(null)}
              aria-label="Clear plot selection"
              className={iconBtn}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {!showClose && (
        <div className="flex items-center gap-2 pb-2">
          <span
            className={clsx(
              "px-2 py-0.5 rounded-theme text-[10px] font-semibold uppercase border tracking-wider",
              getStatusBadge(selectedPlot.status)
            )}
          >
            {selectedPlot.status}
          </span>
        </div>
      )}

      <div className="space-y-2.5 text-xs">
        {selectedPlot.number && (
          <div className="flex items-center justify-between p-2.5 rounded-theme bg-theme-surface border border-theme-border">
            <span className="text-theme-muted font-medium flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-theme-accent" aria-hidden="true" /> ID /
              Number
            </span>
            <span className="font-bold text-theme-text">{selectedPlot.number}</span>
          </div>
        )}
        {(selectedPlot.size || project.scaleRatio) && (
          <div className="flex items-center justify-between p-2.5 rounded-theme bg-theme-surface border border-theme-border">
            <span className="text-theme-muted font-medium flex items-center">
              <Ruler className="w-3.5 h-3.5 mr-1.5 text-theme-accent" aria-hidden="true" /> Size
            </span>
            <span className="font-bold text-theme-text">
              {selectedPlot.size
                ? selectedPlot.size
                : calculatePolygonArea(selectedPlot.points, project.scaleRatio)}{" "}
              Sq.Ft
            </span>
          </div>
        )}
        {selectedPlot.rate && (
          <div className="flex items-center justify-between p-2.5 rounded-theme bg-theme-surface border border-theme-border">
            <span className="text-theme-muted font-medium flex items-center">
              <IndianRupee className="w-3.5 h-3.5 mr-1.5 text-theme-accent" aria-hidden="true" />{" "}
              Rate/Sq.Ft
            </span>
            <span className="font-bold text-theme-text">₹{selectedPlot.rate}</span>
          </div>
        )}
        {(selectedPlot.price || (selectedPlot.rate && project.scaleRatio)) && (
          <div className="flex items-center justify-between p-3 rounded-theme bg-theme-accent-muted border border-theme-border">
            <span className="text-theme-accent font-bold flex items-center">
              <IndianRupee className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> Total Price
            </span>
            <span className="font-bold text-base text-theme-accent">
              ₹
              {selectedPlot.price
                ? selectedPlot.price
                : (
                    calculatePolygonArea(selectedPlot.points, project.scaleRatio) *
                    parseFloat(selectedPlot.rate)
                  ).toLocaleString("en-IN")}
            </span>
          </div>
        )}
      </div>

      <div className="pt-2 space-y-4">
        {user.role === "admin" && (
          <Link
            to={`/admin/project/${project.id}/edit`}
            className={
              "block w-full text-center min-h-11 py-2.5 bg-theme-surface border border-theme-border text-theme-muted " +
              "hover:text-theme-text rounded-theme hover:bg-theme-card font-semibold text-xs transition-colors " +
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
            }
          >
            Edit Area Details
          </Link>
        )}

        {!["road", "market", "park"].includes(selectedPlot.status) &&
          (() => {
            const plotLeads = leads.filter(
              (leadItem) =>
                leadItem.projectId === project.id &&
                (leadItem.plotId === selectedPlot.number || leadItem.plotId === selectedPlot.id)
            );
            return (
              <div className="pt-4 border-t border-theme-border space-y-3 text-xs">
                <h4 className="text-[10px] font-semibold text-theme-muted uppercase tracking-widest flex items-center">
                  <ClipboardList
                    className="w-3.5 h-3.5 mr-1 text-theme-accent"
                    aria-hidden="true"
                  />
                  Associated Leads ({plotLeads.length})
                </h4>

                {plotLeads.length > 0 ? (
                  <div className="space-y-2">
                    {plotLeads.map((leadItem) => (
                      <div
                        key={leadItem.id}
                        className="p-3 bg-theme-surface rounded-theme border border-theme-border text-xs"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-theme-text text-sm flex items-center flex-wrap gap-1">
                              {leadItem.name}
                              {leadItem.priority === "hot" && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-theme text-[8px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  HOT
                                </span>
                              )}
                              {leadItem.priority === "cold" && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-theme text-[8px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                  COLD
                                </span>
                              )}
                            </span>
                            <div className="text-theme-muted mt-0.5 font-semibold">
                              {leadItem.phone}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[9px] font-semibold rounded-theme uppercase border ${getStatusBadge(leadItem.status)}`}
                          >
                            {leadItem.status}
                          </span>
                        </div>
                        {leadItem.notes && (
                          <p className="text-theme-muted mt-2 italic bg-theme-bg p-2 rounded-theme border border-theme-border">
                            {leadItem.notes}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-theme-border pt-2.5">
                          <button
                            type="button"
                            onClick={() => handleStartCall(leadItem)}
                            className="inline-flex items-center min-h-11 text-theme-accent font-semibold hover:underline cursor-pointer border-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme px-1"
                          >
                            <Phone className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Call Client
                          </button>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setActiveMapLead(leadItem);
                              setCallLogForm({
                                note: "",
                                status: leadItem.status,
                                followUpDate: leadItem.followUpDate || "",
                              });
                            }}
                          >
                            Log Call
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 text-theme-muted bg-theme-surface border border-theme-border rounded-theme p-3">
                    <p className="mb-2 text-xs font-medium">
                      No customer leads linked to this plot.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLinkLeadModalOpen(true);
                        setLeadLinkMode("existing");
                        setSelectedExistingLeadId("");
                        setNewLeadForm({
                          name: "",
                          phone: "",
                          email: "",
                          notes: "",
                          priority: "warm",
                        });
                      }}
                      className={
                        "inline-flex items-center min-h-11 px-3 py-2 bg-theme-accent-muted hover:opacity-90 text-theme-accent " +
                        "border border-theme-border rounded-theme text-xs font-semibold transition-all cursor-pointer " +
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                      }
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                      <span>Link or Create Lead</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
      </div>
    </div>
  );
}
