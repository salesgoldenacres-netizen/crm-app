import React, { useRef, useCallback, useState, useEffect } from "react";
import { useAnalytics } from "@/shared/services/analytics/AnalyticsContext";
import { useProjectScope } from "@/shared/services/ProjectScopeContext";
import {
  PhoneCall,
  CheckSquare,
  TrendingUp,
  Award,
  Activity,
  Lightbulb,
  Clock,
  Calendar,
  CalendarDays,
  SlidersHorizontal,
} from "lucide-react";
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
import { AgentStats } from "@/features/dashboard/utils/agentStats";

import CallsTodayWidget from "./widgets/CallsTodayWidget";
import BookingsTodayWidget from "./widgets/BookingsTodayWidget";
import TeamGoalsWidget from "./widgets/TeamGoalsWidget";
import TodayEventsWidget from "./widgets/TodayEventsWidget";
import LeaderboardWidget from "./LeaderboardWidget";
import PipelineFunnelWidget from "./PipelineFunnelWidget";
import CoachingTipWidget from "./widgets/CoachingTipWidget";
import TasksWidget from "./widgets/TasksWidget";
import CallLogsWidget from "./widgets/CallLogsWidget";
import LeaveRequestsWidget from "./widgets/LeaveRequestsWidget";
import WeeklyRosterWidget from "./widgets/WeeklyRosterWidget";
import TelecallerMetricsWidget from "./widgets/TelecallerMetricsWidget";
import WidgetHeader from "@/shared/components/ui/WidgetHeader";

interface ThemeConfig {
  accentText: string;
  accentBg?: string;
  card: string;
  text?: string;
  headerText: string;
}

function widgetHeaderIcon(widgetId: string, activeThemeConfig: ThemeConfig) {
  switch (widgetId) {
    case "callsToday":
      return (
        <PhoneCall className={`w-4 h-4 ${activeThemeConfig.accentText}`} />
      );
    case "bookingsToday":
      return <CheckSquare className="w-4 h-4 text-theme-success" />;
    case "teamGoals":
      return (
        <TrendingUp className={`w-4 h-4 ${activeThemeConfig.accentText}`} />
      );
    case "todayEvents":
      return <CalendarDays className="w-4 h-4 text-theme-accent" />;
    case "leaderboard":
      return <Award className={`w-4 h-4 ${activeThemeConfig.accentText}`} />;
    case "pipeline":
      return <Activity className={`w-4 h-4 ${activeThemeConfig.accentText}`} />;
    case "coachingTip":
      return (
        <Lightbulb className={`w-4 h-4 ${activeThemeConfig.accentText}`} />
      );
    case "tasksWidget":
      return (
        <CheckSquare className={`w-4 h-4 ${activeThemeConfig.accentText}`} />
      );
    case "callLogsWidget":
      return <Clock className={`w-4 h-4 ${activeThemeConfig.accentText}`} />;
    case "leaveRequests":
      return <Calendar className={`w-4 h-4 ${activeThemeConfig.accentText}`} />;
    case "weeklyRoster":
      return <Clock className={`w-4 h-4 ${activeThemeConfig.accentText}`} />;
    case "telecallerMetrics":
      return <Award className={`w-4 h-4 ${activeThemeConfig.accentText}`} />;
    default:
      return null;
  }
}

/** Widget accents come from branding semantic tokens — not personal color presets. */
const SEMANTIC_THEME: ThemeConfig = {
  accentText: "text-theme-accent",
  accentBg: "bg-theme-accent-muted",
  card: "bg-theme-card border-theme-border",
  headerText: "text-theme-text",
  text: "text-theme-text",
};

interface WidgetDef {
  id: string;
  title: string;
  w: number;
  h: number;
  visible: boolean;
}

interface WidgetGridProps {
  user: User;
  users: User[];
  leads: Lead[];
  projects: Record<string, Project>;
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
  widgets: WidgetDef[];
  setWidgets: React.Dispatch<React.SetStateAction<WidgetDef[]>>;
  updateWidgets: (widgets: WidgetDef[]) => Promise<void>;
  widgetStyle: string;
  updateWidgetStyle: (style: string) => void;
  widgetDensity: string;
  updateWidgetDensity: (density: string) => void;
  isCustomizerOpen: boolean;
  setIsCustomizerOpen: (isOpen: boolean) => void;
  isManagerial: (role?: string) => boolean;
  safeFormatTime: (sec: number) => string;
  setLeadsSubTab: (tab: string) => void;
  setLeadSearchQuery: (q: string) => void;
  logAuditEvent: (event: Partial<AuditLog>) => Promise<void>;
  agentStats: AgentStats;
  getWidgetColSpan: (w: number) => string;
  resetPreferences: () => Promise<void>;
  setActiveLead: (lead: Lead | null) => void;
}

export default function WidgetGrid({
  user,
  users,
  leads,
  projects: _projects,
  totalAssigned: _totalAssigned,
  rawCount: _rawCount,
  hotCount: _hotCount,
  overdueCount: _overdueCount,
  followupsToday: _followupsToday,
  newCount,
  notAttemptedCount: _notAttemptedCount,
  bookedCount,
  contactedCount,
  interestedCount,
  notInterestedCount: _notInterestedCount,
  siteVisitCompletedCount: _siteVisitCompletedCount,
  siteVisitConfirmed: _siteVisitConfirmed,
  rnrCount: _rnrCount,
  reEngagedCount: _reEngagedCount,
  addNotification,
  targets,
  goals,
  rosters,
  coachingTip,
  todaysEvents,
  latestAnnouncement,
  markAsRead,
  followUpAlertLeads: _followUpAlertLeads,
  setLeadStatusFilter: _setLeadStatusFilter,
  backendTasks,
  addTask,
  toggleTask,
  deleteTask,
  clearCompletedTasks,
  leaveRequests,
  submitLeaveRequest,
  todayAttendance: _todayAttendance,
  allAttendance: _allAttendance,
  clockIn: _clockIn,
  startBreak: _startBreak,
  endBreak: _endBreak,
  clockOut: _clockOut,
  elapsedWorkSeconds: _elapsedWorkSeconds,
  elapsedBreakSeconds: _elapsedBreakSeconds,
  widgets,
  setWidgets: _setWidgets,
  updateWidgets: _updateWidgets,
  widgetStyle,
  widgetDensity,
  isCustomizerOpen,
  setIsCustomizerOpen,
  isManagerial,
  safeFormatTime,
  setLeadsSubTab: _setLeadsSubTab,
  setLeadSearchQuery: _setLeadSearchQuery,
  setActiveLead,
  logAuditEvent: _logAuditEvent,
  agentStats,
  getWidgetColSpan,
  resetPreferences: _resetPreferences,
}: WidgetGridProps) {
  const activeThemeConfig = SEMANTIC_THEME;
  const analytics = useAnalytics();
  const { activeProjectId } = useProjectScope();
  const [metrics, setMetrics] = useState<any>(null);
  const [teamMetrics, setTeamMetrics] = useState<any>(null);

  useEffect(() => {
    let active = true;
    analytics.getDashboardMetrics(activeProjectId).then((res) => {
      if (active) setMetrics(res);
    }).catch((e) => console.error("Failed to load dashboard metrics", e));

    analytics.getTeamMetrics(activeProjectId).then((res) => {
      if (active) setTeamMetrics(res);
    }).catch((e) => console.error("Failed to load team metrics", e));

    return () => {
      active = false;
    };
  }, [analytics, activeProjectId]);

  const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
  const monthStartIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), 1);

  const getISTDateStr = (dateVal: Date) => {
    const offset = 5.5 * 60 * 60 * 1000; // IST
    return new Date(dateVal.getTime() + offset).toISOString().split("T")[0];
  };
  const todayStr = getISTDateStr(new Date());

  const fallbackCallsLoggedToday = leads.reduce((acc, lead) => {
    const todayLogs = (lead.callLogs || []).filter((log) => {
      if (!log.date) return false;
      return (
        log.agent === user.username &&
        getISTDateStr(new Date(log.date)) === todayStr &&
        !(log.note || "").includes("[WhatsApp")
      );
    });
    return acc + todayLogs.length;
  }, 0);

  const fallbackBookingsToday = leads.filter(
    (l) => (l.status === "booked" || l.status === "reserved") && l.followUpDate === todayStr
  ).length;

  const fallbackTeamCalls = leads.reduce((acc, lead) => {
    const monthLogs = (lead.callLogs || []).filter((log) => {
      if (!log.date) return false;
      const logDateIST = new Date(new Date(log.date).getTime() + 5.5 * 60 * 60 * 1000);
      return logDateIST >= monthStartIST && !(log.note || "").includes("[WhatsApp");
    });
    return acc + monthLogs.length;
  }, 0);

  const fallbackTeamBookings = leads.reduce((acc, lead) => {
    const monthLogs = (lead.callLogs || []).filter((log) => {
      if (!log.date) return false;
      const logDateIST = new Date(new Date(log.date).getTime() + 5.5 * 60 * 60 * 1000);
      return logDateIST >= monthStartIST && (log.status === "booked" || log.status === "reserved");
    });
    return acc + monthLogs.length;
  }, 0);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLongPressPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Ignore interactive controls
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest("select") ||
        target.closest("a") ||
        target.closest("textarea")
      ) {
        return;
      }

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }

      longPressTimerRef.current = setTimeout(() => {
        if (setIsCustomizerOpen) {
          setIsCustomizerOpen(true);
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(50); // Haptic feedback
          }
        }
      }, 700);
    },
    [setIsCustomizerOpen]
  );

  const handleLongPressPointerUpOrCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-theme border border-theme-border bg-theme-card px-3 py-2.5 shadow-elevation-sm">
        <div className="min-w-0">
          <h2 className="type-section-title text-sm tracking-tight">
            Operations Overview
          </h2>
          <p className="type-secondary text-[11px] font-medium">
            Live team metrics, targets, and activity at a glance
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCustomizerOpen(true)}
          className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-theme border border-theme-border bg-theme-surface text-theme-text hover:bg-theme-card text-[11px] font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-theme-accent" />
          Customize
        </button>
      </div>

      {/* Global Announcement Banner */}
      {latestAnnouncement &&
        (() => {
          let bannerBg =
            "bg-theme-accent-muted border-theme-accent/30 text-theme-accent";
          let btnBg = "bg-theme-accent text-theme-accent-fg";

          if (latestAnnouncement.type === "success") {
            bannerBg =
              "bg-theme-success/10 border-theme-success/30 text-theme-success";
            btnBg = "bg-theme-success text-white";
          } else if (latestAnnouncement.type === "warning") {
            bannerBg =
              "bg-theme-warning/10 border-theme-warning/30 text-theme-warning";
            btnBg = "bg-theme-warning text-white";
          } else if (latestAnnouncement.type === "important") {
            bannerBg =
              "bg-theme-danger/10 border-theme-danger/30 text-theme-danger";
            btnBg = "bg-theme-danger text-white";
          }

          return (
            <div
              className={`p-3 rounded-theme border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${bannerBg}`}
            >
              <div className="min-w-0">
                <h4 className="text-[9px] font-bold uppercase tracking-wider text-theme-muted">
                  Latest announcement
                </h4>
                <p className="text-[11px] font-semibold mt-0.5 text-theme-text">
                  {latestAnnouncement.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => markAsRead(latestAnnouncement.id)}
                className={`px-2.5 py-1.5 rounded-theme text-[10px] font-bold transition-colors cursor-pointer shrink-0 border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${btnBg}`}
              >
                Dismiss
              </button>
            </div>
          );
        })()}

      {/* Renders interactive, user-ordered card widget layout grid */}
      <div
        id="dashboard-widget-grid"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
      >
        {widgets
          .filter((w) => w.visible !== false)
          .map((widget) => {
            const colSpanClass = getWidgetColSpan(widget.w);
            const isTodayEvents = widget.id === "todayEvents";

            let cardBgClass = activeThemeConfig.card;
            if (widgetStyle === "borderless") {
              cardBgClass =
                "border-transparent shadow-none bg-theme-surface";
            } else if (widgetStyle === "raised") {
              cardBgClass =
                "shadow-elevation-md border border-theme-border bg-theme-card";
            } else if (widgetStyle === "frosted") {
              cardBgClass =
                "backdrop-blur-md bg-theme-card/40 border-theme-border/30 shadow-elevation-sm";
            }

            if (isTodayEvents && widgetStyle === "standard") {
              cardBgClass =
                "bg-theme-accent-muted/40 border-theme-accent/20";
            }

            return (
              <div
                key={widget.id}
                id={`widget-${widget.id}`}
                className={`widget-shell rounded-theme border shadow-elevation-sm flex flex-col relative overflow-hidden group select-none ${cardBgClass} ${colSpanClass} ${
                  isCustomizerOpen
                    ? "border-dashed border-theme-accent shadow-[0_0_12px_color-mix(in_srgb,var(--theme-accent)_20%,transparent)] ring-1 ring-theme-accent/20"
                    : ""
                }`}
                style={{ height: `${widget.h}px` }}
              >
                <WidgetHeader
                  density={widgetDensity === "compact" ? "compact" : "comfortable"}
                  icon={widgetHeaderIcon(widget.id, activeThemeConfig)}
                  title={widget.title}
                  titleClassName={
                    isTodayEvents
                      ? "text-theme-accent"
                      : activeThemeConfig.headerText
                  }
                  className="hover:bg-theme-surface/50"
                  onPointerDown={handleLongPressPointerDown}
                  onPointerUp={handleLongPressPointerUpOrCancel}
                  onPointerCancel={handleLongPressPointerUpOrCancel}
                />

                {/* Widget Body */}
                <div
                  className={`${
                    widgetDensity === "compact" ? "p-3.5" : "p-5"
                  } flex-1 overflow-y-auto flex flex-col ${
                    ["callsToday", "bookingsToday", "teamGoals", "coachingTip"].includes(
                      widget.id
                    )
                      ? "items-center justify-center"
                      : ""
                  }`}
                >
                  {(() => {
                    switch (widget.id) {
                      case "callsToday":
                        return (
                          <CallsTodayWidget
                            callsLoggedToday={metrics ? metrics.callsLoggedToday : fallbackCallsLoggedToday}
                            callTarget={metrics ? metrics.callTarget : (targets[user.id]?.targetCount || 50)}
                            activeThemeConfig={activeThemeConfig}
                          />
                        );

                      case "bookingsToday":
                        return (
                          <BookingsTodayWidget
                            bookingsToday={metrics ? metrics.bookingsToday : fallbackBookingsToday}
                            bookingTarget={metrics ? metrics.bookingTarget : (targets[user.id]?.bookingTargetCount || 5)}
                          />
                        );

                      case "teamGoals":
                        return (
                          <TeamGoalsWidget
                            teamCallsThisMonth={teamMetrics?.teamGoals?.[0]?.achieved ?? fallbackTeamCalls}
                            callGoal={teamMetrics?.teamGoals?.[0]?.target ?? (goals.monthlyCallGoal || 1000)}
                            teamBookingsThisMonth={teamMetrics?.teamGoals?.[1]?.achieved ?? fallbackTeamBookings}
                            bookingGoal={teamMetrics?.teamGoals?.[1]?.target ?? (goals.monthlyBookingGoal || 20)}
                            customGoalText={goals.customGoalText}
                            activeThemeConfig={activeThemeConfig}
                          />
                        );

                      case "todayEvents":
                        return <TodayEventsWidget todaysEvents={todaysEvents.map((event) => ({ ...event, name: event.name ?? event.title ?? "Event" }))} />;

                      case "leaderboard":
                        return (
                          <LeaderboardWidget
                            leads={leads}
                            activeThemeConfig={{ accentText: activeThemeConfig.accentText }}
                          />
                        );

                      case "pipeline":
                        return (
                          <PipelineFunnelWidget
                            newCount={newCount}
                            contactedCount={contactedCount}
                            interestedCount={interestedCount}
                            bookedCount={bookedCount}
                          />
                        );

                      case "coachingTip":
                        return (
                          <CoachingTipWidget
                            coachingTip={{ tip: coachingTip }}
                            activeThemeConfig={activeThemeConfig}
                          />
                        );

                      case "tasksWidget":
                        return (
                          <TasksWidget
                            backendTasks={backendTasks}
                            addTask={addTask}
                            toggleTask={toggleTask}
                            deleteTask={deleteTask}
                            clearCompletedTasks={clearCompletedTasks}
                          />
                        );

                      case "callLogsWidget":
                        return (
                          <CallLogsWidget
                            leads={leads}
                            user={user}
                            setActiveLead={(id: string) => {
                              const lead = leads.find((l) => l.id === id) ?? null;
                              setActiveLead(lead);
                            }}
                            safeFormatTime={(dateVal) => typeof dateVal === "number" ? safeFormatTime(dateVal) : ""}
                          />
                        );

                      case "leaveRequests":
                        return (
                          <LeaveRequestsWidget
                            user={user}
                            users={users}
                            isManagerial={isManagerial}
                            submitLeaveRequest={submitLeaveRequest}
                            addNotification={(notif) => addNotification("Leave Request", notif.message, notif.type)}
                            leaveRequests={leaveRequests}
                          />
                        );

                      case "weeklyRoster":
                        return (
                          <WeeklyRosterWidget
                            user={user}
                            rosters={rosters}
                            activeThemeConfig={activeThemeConfig}
                          />
                        );

                      case "telecallerMetrics":
                        return (
                          <TelecallerMetricsWidget
                            agentStats={agentStats}
                            activeThemeConfig={activeThemeConfig}
                          />
                        );

                      default:
                        return null;
                    }
                  })()}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
