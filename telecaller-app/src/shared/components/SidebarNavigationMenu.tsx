import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Calendar,
  Award,
  UserRound,
  BookOpen,
  Keyboard,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { User, Project } from "@/shared/types";
import CRMSubmenu from "./sidebar/CRMSubmenu";
import CallsSubmenu from "./sidebar/CallsSubmenu";
import MapsSubmenu from "./sidebar/MapsSubmenu";
import OperationsDeskSubmenu from "./sidebar/OperationsDeskSubmenu";
import {
  sidebarCategoryClass,
  sidebarIcon,
  sidebarNavItem,
} from "./sidebar/sidebarNavStyles";

interface SidebarNavigationMenuProps {
  user: User | null;
  isSidebarCollapsed: boolean;
  projects: Record<string, Project> | null;
  locationPathname: string;
  activeTab: string;
  activeSubtab: string;
  openTemplates: () => void;
  openShortcuts: () => void;
  toggleFullscreen: () => void;
  isFullscreen: boolean;
}

export default function SidebarNavigationMenu({
  user,
  isSidebarCollapsed,
  projects,
  locationPathname,
  activeTab,
  activeSubtab,
  openTemplates,
  openShortcuts,
  toggleFullscreen,
  isFullscreen,
}: SidebarNavigationMenuProps) {
  const [isMapDropdownOpen, setIsMapDropdownOpen] = useState(true);
  const [isLeadsOpen, setIsLeadsOpen] = useState(true);
  const [isCallsOpen, setIsCallsOpen] = useState(true);

  const [isOperationsDeskOpen, setIsOperationsDeskOpen] = useState(() => {
    return locationPathname.startsWith("/admin");
  });
  const [isAdminCRMOpen, setIsAdminCRMOpen] = useState(true);
  const [isAdminPerfOpen, setIsAdminPerfOpen] = useState(false);
  const [isAdminCoachOpen, setIsAdminCoachOpen] = useState(false);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);

  const [prevPath, setPrevPath] = useState(locationPathname);
  if (locationPathname !== prevPath) {
    setPrevPath(locationPathname);
    if (locationPathname.startsWith("/admin")) {
      setIsOperationsDeskOpen(true);
    }
    if (locationPathname.startsWith("/project/")) {
      setIsMapDropdownOpen(true);
    }
  }

  const isManager = [
    "admin",
    "upper_management",
    "middle_management",
    "lower_management",
  ].includes(user?.role || "");

  const projectList = Object.values(projects || {});
  const firstProjectId = projectList.length > 0 ? projectList[0].id : null;

  const isDashboardRoute = locationPathname === "/";
  const isCompanyDbActive = isDashboardRoute && activeTab === "company-dashboard";
  const isLeadsActive =
    (isDashboardRoute && activeTab === "leads") || locationPathname.startsWith("/lead/");
  const isCallsActive = isDashboardRoute && activeTab === "calls";
  const isProjectsTabActive = isDashboardRoute && activeTab === "projects";
  const isMapActive = locationPathname.startsWith("/project/") || isProjectsTabActive;
  const isAttendanceActive = isDashboardRoute && activeTab === "attendance";
  const isTrainingActive = isDashboardRoute && activeTab === "training";
  const isProfileActive = isDashboardRoute && activeTab === "profile";
  const isAdminActive = locationPathname.startsWith("/admin");

  const toolBtnClass = sidebarNavItem(false, isSidebarCollapsed);

  return (
    <nav className="flex-1 min-h-0 px-2.5 py-3 overflow-y-auto overflow-x-hidden text-theme-text scrollbar-thin">
      {!isSidebarCollapsed && (
        <div className={sidebarCategoryClass(true)}>Main Menu</div>
      )}

      <div className="space-y-0.5">
        {isManager && (
          <Link
            to="/?tab=company-dashboard"
            className={sidebarNavItem(isCompanyDbActive, isSidebarCollapsed)}
            title="Dashboard"
          >
            <BarChart3 className={sidebarIcon("dashboard")} />
            {!isSidebarCollapsed && <span className="truncate">Dashboard</span>}
          </Link>
        )}

        <CRMSubmenu
          isSidebarCollapsed={isSidebarCollapsed}
          isLeadsOpen={isLeadsOpen}
          setIsLeadsOpen={setIsLeadsOpen}
          isLeadsActive={isLeadsActive}
          isDashboardRoute={isDashboardRoute}
          activeTab={activeTab}
          activeSubtab={activeSubtab}
          userRole={user?.role}
        />

        <CallsSubmenu
          isSidebarCollapsed={isSidebarCollapsed}
          isCallsOpen={isCallsOpen}
          setIsCallsOpen={setIsCallsOpen}
          isCallsActive={isCallsActive}
          isDashboardRoute={isDashboardRoute}
          activeTab={activeTab}
          activeSubtab={activeSubtab}
        />

        <MapsSubmenu
          isSidebarCollapsed={isSidebarCollapsed}
          isMapDropdownOpen={isMapDropdownOpen}
          setIsMapDropdownOpen={setIsMapDropdownOpen}
          isMapActive={isMapActive}
          isDashboardRoute={isDashboardRoute}
          activeTab={activeTab}
          locationPathname={locationPathname}
          projectList={projectList}
        />

        <Link
          to="/?tab=attendance"
          className={sidebarNavItem(isAttendanceActive, isSidebarCollapsed)}
          title="Attendance"
        >
          <Calendar className={sidebarIcon("attendance")} />
          {!isSidebarCollapsed && <span className="truncate">Attendance</span>}
        </Link>

        <Link
          to="/?tab=training"
          className={sidebarNavItem(isTrainingActive, isSidebarCollapsed)}
          title="Training"
        >
          <Award className={sidebarIcon("training")} />
          {!isSidebarCollapsed && <span className="truncate">Training</span>}
        </Link>

        <Link
          to="/?tab=profile"
          className={sidebarNavItem(isProfileActive, isSidebarCollapsed)}
          title="My Profile"
        >
          <UserRound className={sidebarIcon("profile")} />
          {!isSidebarCollapsed && <span className="truncate">My Profile</span>}
        </Link>
      </div>

      {!isSidebarCollapsed && <div className={sidebarCategoryClass()}>Tools</div>}

      <div className="space-y-0.5">
        <button
          type="button"
          onClick={openTemplates}
          className={`w-full text-left bg-transparent border-0 cursor-pointer ${toolBtnClass}`}
          title="Message Templates"
        >
          <BookOpen className={sidebarIcon("templates")} />
          {!isSidebarCollapsed && <span className="truncate">Templates</span>}
        </button>

        <button
          type="button"
          onClick={openShortcuts}
          className={`w-full text-left bg-transparent border-0 cursor-pointer ${toolBtnClass}`}
          title="Shortcuts"
        >
          <Keyboard className={sidebarIcon("shortcuts")} />
          {!isSidebarCollapsed && <span className="truncate">Shortcuts</span>}
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className={`w-full text-left bg-transparent border-0 cursor-pointer ${toolBtnClass}`}
          title="Toggle Full Screen"
        >
          {isFullscreen ? (
            <Minimize2 className={sidebarIcon("fullscreen")} />
          ) : (
            <Maximize2 className={sidebarIcon("fullscreen")} />
          )}
          {!isSidebarCollapsed && <span className="truncate">Full Screen</span>}
        </button>
      </div>

      <OperationsDeskSubmenu
        isSidebarCollapsed={isSidebarCollapsed}
        isOperationsDeskOpen={isOperationsDeskOpen}
        setIsOperationsDeskOpen={setIsOperationsDeskOpen}
        isAdminActive={isAdminActive}
        firstProjectId={firstProjectId}
        isAdminCRMOpen={isAdminCRMOpen}
        setIsAdminCRMOpen={setIsAdminCRMOpen}
        isAdminPerfOpen={isAdminPerfOpen}
        setIsAdminPerfOpen={setIsAdminPerfOpen}
        isAdminCoachOpen={isAdminCoachOpen}
        setIsAdminCoachOpen={setIsAdminCoachOpen}
        isAdminSettingsOpen={isAdminSettingsOpen}
        setIsAdminSettingsOpen={setIsAdminSettingsOpen}
        activeTab={activeTab}
      />
    </nav>
  );
}
