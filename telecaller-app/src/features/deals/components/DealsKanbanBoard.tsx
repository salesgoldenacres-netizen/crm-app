import { useState, useRef, useEffect } from "react";
import {
  Building2,
  DollarSign,
  Calendar,
  Phone,
  ArrowRightLeft,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Deal, DealStage, DEAL_STAGES } from "../types";
import { Project } from "@/shared/types";

interface DealsKanbanBoardProps {
  deals: Deal[];
  projects: Record<string, Project>;
  onMoveStage: (dealId: string, stage: DealStage) => void;
  onDeleteDeal: (dealId: string) => void;
  onSelectDeal: (deal: Deal) => void;
  onStartCall?: (phone: string, name: string) => void;
  navigate: (path: string) => void;
}

export function formatCurrency(amount: number): string {
  if (!amount || isNaN(amount)) return "₹0";
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function DealCard({
  deal,
  projects,
  onMoveStage,
  onDeleteDeal,
  onSelectDeal,
  onStartCall,
  navigate,
}: {
  deal: Deal;
  projects: Record<string, Project>;
  onMoveStage: (dealId: string, stage: DealStage) => void;
  onDeleteDeal: (dealId: string) => void;
  onSelectDeal: (deal: Deal) => void;
  onStartCall?: (phone: string, name: string) => void;
  navigate: (path: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentStageConfig = DEAL_STAGES.find((s) => s.id === deal.stage);
  const otherStages = DEAL_STAGES.filter((s) => s.id !== deal.stage);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const projectName = deal.projectName || projects[deal.projectId]?.name || "Project Site";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", deal.id);
      }}
      className="bg-theme-card border border-theme-border rounded-xl p-3.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing select-none relative group"
    >
      {/* Top Bar: Title & Stage probability */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3
            onClick={() => onSelectDeal(deal)}
            className="font-bold text-xs text-theme-text truncate hover:text-theme-accent cursor-pointer transition-colors"
            title={deal.title}
          >
            {deal.title}
          </h3>
          <p className="text-[11px] font-medium text-theme-muted truncate mt-0.5">
            {deal.leadName} ({deal.phone})
          </p>
        </div>
        <span
          className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${currentStageConfig?.badgeClass}`}
        >
          {currentStageConfig?.probability}%
        </span>
      </div>

      {/* Project & Plot badge */}
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-theme-muted mb-2.5 flex-wrap">
        <span className="inline-flex items-center gap-1 bg-theme-surface border border-theme-border px-2 py-0.5 rounded-md">
          <Building2 className="w-3 h-3 text-theme-accent" />
          <span className="truncate max-w-[110px]">{projectName}</span>
        </span>
        {deal.plotNumber && (
          <span className="bg-theme-surface border border-theme-border px-2 py-0.5 rounded-md text-theme-text font-bold">
            Plot {deal.plotNumber}
          </span>
        )}
      </div>

      {/* Financial Value & Close Date */}
      <div className="flex items-center justify-between pt-2 border-t border-theme-border/60 text-xs">
        <div className="flex items-center gap-1 font-extrabold text-theme-accent">
          <DollarSign className="w-3.5 h-3.5" />
          <span>{formatCurrency(deal.amount)}</span>
        </div>

        {deal.expectedCloseDate && (
          <div className="flex items-center gap-1 text-[10px] font-medium text-theme-muted">
            <Calendar className="w-3 h-3" />
            <span>{deal.expectedCloseDate}</span>
          </div>
        )}
      </div>

      {/* Quick Actions Footer */}
      <div className="mt-2.5 pt-2 border-t border-theme-border/40 flex items-center justify-between gap-1 text-theme-muted">
        <div className="flex items-center gap-1">
          {deal.phone && onStartCall && (
            <button
              type="button"
              onClick={() => onStartCall(deal.phone, deal.leadName)}
              className="p-1.5 rounded-md hover:bg-theme-surface hover:text-emerald-500 transition-colors cursor-pointer"
              title="Call Lead"
            >
              <Phone className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate(`/lead/${deal.leadId}`)}
            className="p-1.5 rounded-md hover:bg-theme-surface hover:text-theme-accent transition-colors cursor-pointer"
            title="Open Lead Details"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-md hover:bg-theme-surface hover:text-theme-text transition-colors cursor-pointer text-[11px] font-semibold flex items-center gap-1"
            title="Change Stage"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Move</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-1 z-30 w-44 bg-theme-card border border-theme-border rounded-xl shadow-xl py-1 text-xs overflow-hidden">
              <div className="px-3 py-1 text-[10px] font-bold text-theme-muted border-b border-theme-border uppercase tracking-wider">
                Move Stage To:
              </div>
              {otherStages.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onMoveStage(deal.id, s.id);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-theme-surface font-medium text-theme-text transition-colors flex items-center justify-between"
                >
                  <span>{s.name}</span>
                  <span className="text-[9px] text-theme-muted">{s.probability}%</span>
                </button>
              ))}
              <div className="border-t border-theme-border mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteDeal(deal.id);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-500/10 text-rose-500 font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Deal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DealsKanbanBoard({
  deals,
  projects,
  onMoveStage,
  onDeleteDeal,
  onSelectDeal,
  onStartCall,
  navigate,
}: DealsKanbanBoardProps) {
  return (
    <div className="flex gap-3.5 overflow-x-auto pb-4 pt-1 scrollbar-thin">
      {DEAL_STAGES.map((stageConfig) => {
        const stageDeals = deals.filter((d) => d.stage === stageConfig.id);
        const stageTotalValue = stageDeals.reduce((acc, d) => acc + (d.amount || 0), 0);

        return (
          <div
            key={stageConfig.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const dealId = e.dataTransfer.getData("text/plain");
              if (dealId) onMoveStage(dealId, stageConfig.id);
            }}
            className="w-[270px] shrink-0 bg-theme-surface/60 border border-theme-border rounded-xl p-3 flex flex-col min-h-[500px]"
          >
            {/* Stage Column Header */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${stageConfig.barClass}`} />
                  <h2 className="text-xs font-bold text-theme-text truncate">{stageConfig.name}</h2>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stageConfig.badgeClass}`}
                >
                  {stageDeals.length}
                </span>
              </div>
              <div className="text-[11px] font-extrabold text-theme-accent pl-4">
                {formatCurrency(stageTotalValue)}
              </div>
            </div>

            {/* Stage Column Cards */}
            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[620px] pr-0.5 scrollbar-none">
              {stageDeals.length === 0 ? (
                <div className="h-32 border-2 border-dashed border-theme-border/60 rounded-xl flex items-center justify-center text-xs text-theme-muted font-medium">
                  No deals in this stage
                </div>
              ) : (
                stageDeals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    projects={projects}
                    onMoveStage={onMoveStage}
                    onDeleteDeal={onDeleteDeal}
                    onSelectDeal={onSelectDeal}
                    onStartCall={onStartCall}
                    navigate={navigate}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
