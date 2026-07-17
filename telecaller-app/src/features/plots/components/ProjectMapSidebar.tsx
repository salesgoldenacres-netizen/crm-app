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

export default function ProjectMapSidebar({
  selectedPlot,
  setSelectedPlot,
  searchQuery,
  setSearchQuery,
  filter,
  setFilter,
  handleSearchPlot,
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
}: ProjectMapSidebarProps) {
  return (
    <div className="w-full md:w-80 h-1/2 md:h-full bg-theme-card border-t md:border-t-0 md:border-l border-theme-border flex flex-col transition-all duration-300 z-10 shadow-2xl">
      <div className="p-3 md:p-4 border-b border-theme-border space-y-4">
        {/* Quick Search */}
        <div>
          <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
            <Search className="w-3.5 h-3.5 mr-1 text-indigo-500 dark:text-indigo-400" />{" "}
            Search Plot
          </label>
          <div className="relative flex items-center bg-theme-bg rounded-xl px-3 py-2 border border-theme-border hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <input
              type="text"
              placeholder="Enter plot number..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearchPlot(e.target.value);
              }}
              className="bg-transparent border-none outline-none text-xs text-slate-800 dark:text-slate-100 w-full pr-6 font-medium placeholder-slate-400 dark:placeholder-slate-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Filters
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              "all",
              "available",
              "sold",
              "reserved",
              "road",
              "market",
              "park",
            ].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  "px-3 py-1 rounded-full text-[10px] font-bold capitalize transition-all duration-200 border cursor-pointer",
                  filter === f
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/15"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {selectedPlot ? (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <h3 className="text-lg font-black text-slate-800 dark:text-white">
                {["road", "market", "park"].includes(selectedPlot.status)
                  ? selectedPlot.status.toUpperCase()
                  : `Plot ${selectedPlot.number}`}
              </h3>
              <div className="flex items-center space-x-2">
                <span
                  className={clsx(
                    "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border tracking-wider",
                    getStatusBadge(selectedPlot.status)
                  )}
                >
                  {selectedPlot.status}
                </span>
                <button
                  onClick={() => setSelectedPlot(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {selectedPlot.number && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900">
                  <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-indigo-500 dark:text-indigo-400" />{" "}
                    ID / Number
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {selectedPlot.number}
                  </span>
                </div>
              )}
              {(selectedPlot.size || project.scaleRatio) && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900">
                  <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center">
                    <Ruler className="w-3.5 h-3.5 mr-1.5 text-indigo-500 dark:text-indigo-400" />{" "}
                    Size
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {selectedPlot.size
                      ? selectedPlot.size
                      : calculatePolygonArea(
                          selectedPlot.points,
                          project.scaleRatio
                        )}{" "}
                    Sq.Ft
                  </span>
                </div>
              )}
              {selectedPlot.rate && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900">
                  <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center">
                    <IndianRupee className="w-3.5 h-3.5 mr-1.5 text-indigo-500 dark:text-indigo-400" />{" "}
                    Rate/Sq.Ft
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    ₹{selectedPlot.rate}
                  </span>
                </div>
              )}
              {(selectedPlot.price ||
                (selectedPlot.rate && project.scaleRatio)) && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 dark:bg-theme-accent-muted border border-indigo-100 dark:border-indigo-900/30">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center">
                    <IndianRupee className="w-3.5 h-3.5 mr-1.5" /> Total
                    Price
                  </span>
                  <span className="font-black text-base text-indigo-600 dark:text-indigo-300">
                    ₹
                    {selectedPlot.price
                      ? selectedPlot.price
                      : (
                          calculatePolygonArea(
                            selectedPlot.points,
                            project.scaleRatio
                          ) * parseFloat(selectedPlot.rate)
                        ).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 space-y-4">
              {user.role === "admin" && (
                <Link
                  to={`/admin/project/${project.id}/edit`}
                  className="block w-full text-center py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 font-bold text-xs transition-colors"
                >
                  Edit Area Details
                </Link>
              )}

              {/* Lead Integration Section */}
              {!["road", "market", "park"].includes(selectedPlot.status) &&
                (() => {
                  const plotLeads = leads.filter(
                    (leadItem) =>
                      leadItem.projectId === project.id &&
                      (leadItem.plotId === selectedPlot.number ||
                        leadItem.plotId === selectedPlot.id)
                  );
                  return (
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3 text-xs">
                      <h4 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center">
                        <ClipboardList className="w-3.5 h-3.5 mr-1 text-indigo-500 dark:text-indigo-400" />
                        Associated Leads ({plotLeads.length})
                      </h4>

                      {plotLeads.length > 0 ? (
                        <div className="space-y-2">
                          {plotLeads.map((leadItem) => (
                            <div
                              key={leadItem.id}
                              className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-900 text-xs"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-white text-sm flex items-center">
                                    {leadItem.name}
                                    {leadItem.priority === "hot" && (
                                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                        HOT 🔥
                                      </span>
                                    )}
                                    {leadItem.priority === "cold" && (
                                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        COLD ❄️
                                      </span>
                                    )}
                                  </span>
                                  <div className="text-theme-muted mt-0.5 font-bold">
                                    {leadItem.phone}
                                  </div>
                                </div>
                                <span
                                  className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase border ${getStatusBadge(leadItem.status)}`}
                                >
                                  {leadItem.status}
                                </span>
                              </div>
                              {leadItem.notes && (
                                <p className="text-slate-500 dark:text-slate-400 mt-2 italic bg-slate-100 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-900">
                                  {leadItem.notes}
                                </p>
                              )}
                              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-900 pt-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartCall(leadItem)}
                                  className="inline-flex items-center text-indigo-550 dark:text-indigo-400 font-bold hover:underline cursor-pointer border-0 bg-transparent"
                                >
                                  <Phone className="w-3.5 h-3.5 mr-1" />{" "}
                                  Call Client
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMapLead(leadItem);
                                    setCallLogForm({
                                      note: "",
                                      status: leadItem.status,
                                      followUpDate: leadItem.followUpDate || "",
                                    });
                                  }}
                                  className="inline-flex items-center bg-indigo-600 hover:bg-theme-accent text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/10 border-0"
                                >
                                  Log Call
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-2 text-slate-500 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-900 rounded-xl p-3">
                          <p className="mb-2 text-xs font-medium">
                            No customer leads linked to this plot.
                          </p>
                          <button
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
                            className="inline-flex items-center px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                            <span>Link or Create Lead</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-theme-muted text-center">
            <Info className="w-12 h-12 mb-2 opacity-35 text-indigo-400" />
            <p className="text-xs font-semibold leading-relaxed">
              Select an area on the map
              <br />
              to view details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
