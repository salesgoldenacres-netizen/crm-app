import { Suspense, lazy } from "react";
import { Lead } from "@/shared/types";
import { useDashboardContext } from "@/features/dashboard/context/DashboardContext";
import { useAnalytics } from "@/shared/services/analytics/AnalyticsContext";

// Lazy loaded feature views
const AdminDashboard = lazy(() => import("@/features/admin/pages/AdminDashboard"));
const LeadsTab = lazy(() => import("@/features/leads/components/LeadsTab"));
const ProjectMapsView = lazy(() => import("../components/ProjectMapsView"));
const CallsTab = lazy(() => import("@/features/calls/components/CallsTab"));
const AttendanceTab = lazy(() => import("@/features/attendance/components/AttendanceTab"));
const TrainingHQView = lazy(() => import("../components/TrainingHQView"));
const AgentProfileView = lazy(() => import("../components/AgentProfileView"));
const WidgetGrid = lazy(() => import("../components/WidgetGrid"));

export default function DashboardTabContent() {
  const {
    activeTab,
    user,
    users,
    leads,
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
    addNotification,
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
    clockIn,
    startBreak,
    endBreak,
    clockOut,
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
  } = useDashboardContext();

  const { refreshToken } = useAnalytics();

  const safeFormatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-theme-muted">Loading Section...</div>}>
      {activeTab === "company-dashboard" && <AdminDashboard user={user} />}

      {activeTab === "leads" && (
        <LeadsTab
          user={user}
          leadsSubTab={leadsSubTab}
          setLeadsSubTab={setLeadsSubTab}
          onStartCall={handleStartCall}
          onStartWhatsApp={(lead: Lead) => {
            setSimulatedWaLeadId(lead.id);
            setCallsSubTab("whatsapp");
            setActiveTab("calls");
          }}
          dashboardSlot={
            <WidgetGrid
              user={user}
              users={users}
              leads={leads}
              projects={projects}
              refreshToken={refreshToken}
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
              addNotification={addNotification}
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
              toggleTask={toggleTask}
              deleteTask={deleteTask}
              clearCompletedTasks={clearCompletedTasks}
              leaveRequests={leaveRequests}
              submitLeaveRequest={submitLeaveRequest}
              todayAttendance={todayAttendance}
              allAttendance={allAttendance}
              clockIn={clockIn}
              startBreak={startBreak}
              endBreak={endBreak}
              clockOut={clockOut}
              widgets={widgets}
              setWidgets={setWidgets}
              updateWidgets={updateWidgets}
              widgetStyle={widgetStyle}
              updateWidgetStyle={updateWidgetStyle}
              widgetDensity={widgetDensity}
              updateWidgetDensity={updateWidgetDensity}
              isCustomizerOpen={isCustomizerOpen}
              setIsCustomizerOpen={setIsCustomizerOpen}
              isManagerial={isManagerial}
              safeFormatTime={safeFormatTime}
              setLeadsSubTab={setLeadsSubTab}
              setLeadSearchQuery={() => {}}
              setActiveLead={setActiveLead}
              logAuditEvent={logAuditEvent}
              agentStats={agentStats}
              getWidgetColSpan={(w) => {
                switch (w) {
                  case 2:
                    return "col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2";
                  case 3:
                    return "col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-3";
                  case 4:
                    return "col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4";
                  case 5:
                    return "col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4";
                  default:
                    return "col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1";
                }
              }}
              resetPreferences={resetPreferences}
            />
          }
        />
      )}

      {(activeTab === "projects" || activeTab === "map") && (
        <ProjectMapsView
          activeTab={activeTab}
          projects={projects}
          projectSearchQuery={projectSearchQuery}
          setProjectSearchQuery={setProjectSearchQuery}
          mapSelectedProject={mapSelectedProject}
          setMapSelectedProject={setMapSelectedProject}
        />
      )}

      {activeTab === "calls" && (
        <CallsTab
          user={user}
          callsSubTab={callsSubTab}
          setCallsSubTab={setCallsSubTab}
          simulatedWaLeadId={simulatedWaLeadId}
          setSimulatedWaLeadId={setSimulatedWaLeadId}
          onOpenCallLogModal={() => {}}
        />
      )}

      {activeTab === "attendance" && <AttendanceTab user={user} />}

      {activeTab === "training" && <TrainingHQView trainingData={trainingData} />}

      {activeTab === "profile" && <AgentProfileView user={user} agentStats={agentStats} />}
    </Suspense>
  );
}
