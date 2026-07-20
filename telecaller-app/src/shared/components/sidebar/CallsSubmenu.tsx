import React from "react";
import { Link } from "react-router-dom";
import { ChevronDown, PhoneCall, MessageSquare, History } from "lucide-react";
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

interface CallsSubmenuProps {
  isSidebarCollapsed: boolean;
  isCallsOpen: boolean;
  setIsCallsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCallsActive: boolean;
  isDashboardRoute: boolean;
  activeTab: string;
  activeSubtab: string;
}

export default function CallsSubmenu({
  isSidebarCollapsed,
  isCallsOpen,
  setIsCallsOpen,
  isCallsActive,
  isDashboardRoute,
  activeTab,
  activeSubtab,
}: CallsSubmenuProps) {
  return (
    <div>
      <div className={sidebarGroupRow(isCallsActive, isSidebarCollapsed)}>
        <Link
          to="/?tab=calls"
          className={sidebarGroupLink(isSidebarCollapsed)}
          title={NAV_LABELS.calls}
          aria-label={isSidebarCollapsed ? NAV_LABELS.calls : undefined}
        >
          <PhoneCall className={sidebarIcon("calls")} aria-hidden="true" />
          {!isSidebarCollapsed && <span className="truncate">{NAV_LABELS.calls}</span>}
        </Link>
        {!isSidebarCollapsed && (
          <button
            type="button"
            onClick={() => setIsCallsOpen((o) => !o)}
            className={sidebarGroupToggle()}
            aria-label={`Toggle ${NAV_LABELS.calls} menu`}
          >
            <ChevronDown
              className={`${sidebarChevronClass} ${isCallsOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>
      {!isSidebarCollapsed && isCallsOpen && (
        <div className={sidebarSubTree()}>
          {[
            {
              to: "/?tab=calls&subtab=whatsapp",
              label: "WhatsApp Dialer",
              icon: <MessageSquare className={sidebarSubIcon("whatsapp")} />,
              key: "whatsapp",
            },
            {
              to: "/?tab=calls&subtab=history",
              label: "Call History",
              icon: <History className={sidebarSubIcon("callHistory")} />,
              key: "history",
            },
          ].map(({ to, label, icon, key }) => (
            <Link
              key={key}
              to={to}
              className={sidebarSubItem(
                isDashboardRoute && activeTab === "calls" && activeSubtab === key,
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
