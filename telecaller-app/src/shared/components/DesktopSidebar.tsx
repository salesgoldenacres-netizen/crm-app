import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { User, Project } from "@/shared/types";
import SidebarNavigationMenu from "./SidebarNavigationMenu";
import SidebarFooter from "./SidebarFooter";
import { useBrandingStore } from "@/features/admin/hooks/useBrandingStore";

interface DesktopSidebarProps {
  user: User | null;
  projects: Record<string, Project> | null;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  openTemplates: () => void;
  openShortcuts: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  handleLogout: () => Promise<void>;
  locationPathname: string;
  activeTab: string;
  activeSubtab: string;
}

export default function DesktopSidebar({
  user,
  projects,
  isSidebarCollapsed,
  toggleSidebar,
  openTemplates,
  openShortcuts,
  isFullscreen,
  toggleFullscreen,
  handleLogout,
  locationPathname,
  activeTab,
  activeSubtab,
}: DesktopSidebarProps) {
  const { branding } = useBrandingStore();
  const companyLabel = (branding.companyName || "Golden Acres").toUpperCase();
  const tagline = branding.tagline || "PORTAL";

  return (
    <aside
      className={`hidden md:flex flex-col h-full shrink-0 sidebar-brand-rail border-r border-theme-border transition-all duration-300 ease-in-out select-none ${
        isSidebarCollapsed ? "w-[72px]" : "w-[248px]"
      }`}
    >
      {/* Brand Header — h-14 matches DashboardHeader / PageHeader seam */}
      <div
        className={`h-14 shrink-0 flex items-center gap-2 px-3 border-b border-theme-border ${
          isSidebarCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!isSidebarCollapsed && (
          <Link
            to="/"
            className="flex items-center gap-2.5 min-w-0 flex-1 h-full"
            title={branding.companyName || "Home"}
          >
            {branding.logoUrl && (
              <img
                src={branding.logoUrl}
                alt={branding.companyName || "Logo"}
                className="w-7 h-7 rounded-theme object-contain shrink-0 bg-white/10 border border-white/15"
              />
            )}
            <div className="flex flex-col justify-center min-w-0 gap-1">
              <span className="text-[12px] font-semibold text-white leading-none tracking-[0.04em] truncate">
                {companyLabel}
              </span>
              <span className="text-[10px] font-semibold text-theme-warning leading-none tracking-[0.16em] truncate">
                {tagline}
              </span>
            </div>
          </Link>
        )}

        <button
          type="button"
          onClick={toggleSidebar}
          className="shrink-0 min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 sm:w-8 sm:h-8 rounded-theme border border-white/15 bg-white/10 text-white/70 hover:text-white hover:bg-white/15 inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isSidebarCollapsed}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          ) : (
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <SidebarNavigationMenu
        user={user}
        isSidebarCollapsed={isSidebarCollapsed}
        projects={projects}
        locationPathname={locationPathname}
        activeTab={activeTab}
        activeSubtab={activeSubtab}
        openTemplates={openTemplates}
        openShortcuts={openShortcuts}
        toggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />

      {/* Footer User Profile & Logout */}
      <SidebarFooter
        user={user}
        isSidebarCollapsed={isSidebarCollapsed}
        handleLogout={handleLogout}
      />
    </aside>
  );
}
