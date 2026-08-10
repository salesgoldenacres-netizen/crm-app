import React, { createContext, useContext } from "react";
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

/**
 * DashboardContext (F-1)
 *
 * Aggregates the shared Dashboard state/actions that used to be drilled through
 * `Dashboard.tsx` → `DashboardTabContent` as ~60 individual props. Children now
 * subscribe via `useDashboardContext()` instead, which removes the God-component
 * prop wall on the Dashboard page while keeping behaviour identical.
 */
export interface DashboardContextValue {
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
  addNotification: (
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error"
  ) => Promise<void>;
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
  toggleTask: (id: string, done: boolean) => Promise<void>;
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
  setActiveLead: (lead: Lead | null) => void;

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

  // Analytics Refresh & Mutation Composition Boundary
  refreshDashboard: () => void;
  logCall: (
    leadId: string,
    payload: import("@/features/leads/hooks/useLeadsStore").LogCallPayload
  ) => Promise<void>;
  updateLead: (
    id: string,
    updatedFields: Partial<Lead>,
    options?: { suppressTimeline?: boolean }
  ) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export const DashboardProvider = DashboardContext.Provider;

/** Access the aggregated Dashboard state. Must be used within a DashboardProvider. */
export function useDashboardContext(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboardContext must be used within a DashboardProvider");
  }
  return ctx;
}

export default DashboardContext;
