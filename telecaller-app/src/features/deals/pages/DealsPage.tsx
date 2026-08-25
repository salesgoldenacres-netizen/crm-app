import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Trophy,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Building2,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { useDeals } from "../hooks/useDeals";
import { formatCurrency, default as DealsKanbanBoard } from "../components/DealsKanbanBoard";
import CreateDealModal from "../components/CreateDealModal";
import { DEAL_STAGES } from "../types";
import { User } from "@/shared/types";
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useDatabase } from "@/shared/services/DatabaseContext";

interface DealsPageProps {
  user: User;
}

export default function DealsPage({ user }: DealsPageProps) {
  const navigate = useNavigate();
  const { projects } = useProjectsStore();
  const { leads } = useDatabase();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const {
    deals,
    metrics,
    isLoading,
    error,
    createDeal,
    updateDealStage,
    deleteDeal,
  } = useDeals({ projectId: selectedProjectId });

  const projectList = Object.values(projects || {});

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchesSearch =
        !searchQuery ||
        deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.phone.includes(searchQuery) ||
        (deal.plotNumber && deal.plotNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStage = selectedStage === "all" || deal.stage === selectedStage;

      return matchesSearch && matchesStage;
    });
  }, [deals, searchQuery, selectedStage]);

  return (
    <div className="space-y-4 animate-fadeIn p-3 sm:p-4 md:p-6 w-full max-w-none">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-theme-card border border-theme-border rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-theme-accent-muted text-theme-accent">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-theme-text leading-tight">
              Deals & Sales Pipeline
            </h1>
            <p className="text-xs text-theme-muted mt-0.5">
              Track real estate plot transactions, deal stages, and expected revenue pipeline.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-theme-accent text-white font-bold text-xs hover:opacity-95 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Deal</span>
        </button>
      </div>

      {/* KPI Metrics Dashboard Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Pipeline */}
        <div className="bg-theme-card border border-theme-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">
              Total Pipeline
            </p>
            <p className="text-base font-extrabold text-theme-text truncate">
              {formatCurrency(metrics.totalPipelineValue)}
            </p>
            <p className="text-[10px] text-theme-muted">{metrics.totalDeals} Total Deals</p>
          </div>
        </div>

        {/* Card 2: Weighted Forecast */}
        <div className="bg-theme-card border border-theme-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">
              Weighted Forecast
            </p>
            <p className="text-base font-extrabold text-theme-text truncate">
              {formatCurrency(metrics.weightedPipelineValue)}
            </p>
            <p className="text-[10px] text-theme-muted">Probability Weighted</p>
          </div>
        </div>

        {/* Card 3: Closed Won Revenue */}
        <div className="bg-theme-card border border-theme-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">
              Closed Won
            </p>
            <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
              {formatCurrency(metrics.closedWonValue)}
            </p>
            <p className="text-[10px] text-theme-muted">{metrics.closedWonCount} Deals Won</p>
          </div>
        </div>

        {/* Card 4: Win Rate */}
        <div className="bg-theme-card border border-theme-border rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">
              Win Rate
            </p>
            <p className="text-base font-extrabold text-purple-600 dark:text-purple-400 truncate">
              {metrics.winRate}%
            </p>
            <p className="text-[10px] text-theme-muted">Conversion Rate</p>
          </div>
        </div>
      </div>

      {/* Filter & View Switcher Toolbar */}
      <div className="bg-theme-card border border-theme-border rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-theme-muted" />
          <input
            type="text"
            placeholder="Search deals, leads, plot #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-theme-surface border border-theme-border rounded-lg pl-9 pr-3 py-1.5 text-xs font-medium text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent"
          />
        </div>

        {/* Filters & View Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5 bg-theme-surface border border-theme-border rounded-lg px-2.5 py-1 text-xs">
            <Building2 className="w-3.5 h-3.5 text-theme-muted" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-theme-text focus:outline-none cursor-pointer"
            >
              <option value="all">All Projects</option>
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stage Filter */}
          <div className="flex items-center gap-1.5 bg-theme-surface border border-theme-border rounded-lg px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-theme-muted" />
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="bg-transparent text-xs font-semibold text-theme-text focus:outline-none cursor-pointer"
            >
              <option value="all">All Stages</option>
              {DEAL_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-theme-surface border border-theme-border rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-theme-accent text-white shadow-xs"
                  : "text-theme-muted hover:text-theme-text"
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-theme-accent text-white shadow-xs"
                  : "text-theme-muted hover:text-theme-text"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Surface */}
      {isLoading ? (
        <div className="h-64 border border-theme-border bg-theme-card rounded-xl flex items-center justify-center text-xs text-theme-muted font-semibold">
          Loading deals pipeline...
        </div>
      ) : error ? (
        <div className="p-4 border border-rose-500/30 bg-rose-500/10 text-rose-600 rounded-xl text-xs font-semibold">
          {error}
        </div>
      ) : viewMode === "kanban" ? (
        <DealsKanbanBoard
          deals={filteredDeals}
          projects={projects || {}}
          onMoveStage={updateDealStage}
          onDeleteDeal={deleteDeal}
          onSelectDeal={(deal) => {
            if (deal.leadId) navigate(`/?tab=leads&id=${deal.leadId}`);
          }}
          navigate={navigate}
        />
      ) : (
        /* Table View */
        <div className="bg-theme-card border border-theme-border rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-theme-text border-collapse">
              <thead>
                <tr className="border-b border-theme-border bg-theme-surface text-[11px] font-bold text-theme-muted uppercase tracking-wider">
                  <th className="p-3">Deal Title</th>
                  <th className="p-3">Lead / Buyer</th>
                  <th className="p-3">Project & Plot</th>
                  <th className="p-3">Stage</th>
                  <th className="p-3">Amount (₹)</th>
                  <th className="p-3">Close Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border font-medium">
                {filteredDeals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-theme-muted">
                      No deals found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map((deal) => {
                    const stageConfig = DEAL_STAGES.find((s) => s.id === deal.stage);
                    return (
                      <tr key={deal.id} className="hover:bg-theme-surface/50 transition-colors">
                        <td className="p-3 font-bold text-theme-text">{deal.title}</td>
                        <td className="p-3">
                          <div>{deal.leadName}</div>
                          <div className="text-[10px] text-theme-muted">{deal.phone}</div>
                        </td>
                        <td className="p-3">
                          <div>{deal.projectName || projects[deal.projectId]?.name || "Project"}</div>
                          {deal.plotNumber && (
                            <div className="text-[10px] text-theme-accent font-bold">
                              Plot {deal.plotNumber}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${stageConfig?.badgeClass}`}
                          >
                            {stageConfig?.name}
                          </span>
                        </td>
                        <td className="p-3 font-extrabold text-theme-accent">
                          {formatCurrency(deal.amount)}
                        </td>
                        <td className="p-3 text-theme-muted">{deal.expectedCloseDate || "—"}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => navigate(`/lead/${deal.leadId}`)}
                              className="p-1.5 rounded-md hover:bg-theme-surface text-theme-muted hover:text-theme-accent transition-colors"
                              title="Open Lead"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteDeal(deal.id)}
                              className="p-1.5 rounded-md hover:bg-rose-500/10 text-theme-muted hover:text-rose-500 transition-colors"
                              title="Delete Deal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Deal Modal */}
      <CreateDealModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        leads={leads || []}
        projects={projects || {}}
        currentUser={user}
        onCreateDeal={createDeal}
      />
    </div>
  );
}
