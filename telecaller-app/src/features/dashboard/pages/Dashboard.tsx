import { useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";

// Shared Layouts & Components
import { useToast } from "@/shared/components/Toast";
import ConfettiEffect from "@/shared/components/ConfettiEffect";

// Modular Dashboard Parts
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import MobileDrawer from "@/features/dashboard/components/MobileDrawer";
import MobileStatusPanel from "@/features/dashboard/components/MobileStatusPanel";
import DialerOverlay from "@/features/calls/components/DialerOverlay";
import AddLeadModal, { AddLeadFormState } from "@/features/leads/components/AddLeadModal";
import CustomizerDrawer from "@/features/dashboard/components/CustomizerDrawer";
import DashboardTabContent from "@/features/dashboard/components/DashboardTabContent";
import { getAgentBadgesAndStats } from "@/features/dashboard/utils/agentStats";

// Custom Feature Hooks
import { useDashboardLeads } from "@/features/dashboard/hooks/useDashboardLeads";
import { useDashboardPushConfig } from "@/features/dashboard/hooks/useDashboardPushConfig";
import { useDashboardDialer } from "@/features/dashboard/hooks/useDashboardDialer";
import { useDashboardTimers } from "@/features/dashboard/hooks/useDashboardTimers";
import { useDashboardWidgets } from "@/features/dashboard/hooks/useDashboardWidgets";

// Global Stores
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useLeadsStore } from "@/features/leads/hooks/useLeadsStore";
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
import { User } from "@/shared/types";
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
  const { addLead } = useLeadsStore();
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

  // Advanced Filters State
  const advancedFilters = {
    status: "",
    source: "",
    dateRange: "all",
    budgetMax: "",
  };

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

  // Dialer log form states
  const [, setCallLogForm] = useState({
    note: "",
    status: "contacted",
    followUpDate: "",
    priority: "warm",
    disposition: "Connected",
  });

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

  // Hook 3: Outbound Dialer
  const {
    activeDialerLead,
    dialerStatus,
    dialerSeconds,
    dialerMuted,
    setDialerMuted,
    dialerSpeaker,
    setDialerSpeaker,
    handleStartCall,
    handleEndCall,
    handleAnswerIvrCall,
  } = useDashboardDialer(
    user,
    isManagerial,
    updateAgentStatus,
    ivrSettings,
    activeIvrCall,
    clearActiveIvrCall,
    matchedIvrLead,
    toast,
    setActiveLeadId,
    setIsAddLeadModalOpen,
    setAddLeadForm
  );

  // Hook 4: Shift Work Hours & Breaks timers
  const { elapsedWorkSeconds, elapsedBreakSeconds } = useDashboardTimers(todayAttendance);

  // Hook 5: Widget grid preferences
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
  const toggleTaskDone = useCallback((taskId: string) => toggleTask(taskId, true), [toggleTask]);

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
        <main id="main-content" className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
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
          elapsedWorkSeconds={elapsedWorkSeconds}
          elapsedBreakSeconds={elapsedBreakSeconds}
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
          elapsedWorkSeconds={elapsedWorkSeconds}
          elapsedBreakSeconds={elapsedBreakSeconds}
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
          <DashboardTabContent
            activeTab={activeTab}
            user={user}
            users={users}
            leads={leads}
            myLeads={myLeads}
            projects={projects}
            isManagerial={isManagerial}
            totalAssigned={totalAssigned}
            rawCount={rawCount}
            hotCount={hotCount}
            overdueCount={overdueCount}
            followupsToday={followupsToday}
            newCount={newCount}
            notAttemptedCount={notAttemptedCount}
            bookedCount={bookedCount}
            contactedCount={contactedCount}
            interestedCount={interestedCount}
            notInterestedCount={notInterestedCount}
            siteVisitCompletedCount={siteVisitCompletedCount}
            siteVisitConfirmed={siteVisitConfirmed}
            rnrCount={rnrCount}
            reEngagedCount={reEngagedCount}
            addNotification={addDashboardNotification}
            targets={targets}
            goals={goals}
            rosters={rosters}
            coachingTip={coachingTip}
            todaysEvents={todaysEvents}
            latestAnnouncement={latestAnnouncement}
            markAsRead={markAsRead}
            followUpAlertLeads={followUpAlertLeads}
            setLeadStatusFilter={setLeadStatusFilter}
            backendTasks={backendTasks}
            addTask={addTask}
            toggleTask={toggleTaskDone}
            deleteTask={deleteTask}
            clearCompletedTasks={clearCompletedTasks}
            leaveRequests={leaveRequests}
            submitLeaveRequest={submitLeaveRequest}
            todayAttendance={todayAttendance}
            allAttendance={allAttendance}
            clockIn={clockInCurrentUser}
            startBreak={startBreakCurrentUser}
            endBreak={endBreakCurrentUser}
            clockOut={clockOutCurrentUser}
            elapsedWorkSeconds={elapsedWorkSeconds}
            elapsedBreakSeconds={elapsedBreakSeconds}
            widgets={widgets}
            setWidgets={setWidgets}
            updateWidgets={updateWidgets}
            widgetStyle={widgetStyle}
            updateWidgetStyle={updateWidgetStyle}
            widgetDensity={widgetDensity}
            updateWidgetDensity={updateWidgetDensity}
            isCustomizerOpen={isCustomizerOpen}
            setIsCustomizerOpen={setIsCustomizerOpen}
            logAuditEvent={logAuditEvent}
            agentStats={agentStats}
            resetPreferences={resetPreferences}
            leadsSubTab={leadsSubTab}
            setLeadsSubTab={setLeadsSubTab}
            handleStartCall={handleStartCall}
            setSimulatedWaLeadId={setSimulatedWaLeadId}
            setCallsSubTab={setCallsSubTab}
            setActiveTab={setActiveTab}
            projectSearchQuery={projectSearchQuery}
            setProjectSearchQuery={setProjectSearchQuery}
            mapSelectedProject={mapSelectedProject}
            setMapSelectedProject={setMapSelectedProject}
            callsSubTab={callsSubTab}
            simulatedWaLeadId={simulatedWaLeadId}
            trainingData={trainingData}
          />
        </div>
      </main>

      {/*
        Outbound dialer for Dashboard-local call state only.
        IVR ringing is hosted solely by ModalHost DialerOverlay to avoid dual
        focus-trapped modals (Wave 10 Agent 7).
      */}
      <DialerOverlay
        activeDialerLead={activeDialerLead}
        dialerStatus={dialerStatus}
        dialerSeconds={dialerSeconds}
        dialerMuted={dialerMuted}
        setDialerMuted={setDialerMuted}
        dialerSpeaker={dialerSpeaker}
        setDialerSpeaker={setDialerSpeaker}
        handleEndCall={() => handleEndCall(setCallLogForm as any)}
        activeIvrCall={null}
        ivrSettings={ivrSettings}
        matchedIvrLead={null}
        projects={projects}
        clearActiveIvrCall={clearActiveIvrCall}
        handleAnswerIvrCall={handleAnswerIvrCall}
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
  );
}
