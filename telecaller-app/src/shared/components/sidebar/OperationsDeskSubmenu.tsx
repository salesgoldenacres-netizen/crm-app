import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  ChevronDown,
  Shield,
  Briefcase,
  FolderOpen,
  PlusCircle,
  Calendar,
  BarChart3,
  Trophy,
  Star,
  History,
  BookOpen,
  Lightbulb,
  Gift,
  ShieldAlert,
  SlidersHorizontal,
  AlertTriangle,
  Paintbrush,
  Webhook,
  Activity,
} from "lucide-react";
import {
  sidebarCategoryClass,
  sidebarChevronClass,
  sidebarGroupLink,
  sidebarGroupRow,
  sidebarGroupToggle,
  sidebarIcon,
  sidebarSubIcon,
  sidebarSubItem,
} from "./sidebarNavStyles";

interface OperationsDeskSubmenuProps {
  isSidebarCollapsed: boolean;
  isOperationsDeskOpen: boolean;
  setIsOperationsDeskOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAdminActive: boolean;
  firstProjectId: string | null;
  isAdminCRMOpen: boolean;
  setIsAdminCRMOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAdminPerfOpen: boolean;
  setIsAdminPerfOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAdminCoachOpen: boolean;
  setIsAdminCoachOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAdminSettingsOpen: boolean;
  setIsAdminSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeTab: string;
}

export default function OperationsDeskSubmenu({
  isSidebarCollapsed,
  isOperationsDeskOpen,
  setIsOperationsDeskOpen,
  isAdminActive,
  firstProjectId,
  isAdminCRMOpen,
  setIsAdminCRMOpen,
  isAdminPerfOpen,
  setIsAdminPerfOpen,
  isAdminCoachOpen,
  setIsAdminCoachOpen,
  isAdminSettingsOpen,
  setIsAdminSettingsOpen,
  activeTab,
}: OperationsDeskSubmenuProps) {
  const subgroupToggle =
    "w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-theme-muted/80 cursor-pointer border-0 bg-transparent leading-none";

  const adminLink = (id: string, label: string, icon: React.ReactNode) => (
    <RouterLink key={id} to={`/admin?tab=${id}`} className={sidebarSubItem(activeTab === id)}>
      {icon}
      <span className="truncate">{label}</span>
    </RouterLink>
  );

  return (
    <>
      {!isSidebarCollapsed && <div className={sidebarCategoryClass()}>Operations Desk</div>}

      <div>
        <div className={sidebarGroupRow(isAdminActive, isSidebarCollapsed)}>
          <RouterLink
            to={firstProjectId ? `/admin?tab=projects` : `/admin?tab=users`}
            className={sidebarGroupLink(isSidebarCollapsed)}
            title="Operations Desk"
          >
            <Shield className={sidebarIcon("admin")} />
            {!isSidebarCollapsed && <span className="truncate">Control Panel</span>}
          </RouterLink>
          {!isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => setIsOperationsDeskOpen((o) => !o)}
              className={sidebarGroupToggle()}
              aria-label="Toggle Operations Desk Menu"
            >
              <ChevronDown
                className={`${sidebarChevronClass} ${isOperationsDeskOpen ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>

        {!isSidebarCollapsed && isOperationsDeskOpen && (
          <div className="ml-3.5 mt-1 space-y-3 border-l border-theme-border/70 pl-2.5 animate-fadeIn">
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setIsAdminCRMOpen(!isAdminCRMOpen)}
                className={subgroupToggle}
              >
                <span>CRM & Ops</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${isAdminCRMOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isAdminCRMOpen && (
                <div className="space-y-0.5">
                  {adminLink("projects", "Manage Projects", <Briefcase className={sidebarSubIcon("projects")} />)}
                  {adminLink("leads", "Manage Leads", <FolderOpen className={sidebarSubIcon("leads")} />)}
                  {adminLink("users", "Agent Accounts", <PlusCircle className={sidebarSubIcon("users")} />)}
                  {adminLink("roster", "Roster Planner", <Calendar className={sidebarSubIcon("roster")} />)}
                </div>
              )}
            </div>

            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setIsAdminPerfOpen(!isAdminPerfOpen)}
                className={subgroupToggle}
              >
                <span>Perf & HR</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${isAdminPerfOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isAdminPerfOpen && (
                <div className="space-y-0.5">
                  {adminLink("analytics", "BI Analytics", <BarChart3 className={sidebarSubIcon("analytics")} />)}
                  {adminLink("attendance", "Attendance Admin", <Calendar className={sidebarSubIcon("attendance")} />)}
                  {adminLink("targets", "Quota Targets", <Trophy className={sidebarSubIcon("targets")} />)}
                  {adminLink("leaderboard", "Leaderboards", <Trophy className={sidebarSubIcon("leaderboard")} />)}
                  {adminLink("performance", "Performance Audit", <Star className={sidebarSubIcon("performance")} />)}
                  {adminLink("quality", "Call Quality Log", <History className={sidebarSubIcon("quality")} />)}
                </div>
              )}
            </div>

            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setIsAdminCoachOpen(!isAdminCoachOpen)}
                className={subgroupToggle}
              >
                <span>Coaching</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${isAdminCoachOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isAdminCoachOpen && (
                <div className="space-y-0.5">
                  {adminLink("training", "Training Content", <BookOpen className={sidebarSubIcon("training")} />)}
                  {adminLink("coaching", "Daily Motivator", <Lightbulb className={sidebarSubIcon("coaching")} />)}
                  {adminLink("events", "Event Scheduler", <Gift className={sidebarSubIcon("events")} />)}
                </div>
              )}
            </div>

            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setIsAdminSettingsOpen(!isAdminSettingsOpen)}
                className={subgroupToggle}
              >
                <span>System</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${isAdminSettingsOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isAdminSettingsOpen && (
                <div className="space-y-0.5">
                  {adminLink("roles", "Access Control", <ShieldAlert className={sidebarSubIcon("roles")} />)}
                  {adminLink("customfields", "Custom Attributes", <SlidersHorizontal className={sidebarSubIcon("customfields")} />)}
                  {adminLink("merge", "Merge Accounts", <AlertTriangle className={sidebarSubIcon("merge")} />)}
                  {adminLink("branding", "Brand Customize", <Paintbrush className={sidebarSubIcon("branding")} />)}
                  {adminLink("integrations", "Webhooks Integration", <Webhook className={sidebarSubIcon("integrations")} />)}
                  {adminLink("audit", "Security Audit Logs", <Activity className={sidebarSubIcon("audit")} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
