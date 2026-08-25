import React from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  FolderOpen,
  BarChart3,
  FileText,
  PlusCircle,
  LayoutGrid,
  Trash2,
  Briefcase,
} from "lucide-react";
import {
  sidebarChevronClass,
  sidebarGroupLink,
  sidebarGroupRow,
  sidebarGroupToggle,
  sidebarIcon,
  sidebarSubIcon,
  sidebarSubItem,
  sidebarSubTree,
} from "./sidebarNavStyles";
import { NAV_LABELS } from "@/shared/constants/navTaxonomy";

interface CRMSubmenuProps {
  isSidebarCollapsed: boolean;
  isLeadsOpen: boolean;
  setIsLeadsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isLeadsActive: boolean;
  isDashboardRoute: boolean;
  activeTab: string;
  activeSubtab: string;
  userRole?: string;
}

export default function CRMSubmenu({
  isSidebarCollapsed,
  isLeadsOpen,
  setIsLeadsOpen,
  isLeadsActive,
  isDashboardRoute,
  activeTab,
  activeSubtab,
  userRole,
}: CRMSubmenuProps) {
  return (
    <div>
      <div className={sidebarGroupRow(isLeadsActive, isSidebarCollapsed)}>
        <Link
          to="/?tab=leads"
          className={sidebarGroupLink(isSidebarCollapsed)}
          title={NAV_LABELS.leads}
          aria-label={isSidebarCollapsed ? NAV_LABELS.leads : undefined}
        >
          <FolderOpen className={sidebarIcon("leads")} aria-hidden="true" />
          {!isSidebarCollapsed && <span className="truncate">{NAV_LABELS.leads}</span>}
        </Link>
        {!isSidebarCollapsed && (
          <button
            type="button"
            onClick={() => setIsLeadsOpen((o) => !o)}
            className={sidebarGroupToggle()}
            aria-label={`Toggle ${NAV_LABELS.leads} menu`}
          >
            <ChevronDown
              className={`${sidebarChevronClass} ${isLeadsOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>
      {!isSidebarCollapsed && isLeadsOpen && (
        <div className={sidebarSubTree()}>
          {[
            {
              to: "/?tab=leads&subtab=dashboard",
              label: "Overview",
              icon: <BarChart3 className={sidebarSubIcon("leadsOverview")} />,
              key: "dashboard",
            },
            {
              to: "/?tab=leads&subtab=list",
              label: "Leads List",
              icon: <FileText className={sidebarSubIcon("leadsList")} />,
              key: "list",
            },
            {
              to: "/?tab=leads&subtab=form",
              label: "Submission",
              icon: <PlusCircle className={sidebarSubIcon("leadsForm")} />,
              key: "form",
            },
            {
              to: "/?tab=leads&subtab=kanban",
              label: "Kanban Board",
              icon: <LayoutGrid className={sidebarSubIcon("leadsKanban")} />,
              key: "kanban",
            },
            {
              to: "/deals",
              label: "Deals Pipeline",
              icon: <Briefcase className={sidebarSubIcon("dealsPipeline")} />,
              key: "deals",
            },
            ...(userRole === "admin" || userRole === "manager"
              ? [
                  {
                    to: "/?tab=leads&subtab=bin",
                    label: "Lead Bin",
                    icon: <Trash2 className={sidebarSubIcon("leadsBin")} />,
                    key: "bin",
                  },
                ]
              : []),
          ].map(({ to, label, icon, key }) => (
            <Link
              key={key}
              to={to}
              className={sidebarSubItem(
                isDashboardRoute && activeTab === "leads" && activeSubtab === key,
              )}
            >
              {icon}
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
