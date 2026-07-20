import { lazy, Suspense } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheck, Home } from "lucide-react";
import { isManagerial as isManagerialUtil } from "@/shared/utils/roleUtils";
import { safeFormatDateTime } from "@/shared/utils/dateUtils";
import { useLeadsStore } from "@/features/leads/hooks/useLeadsStore";
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useUsersStore } from "@/features/employees/hooks/useUsersStore";
import { useCustomRolesStore } from "@/features/admin/hooks/adminStores";
import PageHeader from "@/shared/components/layout/PageHeader";
import { navIconColor } from "@/shared/components/sidebar/sidebarNavStyles";
import { ADMIN_NAV_GROUPS, NAV_LABELS } from "@/shared/constants/navTaxonomy";
import { User } from "@/shared/types";

// Lazy-load tab components
const AdminProjectsTab = lazy(() => import("../components/AdminProjectsTab"));
const AdminLeadsTab = lazy(() => import("../components/AdminLeadsTab"));
const AdminUsersTab = lazy(() => import("../components/AdminUsersTab"));
const AdminRosterTab = lazy(() => import("../components/AdminRosterTab"));
const AdminAnalyticsTab = lazy(() => import("../components/AdminAnalyticsTab"));
const AdminAttendanceTab = lazy(() => import("../components/AdminAttendanceTab"));
const AdminTargetsTab = lazy(() => import("../components/AdminTargetsTab"));
const AdminPerformanceTabs = lazy(() => import("../components/AdminPerformanceTabs"));
const AdminTrainingTabs = lazy(() => import("../components/AdminTrainingTabs"));
const AdminSettingsTabs = lazy(() => import("../components/AdminSettingsTabs"));

interface AdminProps {
  user: User;
}

export default function Admin({ user }: AdminProps) {
  const {
    roles: customRoles,
    addCustomRole,
    updateCustomRole,
    deleteCustomRole,
  } = useCustomRolesStore();
  const isManagerial = (roleCode: string) => isManagerialUtil(roleCode, customRoles);

  const { projects, isLoaded: projectsLoaded } = useProjectsStore();
  const { users, isLoaded: usersLoaded } = useUsersStore();
  const {
    addLead,
    updateLead: updateLeadInStore,
    deleteLead,
    rateCallLog,
    mergeLeads,
  } = useLeadsStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "projects";

  const navigationGroups = ADMIN_NAV_GROUPS;

  const getActiveTabDetails = () => {
    for (const group of navigationGroups) {
      const found = group.items.find((item) => item.id === activeTab);
      if (found) {
        return { groupTitle: group.title, label: found.label };
      }
    }
    return { groupTitle: NAV_LABELS.admin, label: NAV_LABELS.dashboard };
  };

  const getTabDescription = (tabId: string) => {
    const descriptions: Record<string, string> = {
      projects: "Add, update, and configure real estate projects, layouts, maps, and specifications.",
      leads: "Manage sales leads, assign to telecallers, filter statuses, and view logs.",
      users: "Manage telecaller user profiles, roles, groups, status, and permissions.",
      roster: "Plan telecaller shifts, schedules, weekly rosters, and agent availability.",
      analytics: "View business intelligence reports, ROI charts, lead pipelines, and campaign sources.",
      attendance: "Track telecaller daily attendance check-ins, leaves, and approvals.",
      targets: "Define sales targets, goals, and monthly quotas for call performance.",
      leaderboard: "Rank telecallers based on monthly performance, booked units, and site visits.",
      performance: "Audit telecaller productivity metrics, talk times, and targets progress.",
      quality: "Listen to call recordings, audit audio logs, and rate call quality scores.",
      training: "Upload training content, scripts, and video materials for telecallers.",
      coaching: "Manage daily coaching tips and educational banners on agent dashboard.",
      events: "Create and schedule client meets, launch events, and site visits calendar.",
      roles: "Configure user access control groups and role permissions.",
      customfields: "Add custom attributes and metadata fields to leads schema.",
      merge: "Find, review, and merge duplicate customer profiles.",
      integrations: "Map webhook callbacks to sync leads from Facebook, Google, and Webforms.",
      audit: "Browse immutable security audit logs, admin changes, and auth timestamps.",
    };
    return descriptions[tabId] || "Configure workspace parameters.";
  };

  const activeDetails = getActiveTabDetails();
  const skipLinkClassName =
    "sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-theme-accent focus:text-theme-accent-fg focus:rounded-theme focus:outline-none focus:ring-2 focus:ring-theme-ring focus:ring-offset-2 focus:ring-offset-theme-bg";

  if (!isManagerial(user?.role)) {
    return (
      <div className="p-10 text-center text-red-600 font-bold">
        <a href="#main-content" className={skipLinkClassName}>
          Skip to main content
        </a>
        <main id="main-content">Access Denied. Admin only.</main>
      </div>
    );
  }

  if (!projectsLoaded || !usersLoaded) {
    return (
      <div className="h-full min-h-0 bg-theme-bg flex items-center justify-center transition-colors duration-300 app-canvas">
        <a href="#main-content" className={skipLinkClassName}>
          Skip to main content
        </a>
        <main id="main-content" className="text-theme-accent font-bold animate-pulse text-sm">
          Loading admin console...
        </main>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden app-canvas text-theme-text transition-colors duration-300">
      <a href="#main-content" className={skipLinkClassName}>
        Skip to main content
      </a>
      {/* Pinned chrome — never scrolls */}
      <div className="shrink-0 z-30 bg-theme-card">
        {/* Mobile Header with Horizontal Scrollable Navigation */}
        <div className="md:hidden flex flex-col bg-theme-card/95 border-b border-theme-border backdrop-blur-md transition-colors">
          <div className="flex items-center px-4 py-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-theme bg-theme-accent text-theme-accent-fg flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs tracking-wider text-theme-text uppercase">
                {NAV_LABELS.admin}
              </span>
            </div>
          </div>

          {/* Horizontal Scrollable Tabs — min-h-11 touch targets */}
          <div className="flex overflow-x-auto px-4 pb-3 gap-2 scrollbar-none select-none min-w-0">
            {navigationGroups
              .flatMap((g) => g.items)
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSearchParams({ tab: item.id })}
                    className={`inline-flex items-center gap-1.5 min-h-11 px-3 py-2 rounded-theme text-[11px] font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                      isActive
                        ? "bg-theme-accent text-theme-accent-fg shadow-sm"
                        : "bg-theme-surface text-theme-muted hover:text-theme-text hover:bg-theme-card border border-theme-border"
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? "" : navIconColor[item.tone]
                      }`}
                      aria-hidden
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
          </div>
        </div>

        {activeTab !== "branding" && (
          <PageHeader
            title={activeDetails.label}
            description={getTabDescription(activeTab)}
            breadcrumb={
              <>
                <Link to="/" className="hover:text-theme-accent transition-colors flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5" /> {NAV_LABELS.crm}
                </Link>
                <span>/</span>
                <span>{NAV_LABELS.admin}</span>
                <span>/</span>
                <span className="text-theme-muted font-semibold">{activeDetails.groupTitle}</span>
              </>
            }
          />
        )}
      </div>

      {/* Only this region scrolls */}
      <main
        id="main-content"
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 md:p-5 space-y-4 pb-24 md:pb-8"
      >
        <Suspense fallback={
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-theme-accent border-t-transparent"></div>
          </div>
        }>
          <div key={activeTab} className="animate-fade-slide-up">
            {activeTab === "projects" && <AdminProjectsTab user={user} />}

            {activeTab === "leads" && (
              <AdminLeadsTab user={user} isManagerial={isManagerial} />
            )}

            {activeTab === "users" && (
              <AdminUsersTab
                user={user}
                customRoles={customRoles}
                isManagerial={isManagerial}
              />
            )}

            {activeTab === "roster" && (
              <AdminRosterTab
                users={users}
                isManagerial={isManagerial}
                user={user}
              />
            )}

            {activeTab === "analytics" && (
              <AdminAnalyticsTab
                user={user}
                users={users}
                projects={projects}
                isManagerial={isManagerial}
              />
            )}

            {activeTab === "attendance" && (
              <AdminAttendanceTab
                user={user}
                users={users}
                isManagerial={isManagerial}
              />
            )}

            {activeTab === "targets" && (
              <AdminTargetsTab
                user={user}
                users={users}
                isManagerial={isManagerial}
              />
            )}

            {["leaderboard", "performance", "quality"].includes(activeTab) && (
              <AdminPerformanceTabs
                tab={activeTab as "leaderboard" | "performance" | "quality"}
                user={user}
                users={users}
                isManagerial={isManagerial}
                rateCallLog={rateCallLog}
              />
            )}

            {["training", "coaching", "events"].includes(activeTab) && (
              <AdminTrainingTabs
                tab={activeTab as "training" | "coaching" | "events"}
                user={user}
              />
            )}

            {[
              "roles",
              "customfields",
              "merge",
              "branding",
              "integrations",
              "audit",
            ].includes(activeTab) && (
              <AdminSettingsTabs
                tab={activeTab}
                user={user}
                users={users}
                customRoles={customRoles}
                addCustomRole={addCustomRole}
                updateCustomRole={updateCustomRole}
                deleteCustomRole={deleteCustomRole}
                addLead={addLead}
                updateLeadInStore={updateLeadInStore}
                deleteLead={deleteLead}
                mergeLeads={mergeLeads}
                projects={projects}
                isManagerial={isManagerial}
                safeFormatDateTime={safeFormatDateTime}
              />
            )}
          </div>
        </Suspense>
      </main>
    </div>
  );
}
