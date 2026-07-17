import { Link } from "react-router-dom";
import { FolderOpen, Map, Shield, BookOpen } from "lucide-react";
import { User } from "@/shared/types";
import { navIconColor } from "./sidebar/sidebarNavStyles";

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

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-theme-card border-t border-theme-border z-40 h-16 flex items-center justify-around px-2 pb-safe select-none">
      <Link
        to="/"
        className="flex flex-col items-center justify-center flex-1 py-1 text-theme-muted"
      >
        <div
          className={`flex items-center justify-center px-4 py-1.5 rounded-full transition-colors ${isCRMSectionActive ? activePill : idlePill}`}
        >
          <FolderOpen className={`w-5 h-5 ${navIconColor.leads}`} />
        </div>
        <span
          className={`text-[9px] mt-0.5 font-bold tracking-wide ${isCRMSectionActive ? "text-theme-accent font-extrabold" : "text-theme-muted"}`}
        >
          CRM
        </span>
      </Link>

      <Link
        to="/?tab=projects"
        className="flex flex-col items-center justify-center flex-1 py-1 text-theme-muted"
      >
        <div
          className={`flex items-center justify-center px-4 py-1.5 rounded-full transition-colors ${isMapActive ? activePill : idlePill}`}
        >
          <Map className={`w-5 h-5 ${navIconColor.maps}`} />
        </div>
        <span
          className={`text-[9px] mt-0.5 font-bold tracking-wide ${isMapActive ? "text-theme-accent font-extrabold" : "text-theme-muted"}`}
        >
          Maps
        </span>
      </Link>

      <button
        type="button"
        onClick={openTemplates}
        className="flex flex-col items-center justify-center flex-1 py-1 text-theme-muted border-0 bg-transparent cursor-pointer"
      >
        <div className={`flex items-center justify-center px-4 py-1.5 rounded-full ${idlePill}`}>
          <BookOpen className={`w-5 h-5 ${navIconColor.templates}`} />
        </div>
        <span className="text-[9px] mt-0.5 font-bold tracking-wide text-theme-muted">
          Templates
        </span>
      </button>

      {isManager && (
        <Link
          to="/admin"
          className="flex flex-col items-center justify-center flex-1 py-1 text-theme-muted"
        >
          <div
            className={`flex items-center justify-center px-4 py-1.5 rounded-full transition-colors ${isAdminActive ? activePill : idlePill}`}
          >
            <Shield className={`w-5 h-5 ${navIconColor.admin}`} />
          </div>
          <span
            className={`text-[9px] mt-0.5 font-bold tracking-wide ${isAdminActive ? "text-theme-accent font-extrabold" : "text-theme-muted"}`}
          >
            Admin
          </span>
        </Link>
      )}

      <button
        type="button"
        onClick={() => setIsMobileProfileOpen(true)}
        className="flex flex-col items-center justify-center flex-1 py-1 text-theme-muted border-0 bg-transparent cursor-pointer"
      >
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isMobileProfileOpen ? activePill : "bg-theme-surface text-theme-text"}`}
        >
          <span className="text-[10px] font-black leading-none">
            {user?.username
              ? user.username.substring(0, 2).toUpperCase()
              : "GA"}
          </span>
        </div>
        <span
          className={`text-[9px] mt-0.5 font-bold tracking-wide ${isMobileProfileOpen ? "text-theme-accent font-extrabold" : "text-theme-muted"}`}
        >
          Account
        </span>
      </button>
    </nav>
  );
}
