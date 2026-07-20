import React from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Map, LayoutGrid, MapPin } from "lucide-react";
import { Project } from "@/shared/types";
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

interface MapsSubmenuProps {
  isSidebarCollapsed: boolean;
  isMapDropdownOpen: boolean;
  setIsMapDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMapActive: boolean;
  isDashboardRoute: boolean;
  activeTab: string;
  locationPathname: string;
  projectList: Project[];
}

export default function MapsSubmenu({
  isSidebarCollapsed,
  isMapDropdownOpen,
  setIsMapDropdownOpen,
  isMapActive,
  isDashboardRoute,
  activeTab,
  locationPathname,
  projectList,
}: MapsSubmenuProps) {
  return (
    <div>
      <div className={sidebarGroupRow(isMapActive, isSidebarCollapsed)}>
        <Link
          to="/?tab=projects"
          className={sidebarGroupLink(isSidebarCollapsed)}
          title={NAV_LABELS.maps}
          aria-label={isSidebarCollapsed ? NAV_LABELS.maps : undefined}
        >
          <Map className={sidebarIcon("maps")} aria-hidden="true" />
          {!isSidebarCollapsed && <span className="truncate">{NAV_LABELS.maps}</span>}
        </Link>
        {!isSidebarCollapsed && (
          <button
            type="button"
            onClick={() => setIsMapDropdownOpen((o) => !o)}
            className={sidebarGroupToggle()}
            aria-label={`Toggle ${NAV_LABELS.maps} menu`}
          >
            <ChevronDown
              className={`${sidebarChevronClass} ${isMapDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>
      {!isSidebarCollapsed && isMapDropdownOpen && (
        <div className={sidebarSubTree()}>
          <Link
            to="/?tab=projects"
            className={sidebarSubItem(isDashboardRoute && activeTab === "projects")}
          >
            <LayoutGrid className={sidebarSubIcon("mapsOverview")} />
            <span className="truncate">Overview</span>
          </Link>
          {projectList.map((project) => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className={sidebarSubItem(locationPathname === `/project/${project.id}`)}
            >
              <MapPin className={sidebarSubIcon("mapsProject")} />
              <span className="truncate">{project.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
