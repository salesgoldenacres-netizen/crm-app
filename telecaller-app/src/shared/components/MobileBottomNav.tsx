import { Link } from "react-router-dom";
import { FolderOpen, Map, Shield, BookOpen } from "lucide-react";
import { User } from "@/shared/types";
import { navIconColor } from "./sidebar/sidebarNavStyles";
import { NAV_LABELS } from "@/shared/constants/navTaxonomy";

interface MobileBottomNavProps {
  user: User | null;
  isLeadsActive: boolean;
  isCompanyDbActive: boolean;
  isCallsActive: boolean;
  isMapActive: boolean;
  isAdminActive: boolean;
  isMobileProfileOpen: boolean;
  setIsMobileProfileOpen: (open: boolean) => void;
  openTemplates: () => void;
}

export default function MobileBottomNav({
  user,
  isLeadsActive,
  isCompanyDbActive,
  isCallsActive,
  isMapActive,
  isAdminActive,
  isMobileProfileOpen,
  setIsMobileProfileOpen,
  openTemplates,
}: MobileBottomNavProps) {
  const isManager = [
    "admin",
    "upper_management",
    "middle_management",
    "lower_management",
  ].includes(user?.role || "");

  const isCRMSectionActive = isLeadsActive || isCompanyDbActive || isCallsActive;

  const activePill = "bg-theme-accent-muted";
  const idlePill = "hover:bg-theme-surface";
  const navItemFocus =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme";
  const labelBase = "text-[9px] mt-0.5 font-semibold tracking-wide";
  const labelActive = "text-theme-accent";
  const labelIdle = "text-theme-muted";

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-theme-card/95 backdrop-blur-md border-t border-theme-border z-40 h-16 flex items-center justify-around px-2 pb-safe select-none"
      aria-label="Primary"
    >
      <Link
        to="/"
        className={`flex flex-col items-center justify-center flex-1 py-1 text-theme-muted ${navItemFocus}`}
      >
        <div
          className={`flex items-center justify-center px-3.5 py-1.5 rounded-theme transition-colors ${isCRMSectionActive ? activePill : idlePill}`}
        >
          <FolderOpen className={`w-5 h-5 ${navIconColor.leads}`} />
        </div>
        <span
          className={`${labelBase} ${isCRMSectionActive ? labelActive : labelIdle}`}
        >
          {NAV_LABELS.crm}
        </span>
      </Link>

      <Link
        to="/?tab=projects"
        className={`flex flex-col items-center justify-center flex-1 py-1 text-theme-muted ${navItemFocus}`}
      >
        <div
          className={`flex items-center justify-center px-3.5 py-1.5 rounded-theme transition-colors ${isMapActive ? activePill : idlePill}`}
        >
          <Map className={`w-5 h-5 ${navIconColor.maps}`} />
        </div>
        <span className={`${labelBase} ${isMapActive ? labelActive : labelIdle}`}>
          {NAV_LABELS.maps}
        </span>
      </Link>

      <button
        type="button"
        onClick={openTemplates}
        className={`flex flex-col items-center justify-center flex-1 py-1 text-theme-muted border-0 bg-transparent cursor-pointer ${navItemFocus}`}
      >
        <div
          className={`flex items-center justify-center px-3.5 py-1.5 rounded-theme ${idlePill}`}
        >
          <BookOpen className={`w-5 h-5 ${navIconColor.templates}`} />
        </div>
        <span className={`${labelBase} ${labelIdle}`}>
          {NAV_LABELS.templates}
        </span>
      </button>

      {isManager && (
        <Link
          to="/admin"
          className={`flex flex-col items-center justify-center flex-1 py-1 text-theme-muted ${navItemFocus}`}
        >
          <div
            className={`flex items-center justify-center px-3.5 py-1.5 rounded-theme transition-colors ${isAdminActive ? activePill : idlePill}`}
          >
            <Shield className={`w-5 h-5 ${navIconColor.admin}`} />
          </div>
          <span
            className={`${labelBase} ${isAdminActive ? labelActive : labelIdle}`}
          >
            {NAV_LABELS.admin}
          </span>
        </Link>
      )}

      <button
        type="button"
        onClick={() => setIsMobileProfileOpen(true)}
        className={`flex flex-col items-center justify-center flex-1 py-1 text-theme-muted border-0 bg-transparent cursor-pointer ${navItemFocus}`}
        aria-expanded={isMobileProfileOpen}
        aria-haspopup="dialog"
      >
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-theme transition-colors ${isMobileProfileOpen ? activePill : "bg-theme-surface text-theme-text"}`}
        >
          <span className="text-[10px] font-semibold leading-none">
            {user?.username
              ? user.username.substring(0, 2).toUpperCase()
              : "GA"}
          </span>
        </div>
        <span
          className={`${labelBase} ${isMobileProfileOpen ? labelActive : labelIdle}`}
        >
          {NAV_LABELS.account}
        </span>
      </button>
    </nav>
  );
}
