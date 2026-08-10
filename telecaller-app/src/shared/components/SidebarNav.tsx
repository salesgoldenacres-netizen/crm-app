import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { logout } from "@/shared/services/auth";
import { useAppShell } from "@/shared/layouts/AppShellContext";
import DesktopSidebar from "./DesktopSidebar";
import MobileBottomNav from "./MobileBottomNav";
import MobileProfileDrawer from "./MobileProfileDrawer";
import { User, Project, Branding } from "@/shared/types";

interface SidebarNavProps {
  user: User | null;
  projects: Record<string, Project> | null;
  branding: Branding;
  openTemplates: () => void;
  openShortcuts: () => void;
  themeToggle?: React.ReactNode;
}

export default function SidebarNav({
  user,
  projects,
  branding,
  openTemplates,
  openShortcuts,
  themeToggle,
}: SidebarNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isFullscreen, toggleFullscreen } = useAppShell();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar_collapsed") === "true";
    }
    return false;
  });
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const isManager = [
    "admin",
    "upper_management",
    "middle_management",
    "lower_management",
  ].includes(user?.role || "");

  const activeTab =
    searchParams.get("tab") || (isManager ? "company-dashboard" : "leads");
  const activeSubtab = searchParams.get("subtab") || "dashboard";

  const isDashboardRoute = location.pathname === "/";
  const isCompanyDbActive =
    isDashboardRoute && activeTab === "company-dashboard";
  const isLeadsActive =
    (isDashboardRoute && activeTab === "leads") ||
    location.pathname.startsWith("/lead/");
  const isCallsActive = isDashboardRoute && activeTab === "calls";
  const isProjectsTabActive = isDashboardRoute && activeTab === "projects";
  const isMapActive =
    location.pathname.startsWith("/project/") || isProjectsTabActive;
  const isAdminActive = location.pathname.startsWith("/admin");

  return (
    <>
      <DesktopSidebar
        user={user}
        projects={projects}
        branding={branding}
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        openTemplates={openTemplates}
        openShortcuts={openShortcuts}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        handleLogout={handleLogout}
        locationPathname={location.pathname}
        activeTab={activeTab}
        activeSubtab={activeSubtab}
      />

      <MobileBottomNav
        user={user}
        isLeadsActive={isLeadsActive}
        isCompanyDbActive={isCompanyDbActive}
        isCallsActive={isCallsActive}
        isMapActive={isMapActive}
        isAdminActive={isAdminActive}
        isMobileProfileOpen={isMobileProfileOpen}
        setIsMobileProfileOpen={setIsMobileProfileOpen}
        openTemplates={openTemplates}
      />

      <MobileProfileDrawer
        user={user}
        isOpen={isMobileProfileOpen}
        onClose={() => setIsMobileProfileOpen(false)}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        openShortcuts={openShortcuts}
        handleLogout={handleLogout}
        themeToggle={themeToggle}
      />
    </>
  );
}
