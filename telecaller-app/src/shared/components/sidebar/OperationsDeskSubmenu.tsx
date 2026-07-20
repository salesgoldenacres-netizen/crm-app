import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { ChevronDown, Shield } from "lucide-react";
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
import { ADMIN_NAV_GROUPS, NAV_LABELS } from "@/shared/constants/navTaxonomy";

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

  const openState = [
    { open: isAdminCRMOpen, setOpen: setIsAdminCRMOpen, short: "CRM & Ops" },
    { open: isAdminPerfOpen, setOpen: setIsAdminPerfOpen, short: "Perf & HR" },
    { open: isAdminCoachOpen, setOpen: setIsAdminCoachOpen, short: "Coaching" },
    { open: isAdminSettingsOpen, setOpen: setIsAdminSettingsOpen, short: "System" },
  ];

  return (
    <>
      {!isSidebarCollapsed && (
        <div className={sidebarCategoryClass()}>{NAV_LABELS.admin}</div>
      )}

      <div>
        <div className={sidebarGroupRow(isAdminActive, isSidebarCollapsed)}>
          <RouterLink
            to={firstProjectId ? `/admin?tab=projects` : `/admin?tab=users`}
            className={sidebarGroupLink(isSidebarCollapsed)}
            title={NAV_LABELS.admin}
            aria-label={isSidebarCollapsed ? NAV_LABELS.admin : undefined}
          >
            <Shield className={sidebarIcon("admin")} aria-hidden="true" />
            {!isSidebarCollapsed && <span className="truncate">{NAV_LABELS.admin}</span>}
          </RouterLink>
          {!isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => setIsOperationsDeskOpen((o) => !o)}
              className={sidebarGroupToggle()}
              aria-label={`Toggle ${NAV_LABELS.admin} menu`}
            >
              <ChevronDown
                className={`${sidebarChevronClass} ${isOperationsDeskOpen ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>

        {!isSidebarCollapsed && isOperationsDeskOpen && (
          <div className="ml-3.5 mt-1 space-y-3 border-l border-theme-border/70 pl-2.5 animate-fadeIn">
            {ADMIN_NAV_GROUPS.map((group, index) => {
              const { open, setOpen, short } = openState[index];
              return (
                <div key={group.title} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className={subgroupToggle}
                  >
                    <span>{short}</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && (
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <RouterLink
                            key={item.id}
                            to={`/admin?tab=${item.id}`}
                            className={sidebarSubItem(isAdminActive && activeTab === item.id)}
                          >
                            <Icon className={sidebarSubIcon(item.tone)} />
                            <span className="truncate">{item.label}</span>
                          </RouterLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
