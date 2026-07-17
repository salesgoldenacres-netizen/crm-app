import { lazy, Suspense } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Map as MapIcon,
  Users,
  Briefcase,
  Calendar,
  TrendingUp,
  Trophy,
  Award,
  Star,
  BookOpen,
  Lightbulb,
  Gift,
  ShieldCheck,
  SlidersHorizontal,
  AlertTriangle,
  Paintbrush,
  Webhook,
  Activity,
  BarChart3,
  Clock,
  Search,
  Home,
} from "lucide-react";
import { isManagerial as isManagerialUtil } from "@/shared/utils/roleUtils";
import { safeFormatDateTime } from "@/shared/utils/dateUtils";
import { useLeadsStore } from "@/features/leads/hooks/useLeadsStore";
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useUsersStore } from "@/features/employees/hooks/useUsersStore";
import { useCustomRolesStore } from "@/features/admin/hooks/adminStores";
import PageHeader from "@/shared/components/layout/PageHeader";
import { navIconColor, type NavIconTone } from "@/shared/components/sidebar/sidebarNavStyles";
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
    leads,
    isLoaded: leadsLoaded,
    addLead,
    updateLead: updateLeadInStore,
    deleteLead,
    rateCallLog,
  } = useLeadsStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "projects";

  const navigationGroups: {
    title: string;
    items: { id: string; label: string; icon: typeof MapIcon; tone: NavIconTone }[];
  }[] = [
    {
      title: "Operations & CRM",
      items: [
        { id: "projects", label: "Manage Projects", icon: MapIcon, tone: "projects" },
        { id: "leads", label: "Manage Leads", icon: Briefcase, tone: "leads" },
        { id: "users", label: "Telecallers & Teams", icon: Users, tone: "users" },
        { id: "roster", label: "Shift Planner", icon: Clock, tone: "roster" },
        { id: "analytics", label: "Analytics & ROI", icon: BarChart3, tone: "analytics" },
      ],
    },
    {
      title: "Performance & HR",
      items: [
        { id: "attendance", label: "Attendance & Leaves", icon: Calendar, tone: "attendance" },
        { id: "targets", label: "Targets & Goals", icon: TrendingUp, tone: "targets" },
        { id: "leaderboard", label: "Leaderboard", icon: Trophy, tone: "leaderboard" },
        { id: "performance", label: "Agent Performance", icon: Award, tone: "performance" },
        { id: "quality", label: "Call Quality Score", icon: Star, tone: "quality" },
      ],
    },
    {
      title: "Training & Coaching",
      items: [
        { id: "training", label: "Training Content", icon: BookOpen, tone: "training" },
        { id: "coaching", label: "Coaching Tip Editor", icon: Lightbulb, tone: "coaching" },
        { id: "events", label: "Client Events Manager", icon: Gift, tone: "events" },
      ],
    },
    {
      title: "System Settings",
      items: [
        { id: "roles", label: "Roles & Permissions", icon: ShieldCheck, tone: "roles" },
        { id: "customfields", label: "Custom Fields", icon: SlidersHorizontal, tone: "customfields" },
        { id: "merge", label: "Duplicate Merge", icon: AlertTriangle, tone: "merge" },
        { id: "branding", label: "Theme & Branding", icon: Paintbrush, tone: "branding" },
        { id: "integrations", label: "Ad Integrations", icon: Webhook, tone: "integrations" },
        { id: "audit", label: "System Audit Logs", icon: Activity, tone: "audit" },
      ],
    },
  ];

  const getActiveTabDetails = () => {
    for (const group of navigationGroups) {
      const found = group.items.find((item) => item.id === activeTab);
      if (found) {
        return { groupTitle: group.title, label: found.label };
      }
    }
    return { groupTitle: "Admin", label: "Dashboard" };
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

  if (!isManagerial(user?.role)) {
    return (
      <div className="p-10 text-center text-red-600 font-bold">
        Access Denied. Admin only.
      </div>
    );
  }

  if (!projectsLoaded || !usersLoaded || !leadsLoaded) {
    return (
      <div className="h-full min-h-0 bg-theme-bg flex items-center justify-center transition-colors duration-300 app-canvas">
        <div className="text-theme-accent font-bold animate-pulse text-sm">
          Loading admin console...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden app-canvas text-theme-text transition-colors duration-300">
      {/* Pinned chrome — never scrolls */}
      <div className="shrink-0 z-30 bg-theme-card">
        {/* Mobile Header with Horizontal Scrollable Navigation */}
        <div className="md:hidden flex flex-col bg-theme-card/95 border-b border-theme-border backdrop-blur-md transition-colors">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-theme-accent text-theme-accent-fg flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="font-extrabold text-xs tracking-wider bg-gradient-to-r from-slate-800 via-indigo-600 to-indigo-700 dark:from-white dark:via-indigo-200 dark:to-indigo-400 bg-clip-text text-transparent uppercase">
                Operations Desk
              </span>
            </div>
            <Link
              to="/"
              className="text-[10px] font-extrabold bg-indigo-600/10 hover:bg-indigo-600/20 text-theme-accent border border-indigo-505/20 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              Back to CRM
            </Link>
          </div>

          {/* Horizontal Scrollable Tabs */}
          <div className="flex overflow-x-auto px-4 pb-3 space-x-2 scrollbar-none select-none">
            {navigationGroups
              .flatMap((g) => g.items)
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSearchParams({ tab: item.id })}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer group btn-hover-bounce ${
                      isActive
                        ? "bg-theme-accent text-theme-accent-fg shadow-sm"
                        : "bg-theme-surface text-theme-muted hover:text-theme-text hover:bg-theme-card border border-theme-border"
                    }`}
                  >
                    <Icon
                      className={`w-3 h-3 transition-transform duration-200 ${
                        isActive ? "" : navIconColor[item.tone]
                      }`}
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
                  <Home className="w-3.5 h-3.5" /> CRM
                </Link>
                <span>/</span>
                <span>Admin</span>
                <span>/</span>
                <span className="text-theme-muted font-semibold">{activeDetails.groupTitle}</span>
              </>
            }
            actions={
              <>
                <div className="relative hidden md:block">
                  <Search className="w-3.5 h-3.5 text-theme-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search console…"
                    className="w-56 bg-theme-surface border border-theme-border rounded-lg pl-8 pr-2.5 h-8 text-[11px] text-theme-text outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-ring/20 transition-all font-semibold"
                    readOnly
                  />
                </div>

                <Link
                  to="/"
                  className="inline-flex items-center justify-center px-2.5 h-8 bg-theme-accent-muted hover:bg-theme-accent/20 border border-theme-accent/30 text-theme-accent rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Back to CRM
                </Link>
              </>
            }
          />
        )}
      </div>

      {/* Only this region scrolls */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 md:p-4 space-y-3 pb-24 md:pb-6">
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
                leads={leads}
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
                leads={leads}
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
                leads={leads}
                addLead={addLead}
                updateLeadInStore={updateLeadInStore}
                deleteLead={deleteLead}
                projects={projects}
                isManagerial={isManagerial}
                safeFormatDateTime={safeFormatDateTime}
              />
            )}
          </div>
        </Suspense>
      </div>
    </div>
  );
}
