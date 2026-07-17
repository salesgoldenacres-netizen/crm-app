import React, { Suspense, lazy } from "react";
import {
  User,
  Lead,
  Project,
  AuditLog,
  AttendanceRecord,
  LeaveRequest,
  NotificationItem,
  CallTarget,
  Goals,
  Roster,
  EventLog,
  TaskItem,
} from "@/shared/types";
import { Widget } from "@/features/dashboard/hooks/useDashboardWidgets";
import { AgentStats } from "@/features/dashboard/utils/agentStats";

// Lazy loaded feature views
const AdminDashboard = lazy(() => import("@/features/admin/pages/AdminDashboard"));
const LeadsTab = lazy(() => import("@/features/leads/components/LeadsTab"));
const ProjectMapsView = lazy(() => import("../components/ProjectMapsView"));
const CallsTab = lazy(() => import("@/features/calls/components/CallsTab"));
const AttendanceTab = lazy(() => import("@/features/attendance/components/AttendanceTab"));
const TrainingHQView = lazy(() => import("../components/TrainingHQView"));
const AgentProfileView = lazy(() => import("../components/AgentProfileView"));
const WidgetGrid = lazy(() => import("../components/WidgetGrid"));

interface DashboardTabContentProps {
  activeTab: string;
  user: User;
  users: User[];
  leads: Lead[];
  myLeads: Lead[];
  projects: Record<string, Project>;
  isManagerial: (role?: string) => boolean;

  // Counts & Stats
  totalAssigned: number;
  rawCount: number;
  hotCount: number;
  overdueCount: number;
  followupsToday: number;
  newCount: number;
  notAttemptedCount: number;
  bookedCount: number;
  contactedCount: number;
  interestedCount: number;
  notInterestedCount: number;
  siteVisitCompletedCount: number;
  siteVisitConfirmed: number;
  rnrCount: number;
  reEngagedCount: number;

  // Dashboard Preferences & State
  addNotification: (title: string, message: string, type?: "info" | "success" | "warning" | "error") => Promise<void>;
  targets: Record<string, CallTarget>;
  goals: Goals;
  rosters: Record<string, Roster>;
  coachingTip: string;
  todaysEvents: EventLog[];
  latestAnnouncement: NotificationItem | undefined;
  markAsRead: (id: string) => Promise<void>;
  followUpAlertLeads: Lead[];
  setLeadStatusFilter: (status: string) => void;
  backendTasks: TaskItem[];
  addTask: (text: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  clearCompletedTasks: () => Promise<void>;
  leaveRequests: LeaveRequest[];
  submitLeaveRequest: (req: Omit<LeaveRequest, "id">) => Promise<void>;
  todayAttendance: AttendanceRecord | null;
  allAttendance: AttendanceRecord[];
  clockIn: () => Promise<void>;
  startBreak: () => Promise<void>;
  endBreak: () => Promise<void>;
  clockOut: () => Promise<void>;
  elapsedWorkSeconds: number;
  elapsedBreakSeconds: number;
  widgets: Widget[];
  setWidgets: React.Dispatch<React.SetStateAction<Widget[]>>;
  updateWidgets: (widgets: Widget[]) => Promise<void>;
  widgetStyle: string;
  updateWidgetStyle: (style: string) => Promise<void>;
  widgetDensity: string;
  updateWidgetDensity: (density: string) => Promise<void>;
  isCustomizerOpen: boolean;
  setIsCustomizerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  logAuditEvent: (event: Partial<AuditLog>) => Promise<void>;
  agentStats: AgentStats;
  resetPreferences: () => Promise<void>;

  // Tabs state & Callbacks
  leadsSubTab: string;
  setLeadsSubTab: (tab: string) => void;
  handleStartCall: (lead: Lead) => void;
  setSimulatedWaLeadId: (id: string) => void;
  setCallsSubTab: (tab: string) => void;
  setActiveTab: (tab: string) => void;

  // Projects state
  projectSearchQuery: string;
  setProjectSearchQuery: (q: string) => void;
  mapSelectedProject: string;
  setMapSelectedProject: (p: string) => void;

  // Calls state
  callsSubTab: string;
  simulatedWaLeadId: string;
  trainingData: any;
}

export default function DashboardTabContent({
  activeTab,
  user,
  users,
  leads,
  myLeads: _myLeads,
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
  elapsedWorkSeconds,
  elapsedBreakSeconds,
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
}: DashboardTabContentProps) {
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
              isManagerial={isManagerial}
              safeFormatTime={safeFormatTime}
              setLeadsSubTab={setLeadsSubTab}
              setLeadSearchQuery={() => {}}
              setActiveLead={() => {}}
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
