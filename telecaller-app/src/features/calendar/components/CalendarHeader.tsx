import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Building2,
  Grid,
  List,
  Columns,
  Clock,
  Search,
  X,
} from "lucide-react";
import { CalendarViewMode, CALENDAR_EVENT_TYPES } from "../types";
import { Project } from "@/shared/types";

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  onToday: () => void;
  selectedEventType: string;
  onEventTypeChange: (type: string) => void;
  selectedProjectId: string;
  onProjectIdChange: (projectId: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  projects: Record<string, Project>;
}

export default function CalendarHeader({
  currentDate,
  viewMode,
  onViewModeChange,
  onPrevDate,
  onNextDate,
  onToday,
  selectedEventType,
  onEventTypeChange,
  selectedProjectId,
  onProjectIdChange,
  searchQuery,
  onSearchQueryChange,
  projects,
}: CalendarHeaderProps) {
  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const year = currentDate.getFullYear();
  const projectList = Object.values(projects || {});

  return (
    <div className="bg-theme-card border border-theme-border rounded-xl p-4 shadow-xs space-y-3.5">
      {/* Top Bar: Title & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Month Title & Nav */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-theme-accent-muted text-theme-accent shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold text-theme-text min-w-[170px] truncate">
              {monthName} {year}
            </h1>

            <div className="flex items-center gap-1 bg-theme-surface border border-theme-border rounded-lg p-0.5">
              <button
                type="button"
                onClick={onPrevDate}
                className="p-1.5 rounded-md text-theme-muted hover:text-theme-text hover:bg-theme-card transition-colors cursor-pointer"
                title="Previous"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onToday}
                className="px-2.5 py-1 rounded-md text-xs font-bold text-theme-text hover:bg-theme-card transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={onNextDate}
                className="p-1.5 rounded-md text-theme-muted hover:text-theme-text hover:bg-theme-card transition-colors cursor-pointer"
                title="Next"
                aria-label="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* View Mode Selector Tabs */}
        <div className="flex items-center bg-theme-surface border border-theme-border rounded-xl p-1 self-start md:self-auto">
          <button
            type="button"
            onClick={() => onViewModeChange("month")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "month"
                ? "bg-theme-accent text-white shadow-xs"
                : "text-theme-muted hover:text-theme-text"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Month</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("week")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "week"
                ? "bg-theme-accent text-white shadow-xs"
                : "text-theme-muted hover:text-theme-text"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Week</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("day")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "day"
                ? "bg-theme-accent text-white shadow-xs"
                : "text-theme-muted hover:text-theme-text"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Day</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("agenda")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "agenda"
                ? "bg-theme-accent text-white shadow-xs"
                : "text-theme-muted hover:text-theme-text"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Agenda</span>
          </button>
        </div>
      </div>

      {/* Bottom Bar: Filters & Event Type Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-theme-border/60">
        {/* Event Type Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onEventTypeChange("all")}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
              selectedEventType === "all"
                ? "bg-theme-text text-theme-card border-theme-text"
                : "bg-theme-surface text-theme-muted border-theme-border hover:text-theme-text"
            }`}
          >
            All Events
          </button>
          {CALENDAR_EVENT_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => onEventTypeChange(t.type)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                selectedEventType === t.type
                  ? t.badgeClass
                  : "bg-theme-surface text-theme-muted border-theme-border hover:text-theme-text"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${t.dotClass}`} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Right side: Search & Project Filter */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-theme-muted" />
            <input
              type="text"
              placeholder="Search event, lead, phone..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full bg-theme-surface border border-theme-border rounded-lg pl-8 pr-7 py-1 text-xs font-medium text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
                className="absolute right-2 top-2 text-theme-muted hover:text-theme-text p-0.5 cursor-pointer"
                title="Clear Search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Project Filter */}
          <div className="flex items-center gap-1.5 bg-theme-surface border border-theme-border rounded-lg px-2.5 py-1 text-xs">
            <Building2 className="w-3.5 h-3.5 text-theme-muted" />
            <select
              value={selectedProjectId}
              onChange={(e) => onProjectIdChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-theme-text focus:outline-none cursor-pointer"
            >
              <option value="all">All Project Sites</option>
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
