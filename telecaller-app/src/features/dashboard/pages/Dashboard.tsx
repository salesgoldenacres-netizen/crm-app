import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";

// Shared Layouts & Components
import { useToast } from "@/shared/components/Toast";
import ConfettiEffect from "@/shared/components/ConfettiEffect";

// Modular Dashboard Parts
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import MobileDrawer from "@/features/dashboard/components/MobileDrawer";
import MobileStatusPanel from "@/features/dashboard/components/MobileStatusPanel";
import DashboardDialerHost, {
  DashboardDialerHandle,
} from "@/features/dashboard/components/DashboardDialerHost";
import DashboardTimerHost from "@/features/dashboard/components/DashboardTimerHost";
import AddLeadModal, { AddLeadFormState } from "@/features/leads/components/AddLeadModal";
import CustomizerDrawer from "@/features/dashboard/components/CustomizerDrawer";
import DashboardTabContent from "@/features/dashboard/components/DashboardTabContent";
import {
  DashboardProvider,
  DashboardContextValue,
} from "@/features/dashboard/context/DashboardContext";
import { getAgentBadgesAndStats } from "@/features/dashboard/utils/agentStats";

// Custom Feature Hooks
import { useDashboardLeads } from "@/features/dashboard/hooks/useDashboardLeads";
import { useDashboardPushConfig } from "@/features/dashboard/hooks/useDashboardPushConfig";
import { useDashboardWidgets } from "@/features/dashboard/hooks/useDashboardWidgets";

// Global Stores
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useLeadsStore, LogCallPayload } from "@/features/leads/hooks/useLeadsStore";
import { useAnalytics } from "@/shared/services/analytics/AnalyticsContext";
import { useAgentOpenLeads } from "@/features/leads/hooks/useAgentOpenLeads";
import { AGENT_OPEN_LEADS_REALTIME_BOUND } from "@/shared/services/leads/leadQueryConstants";
import { useUsersStore } from "@/features/employees/hooks/useUsersStore";
import { useNotificationsStore } from "@/features/dashboard/hooks/useNotificationsStore";
import { useAgentStatusStore } from "@/features/employees/hooks/useAgentStatusStore";
import { useIVRStore } from "@/features/calls/hooks/useIVRStore";
import { useAttendanceStore } from "@/features/attendance/hooks/useAttendanceStore";
import { useLeaveRequestsStore } from "@/features/attendance/hooks/useLeaveRequestsStore";
import { useDashboardPreferencesStore } from "@/features/dashboard/hooks/useDashboardPreferencesStore";
import {
  useCallTargetStore,
  useGoalsStore,
  useTrainingStore,
  useCoachingTipStore,
  useEventsStore,
  useCustomRolesStore,
  useRostersStore,
  useTasksStore,
  useAuditLogsStore,
} from "@/features/admin/hooks/adminStores";

// Utils
import { isManagerial as isManagerialUtil } from "@/shared/utils/roleUtils";
import { User, Lead } from "@/shared/types";
import { useAuthorization } from "@/shared/services/AuthorizationContext";
interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout: _onLogout }: DashboardProps) {
  const navigate = useNavigate();
  const { roles: customRoles } = useCustomRolesStore();
  const { canAssignLead } = useAuthorization();
  const isManagerial = useCallback(
    (roleCode?: string) => {
      if (!roleCode || roleCode === user.role) {
        return canAssignLead();
      }
      return isManagerialUtil(roleCode || "", customRoles);
    },
    [customRoles, user.role, canAssignLead]
  );

  const { toast } = useToast();
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Global Stores Fetches
  const { projects, isLoaded: projectsLoaded } = useProjectsStore();
  const { addLead: baseAddLead, updateLead: baseUpdateLead, logCall: baseLogCall } = useLeadsStore();
  const { refreshDashboard } = useAnalytics();

  const logCall = useCallback(
    async (leadId: string, payload: LogCallPayload) => {
      await baseLogCall(leadId, payload);
      refreshDashboard();
    },
    [baseLogCall, refreshDashboard]
  );

  const updateLead = useCallback(
    async (
      id: string,
      updatedFields: Partial<Lead>,
      options?: { suppressTimeline?: boolean }
    ) => {
      await baseUpdateLead(id, updatedFields, options);
      if (updatedFields.status !== undefined) {
        refreshDashboard();
      }
    },
    [baseUpdateLead, refreshDashboard]
  );

  const addLead = useCallback(
    async (leadData: Partial<Lead> & { name: string; phone: string }) => {
      const result = await baseAddLead(leadData);
      refreshDashboard();
      return result;
    },
    [baseAddLead, refreshDashboard]
  );
  const { openLeads: leads, isLoaded: leadsLoaded } = useAgentOpenLeads();
  const { users } = useUsersStore();

  const { notifications, addNotification, markAsRead, markAllAsRead } = useNotificationsStore(user?.id);
  const addDashboardNotification = useCallback(
    (title: string, message: string, type: "info" | "success" | "warning" | "error" = "info") =>
      addNotification({ message: title ? `${title}: ${message}` : message, type }),
    [addNotification]
  );
  const { agentStatuses, updateAgentStatus } = useAgentStatusStore();
  const { ivrSettings, activeIvrCall, clearActiveIvrCall } = useIVRStore(user?.id);
  const { todayAttendance, allAttendance, clockIn, clockOut, startBreak, endBreak } = useAttendanceStore(user?.id);
  const clockInCurrentUser = useCallback(() => clockIn(user.username), [clockIn, user.username]);
  const startBreakCurrentUser = useCallback(() => startBreak(user.username), [startBreak, user.username]);
  const endBreakCurrentUser = useCallback(() => endBreak(user.username), [endBreak, user.username]);
  const clockOutCurrentUser = useCallback(() => clockOut(user.username), [clockOut, user.username]);

  // Search & Navigation tab states
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = isManagerial(user.role) ? "company-dashboard" : "leads";
  const activeTab = searchParams.get("tab") || defaultTab;

  const [leadSearchQuery] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState("all");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [mapSelectedProject, setMapSelectedProject] = useState("golden-acres");

  const leadsSubTab = activeTab === "leads" ? searchParams.get("subtab") || "dashboard" : "dashboard";
  const callsSubTab = activeTab === "calls" ? searchParams.get("subtab") || "whatsapp" : "whatsapp";

  // Phase 2E: only subscribe widget/admin stores when their UI is mounted
  const needsWidgetStores = activeTab === "leads" && leadsSubTab === "dashboard";
  const needsTrainingStore = activeTab === "training";

  const { trainingData } = useTrainingStore({ enabled: needsTrainingStore });
  const { coachingTip } = useCoachingTipStore({ enabled: needsWidgetStores });

  // History: push (default) — matches sidebar <Link> so Back returns prior tab/subtab.
  const setActiveTab = useCallback(
    (tab: string) => {
      setSearchParams((prev) => {
        prev.set("tab", tab);
        prev.delete("subtab");
        return prev;
      });
    },
    [setSearchParams]
  );

  const setLeadsSubTab = useCallback(
    (subtab: string) => {
      setSearchParams((prev) => {
        prev.set("subtab", subtab);
        return prev;
      });
    },
    [setSearchParams]
  );

  const setCallsSubTab = useCallback(
    (subtab: string) => {
      setSearchParams((prev) => {
        prev.set("subtab", subtab);
        return prev;
      });
    },
    [setSearchParams]
  );

  // Advanced Filters State — hoisted/memoized so its reference is stable across
  // renders and does not invalidate useDashboardLeads' memo every render (F-2).
  const advancedFilters = useMemo(
    () => ({
      status: "",
      source: "",
      dateRange: "all",
      budgetMax: "",
    }),
    []
  );

  // Derived states
  const agentStats = useMemo(() => {
    return getAgentBadgesAndStats(user.id, user.username, leads, allAttendance);
  }, [user.id, user.username, leads, allAttendance]);

  const myAgentStatus = useMemo(() => {
    return (
      agentStatuses[user.id]?.status ||
      (todayAttendance && !todayAttendance.checkOut ? "available" : "offline")
    );
  }, [agentStatuses, todayAttendance, user.id]);

  // Hook 1: Stats and Leads
  const { myLeads, computedStats } = useDashboardLeads(
    leads,
    user.id,
    user.role,
    todayStr,
    isManagerial,
    leadStatusFilter,
    advancedFilters,
    leadSearchQuery,
    projects
  );

  const {
    totalAssigned,
    rawCount,
    hotCount,
    overdueCount,
    followupsToday,
    newCount,
    notAttemptedCount,
    bookedCount,
    contactedCount,
    interestedCount,
    notInterestedCount,
    siteVisitCompletedCount,
    siteVisitConfirmed,
    rnrCount,
    reEngagedCount,
  } = computedStats;

  // Hook 2: Push Notifications & Remote Config
  const { showAnnouncement, setShowAnnouncement, announcementText } = useDashboardPushConfig(
    user,
    addNotification
  );

  // UI States
  const [simulatedWaLeadId, setSimulatedWaLeadId] = useState("");
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isAgentPanelExpanded, setIsAgentPanelExpanded] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [triggerConfetti] = useState(false);

  // Add lead form state
  const [addLeadForm, setAddLeadForm] = useState<AddLeadFormState>({
    name: "",
    phone: "",
    email: "",
    projectId: "",
    plotId: "",
    notes: "",
    status: "new",
    assignedTo: !isManagerial(user.role) ? user.id : "",
    priority: "warm",
    createdTime: "",
    leadSource: "",
    leadMedium: "",
    followUpOn: "",
    leadNumber: "",
    createdBy: "",
  });

  const matchedIvrLead = useMemo(() => {
    return activeIvrCall
      ? leads.find((l) => l.id === activeIvrCall.leadId) ||
          leads.find((l) => l.phone === activeIvrCall.callerPhone) ||
          null
      : null;
  }, [activeIvrCall, leads]);

  const setActiveLeadId = useCallback((leadId: string) => {
    navigate(`/lead/${leadId}`);
  }, [navigate]);

  const setActiveLead = useCallback(
    (lead: Lead | null) => {
      if (lead?.id) navigate(`/lead/${lead.id}`);
    },
    [navigate]
  );

  // Hook 3: Outbound Dialer — state lives inside DashboardDialerHost so its 1Hz
  // duration ticker does not re-render the whole Dashboard tab tree (P-4).
  // Shift/break timers live inside DashboardTimerHost (H-1) the same way.
  const dialerRef = useRef<DashboardDialerHandle>(null);
  const handleStartCall = useCallback((lead: Lead) => {
    dialerRef.current?.startCall(lead);
  }, []);

  // Hook 4: Widget grid preferences
  const {
    widgets: dbWidgetsPreference,
    isLoaded: prefsLoaded,
    updateWidgets,
    resetPreferences,
    widgetStyle,
    updateWidgetStyle,
    widgetDensity,
    updateWidgetDensity,
  } = useDashboardPreferencesStore(user?.id);

  const {
    widgets,
    setWidgets,
    isCustomizerOpen,
    setIsCustomizerOpen,
  } = useDashboardWidgets(prefsLoaded, dbWidgetsPreference, updateWidgets);

  // Fetch admin and attendance store values for dashboard widgets slot (lazy when not on widgets)
  const { targets } = useCallTargetStore({ enabled: needsWidgetStores });
  const { goals } = useGoalsStore({ enabled: needsWidgetStores });
  const { rosters } = useRostersStore({ enabled: needsWidgetStores });
  const { events: calendarEvents } = useEventsStore({ enabled: needsWidgetStores });
  const { logAuditEvent } = useAuditLogsStore(); // write-only; list opt-in elsewhere
  const todayMMDD = useMemo(() => new Date().toISOString().slice(5, 10), []);
  const todaysEvents = useMemo(() => {
    return calendarEvents ? calendarEvents.filter((ev) => ev.date === todayMMDD) : [];
  }, [calendarEvents, todayMMDD]);

  const {
    tasks: backendTasks,
    addTask,
    toggleTask,
    deleteTask,
    clearCompletedTasks,
  } = useTasksStore(user?.id, { enabled: needsWidgetStores });

  const { leaveRequests, submitLeaveRequest } = useLeaveRequestsStore({
    enabled: needsWidgetStores,
  });

  const latestAnnouncement = useMemo(() => {
    return notifications.find((n) => !n.userId && !n.read);
  }, [notifications]);

  /**
   * Follow-up alerts from agent openLeads only (useAgentOpenLeads), bounded to
   * AGENT_OPEN_LEADS_REALTIME_BOUND assigned leads via DatabaseContext.
   * Managers get an empty array by design — no company-wide lead scan here.
   * Company-wide follow-ups need LeadQueryService + followUpDate filter (future).
   */
  const followUpAlertLeads = useMemo(() => {
    if (isManagerial(user.role)) {
      return [];
    }
    return leads
      .slice(0, AGENT_OPEN_LEADS_REALTIME_BOUND)
      .filter(
        (l) =>
          l.assignedTo === user.id &&
          l.followUpDate === todayStr &&
          l.status !== "booked" &&
          l.status !== "not-interested"
      );
  }, [leads, user.id, user.role, isManagerial, todayStr]);

  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let assignedName = "Unassigned";
    if (addLeadForm.assignedTo === user.id) {
      assignedName = user.username;
    }

    try {
      const result = await addLead({
        ...addLeadForm,
        assignedToName: assignedName,
      });

      const resObj = result as { isDuplicate?: boolean; name: string };
      if (resObj?.isDuplicate) {
        toast(
          `Duplicate detected — merged into existing lead for ${resObj.name}`,
          "warning"
        );
      } else {
        toast(
          `Lead "${addLeadForm.name || "New Lead"}" added successfully!`,
          "success"
        );
      }
    } catch (err: any) {
      toast(`Failed to add lead: ${err.message}`, "error");
      return;
    }

    setAddLeadForm({
      name: "",
      phone: "",
      email: "",
      projectId: "",
      plotId: "",
      notes: "",
      status: "new",
      assignedTo: !isManagerial(user.role) ? user.id : "",
      priority: "warm",
      createdTime: "",
      leadSource: "",
      leadMedium: "",
      followUpOn: "",
      leadNumber: "",
      createdBy: "",
    });
    setIsAddLeadModalOpen(false);
  };

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const skipLinkClassName =
    "sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-theme-accent focus:text-theme-accent-fg focus:rounded-theme focus:outline-none focus:ring-2 focus:ring-theme-ring focus:ring-offset-2 focus:ring-offset-theme-bg";

  // Aggregated Dashboard state shared with the tab tree via context (F-1).
  const dashboardContextValue: DashboardContextValue = useMemo(
    () => ({
      activeTab,
      user,
      users,
      leads,
      myLeads,
      projects,
      isManagerial,
      totalAssigned,
      rawCount,
      hotCount,
      overdueCount,
      followupsToday,
      newCount,
      notAttemptedCount,
      bookedCount,
      contactedCount,
      interestedCount,
      notInterestedCount,
      siteVisitCompletedCount,
      siteVisitConfirmed,
      rnrCount,
      reEngagedCount,
      addNotification: addDashboardNotification,
      targets,
      goals,
      rosters,
      coachingTip,
      todaysEvents,
      latestAnnouncement,
      markAsRead,
      followUpAlertLeads,
      setLeadStatusFilter,
      backendTasks,
      addTask,
      toggleTask,
      deleteTask,
      clearCompletedTasks,
      leaveRequests,
      submitLeaveRequest,
      todayAttendance,
      allAttendance,
      clockIn: clockInCurrentUser,
      startBreak: startBreakCurrentUser,
      endBreak: endBreakCurrentUser,
      clockOut: clockOutCurrentUser,
      widgets,
      setWidgets,
      updateWidgets,
      widgetStyle,
      updateWidgetStyle,
      widgetDensity,
      updateWidgetDensity,
      isCustomizerOpen,
      setIsCustomizerOpen,
      logAuditEvent,
      agentStats,
      resetPreferences,
      setActiveLead,
      leadsSubTab,
      setLeadsSubTab,
      handleStartCall,
      setSimulatedWaLeadId,
      setCallsSubTab,
      setActiveTab,
      projectSearchQuery,
      setProjectSearchQuery,
      mapSelectedProject,
      setMapSelectedProject,
      callsSubTab,
      simulatedWaLeadId,
      trainingData,
      refreshDashboard,
      logCall,
      updateLead,
    }),
    [
      activeTab,
      user,
      users,
      leads,
      myLeads,
      projects,
      isManagerial,
      totalAssigned,
      rawCount,
      hotCount,
      overdueCount,
      followupsToday,
      newCount,
      notAttemptedCount,
      bookedCount,
      contactedCount,
      interestedCount,
      notInterestedCount,
      siteVisitCompletedCount,
      siteVisitConfirmed,
      rnrCount,
      reEngagedCount,
      addDashboardNotification,
      targets,
      goals,
      rosters,
      coachingTip,
      todaysEvents,
      latestAnnouncement,
      markAsRead,
      followUpAlertLeads,
      setLeadStatusFilter,
      backendTasks,
      addTask,
      toggleTask,
      deleteTask,
      clearCompletedTasks,
      leaveRequests,
      submitLeaveRequest,
      todayAttendance,
      allAttendance,
      clockInCurrentUser,
      startBreakCurrentUser,
      endBreakCurrentUser,
      clockOutCurrentUser,
      widgets,
      setWidgets,
      updateWidgets,
      widgetStyle,
      updateWidgetStyle,
      widgetDensity,
      updateWidgetDensity,
      isCustomizerOpen,
      setIsCustomizerOpen,
      logAuditEvent,
      agentStats,
      resetPreferences,
      setActiveLead,
      leadsSubTab,
      setLeadsSubTab,
      handleStartCall,
      setSimulatedWaLeadId,
      setCallsSubTab,
      setActiveTab,
      projectSearchQuery,
      setProjectSearchQuery,
      mapSelectedProject,
      setMapSelectedProject,
      callsSubTab,
      simulatedWaLeadId,
      trainingData,
      refreshDashboard,
      logCall,
      updateLead,
    ]
  );

  // Loading skeleton screen
  if (!projectsLoaded || !leadsLoaded || !prefsLoaded) {
    return (
      <div className="h-full min-h-0 bg-theme-bg flex flex-col" aria-busy="true" aria-label="Loading dashboard">
        <a href="#main-content" className={skipLinkClassName}>
          Skip to main content
        </a>
        <div className="h-14 border-b border-theme-border bg-theme-card px-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-theme bg-theme-surface animate-pulse" />
          <div className="h-5 w-40 rounded-theme bg-theme-surface animate-pulse" />
          <div className="ml-auto flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-theme-surface animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-theme-surface animate-pulse" />
            <div className="w-24 h-8 rounded-theme bg-theme-surface animate-pulse" />
          </div>
        </div>
        <main id="main-content" className="flex-1 p-4 md:p-6 w-full max-w-none space-y-6">
          <div className="flex gap-3 flex-wrap">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 w-28 rounded-full bg-theme-surface animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-theme border border-theme-border p-5 space-y-3 bg-theme-card"
              >
                <div className="h-4 w-24 rounded-theme bg-theme-surface animate-pulse" />
                <div className="h-16 w-16 rounded-full bg-theme-surface animate-pulse mx-auto" />
                <div className="h-3 w-20 rounded-theme bg-theme-surface animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <DashboardTimerHost todayAttendance={todayAttendance}>
      <div className="h-full min-h-0 flex flex-col overflow-hidden w-full">
      <a href="#main-content" className={skipLinkClassName}>
        Skip to main content
      </a>
      <ConfettiEffect active={triggerConfetti} />

      {/* Pinned chrome — never scrolls */}
      <div className="shrink-0 z-40">
        <DashboardHeader
          user={user}
          isManagerial={isManagerial}
          todayAttendance={todayAttendance}
          myAgentStatus={myAgentStatus}
          unreadNotificationsCount={unreadNotificationsCount}
          notifications={notifications}
          markAllAsRead={markAllAsRead}
          markAsRead={markAsRead}
          clockIn={clockIn}
          clockOut={clockOut}
          startBreak={startBreak}
          endBreak={endBreak}
          updateAgentStatus={updateAgentStatus}
          agentStats={agentStats}
          isNotificationDropdownOpen={isNotificationDropdownOpen}
          setIsNotificationDropdownOpen={setIsNotificationDropdownOpen}
          isProfileDropdownOpen={isProfileDropdownOpen}
          setIsProfileDropdownOpen={setIsProfileDropdownOpen}
          setIsMobileDrawerOpen={setIsMobileDrawerOpen}
        />
      </div>

      {/* Mobile Portal Navigation Drawer */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        user={user}
        isManagerial={isManagerial}
        activeTab={activeTab}
      />

      <main
        id="main-content"
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full pb-20 md:pb-0"
      >
        {/* Mobile Status Details Summary Panel */}
        <MobileStatusPanel
          user={user}
          todayAttendance={todayAttendance}
          myAgentStatus={myAgentStatus}
          showAnnouncement={showAnnouncement}
          setShowAnnouncement={setShowAnnouncement}
          announcementText={announcementText}
          coachingTip={coachingTip}
          isAgentPanelExpanded={isAgentPanelExpanded}
          setIsAgentPanelExpanded={setIsAgentPanelExpanded}
          startBreak={startBreak}
          endBreak={endBreak}
          clockOut={clockOut}
          updateAgentStatus={updateAgentStatus}
        />
        <div className="w-full max-w-full mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-12">
          <DashboardProvider value={dashboardContextValue}>
            <DashboardTabContent />
          </DashboardProvider>
        </div>
      </main>

      {/*
        Outbound dialer for Dashboard-local call state only.
        IVR ringing is hosted solely by ModalHost DialerOverlay to avoid dual
        focus-trapped modals (Wave 10 Agent 7).
        Dialer state (incl. the 1Hz duration ticker) is encapsulated here so it
        does not re-render the Dashboard tab tree every second (P-4).
      */}
      <DashboardDialerHost
        ref={dialerRef}
        user={user}
        isManagerial={isManagerial}
        updateAgentStatus={updateAgentStatus}
        ivrSettings={ivrSettings}
        activeIvrCall={activeIvrCall}
        clearActiveIvrCall={clearActiveIvrCall}
        matchedIvrLead={matchedIvrLead}
        toast={toast}
        setActiveLeadId={setActiveLeadId}
        setIsAddLeadModalOpen={setIsAddLeadModalOpen}
        setAddLeadForm={setAddLeadForm}
        projects={projects}
      />

      {/* Modular Form Modal for manual Lead submission */}
      <AddLeadModal
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
        projects={projects}
        addLeadForm={addLeadForm}
        setAddLeadForm={setAddLeadForm}
        onSubmit={handleAddLeadSubmit}
      />

      {/* Customizer drawer for widget layout grid resizing */}
      <CustomizerDrawer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        widgets={widgets}
        setWidgets={setWidgets}
        updateWidgets={updateWidgets}
        widgetStyle={widgetStyle}
        updateWidgetStyle={updateWidgetStyle}
        widgetDensity={widgetDensity}
        updateWidgetDensity={updateWidgetDensity}
        resetPreferences={resetPreferences}
        isManagerial={isManagerial}
        user={user}
      />

      {/* Add Lead FAB — stacked above global Dial FAB (ModalHost) to avoid collision */}
      {(activeTab === "leads" || activeTab === "calls") && (
        <button
          type="button"
          onClick={() => {
            setAddLeadForm({
              name: "",
              phone: "",
              email: "",
              projectId: "",
              plotId: "",
              notes: "",
              status: "new",
              assignedTo: !isManagerial(user.role) ? user.id : "",
              priority: "warm",
              createdTime: new Date().toISOString(),
              leadSource: "Direct Call",
              leadMedium: "Direct",
              followUpOn: "",
              leadNumber: "",
              createdBy: user.username,
            });
            setIsAddLeadModalOpen(true);
          }}
          className="md:hidden fixed bottom-36 right-6 z-40 w-14 h-14 bg-theme-accent hover:opacity-90 rounded-full flex items-center justify-center text-theme-accent-fg shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-theme-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg"
          title="Add New Lead"
          aria-label="Add new lead"
        >
          <Plus className="w-6 h-6" aria-hidden="true" />
        </button>
      )}
      </div>
    </DashboardTimerHost>
  );
}
