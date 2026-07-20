import { Link } from "react-router-dom";
import {
  X,
  BarChart3,
  UserCheck,
  PhoneCall,
  Map,
  Calendar,
  BookOpen,
  UserRound,
  LayoutDashboard,
} from "lucide-react";
import { User } from "@/shared/types";
import { NAV_LABELS } from "@/shared/constants/navTaxonomy";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  isManagerial: (role: string) => boolean;
  activeTab: string;
}

function navClass(active: boolean) {
  return `w-full flex items-center p-2.5 rounded-theme transition-all duration-200 border text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
    active
      ? "bg-theme-accent-muted border-theme-accent/30 text-theme-accent font-bold"
      : "border-transparent text-theme-muted hover:text-theme-text hover:bg-theme-surface"
  }`;
}

export default function MobileDrawer({
  isOpen,
  onClose,
  user,
  isManagerial,
  activeTab,
}: MobileDrawerProps) {
  if (!isOpen) return null;

  const item = (tab: string, label: string, Icon: typeof BarChart3) => (
    <Link
      to={`/?tab=${tab}`}
      onClick={onClose}
      className={navClass(activeTab === tab)}
    >
      <Icon className="w-4.5 h-4.5 mr-2.5 text-theme-accent" aria-hidden />
      <span className="text-xs">{label}</span>
    </Link>
  );

  return (
    <>
      <div
        className="fixed inset-0 bg-theme-overlay backdrop-blur-sm z-55 animate-fadeIn"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 w-72 bg-theme-card border-r border-theme-border shadow-2xl z-55 flex flex-col transform transition-transform duration-300 animate-slideInLeft">
        <div className="flex items-center justify-between p-3 border-b border-theme-border bg-theme-surface/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-theme bg-theme-accent text-theme-accent-fg flex items-center justify-center shadow-sm">
              <LayoutDashboard className="w-4 h-4" aria-hidden />
            </div>
            <span className="type-card-title text-sm tracking-wide text-theme-text">
              {NAV_LABELS.workspace}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-theme-muted hover:text-theme-text hover:bg-theme-surface transition-colors cursor-pointer border-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
          {isManagerial(user.role) &&
            item("company-dashboard", NAV_LABELS.dashboard, BarChart3)}

          {item("leads", NAV_LABELS.leads, UserCheck)}
          {item("calls", NAV_LABELS.calls, PhoneCall)}
          {item("projects", NAV_LABELS.maps, Map)}

          {!isManagerial(user.role) && (
            <>
              {item("attendance", NAV_LABELS.attendance, Calendar)}
              {item("training", NAV_LABELS.training, BookOpen)}
              {item("profile", NAV_LABELS.profile, UserRound)}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-theme-border text-[10px] text-theme-muted text-center font-medium">
          Golden Acres CRM
        </div>
      </div>
    </>
  );
}
