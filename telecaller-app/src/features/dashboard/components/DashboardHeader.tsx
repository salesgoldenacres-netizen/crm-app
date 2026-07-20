import { useRef, useEffect, useState } from "react";
import { Clock, ChevronRight, Bell, Menu, LayoutDashboard } from "lucide-react";
import { useToast } from "@/shared/components/Toast";
import ThemeToggle from "@/shared/components/ThemeToggle";
import Dialog from "@/shared/components/ui/Dialog";
import EmptyState from "@/shared/components/ui/EmptyState";
import { safeFormatTime, formatDuration } from "@/shared/utils/dateUtils";
import { User, AttendanceRecord } from "@/shared/types";
import { NAV_LABELS } from "@/shared/constants/navTaxonomy";

const STATUS_OPTIONS: { value: string; label: string; dot: string }[] = [
  { value: "available", label: "Available", dot: "bg-theme-success" },
  { value: "working_from_home", label: "WFH", dot: "bg-theme-accent" },
  { value: "on-call", label: "On Call", dot: "bg-theme-danger" },
  { value: "away", label: "Away", dot: "bg-theme-warning" },
  { value: "break", label: "On Break", dot: "bg-theme-warning" },
  { value: "lunch", label: "Lunch", dot: "bg-theme-warning" },
  { value: "out_sick", label: "Out Sick", dot: "bg-theme-danger" },
  { value: "out_of_office", label: "Out Office", dot: "bg-theme-muted" },
  { value: "family_time", label: "Family", dot: "bg-theme-accent" },
  { value: "offline", label: "Offline", dot: "bg-theme-muted" },
];

function statusMeta(status: string) {
  return (
    STATUS_OPTIONS.find((s) => s.value === status) || {
      value: status,
      label: "Offline",
      dot: "bg-theme-muted",
    }
  );
}

interface DashboardHeaderProps {
  user: User;
  isManagerial: (role: string) => boolean;
  todayAttendance: AttendanceRecord | null | undefined;
  myAgentStatus: string;
  unreadNotificationsCount: number;
  notifications: any[];
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  elapsedWorkSeconds: number;
  elapsedBreakSeconds: number;
  clockIn: (username: string) => Promise<void>;
  clockOut: (username: string) => Promise<void>;
  startBreak: (username: string, type: string) => Promise<void>;
  endBreak: (username: string) => Promise<void>;
  updateAgentStatus: (userId: string, status: string, username: string) => Promise<void>;
  agentStats: any;
  isNotificationDropdownOpen: boolean;
  setIsNotificationDropdownOpen: (open: boolean) => void;
  isProfileDropdownOpen: boolean;
  setIsProfileDropdownOpen: (open: boolean) => void;
  setIsMobileDrawerOpen: (open: boolean) => void;
}

export default function DashboardHeader({
  user,
  isManagerial,
  todayAttendance,
  myAgentStatus,
  unreadNotificationsCount,
  notifications,
  markAllAsRead,
  markAsRead,
  elapsedWorkSeconds,
  elapsedBreakSeconds,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  updateAgentStatus,
  agentStats,
  isNotificationDropdownOpen,
  setIsNotificationDropdownOpen,
  isProfileDropdownOpen,
  setIsProfileDropdownOpen,
  setIsMobileDrawerOpen,
}: DashboardHeaderProps) {
  const { toast } = useToast();
  const profileDropdownRef = useRef<HTMLDivElement | null>(null);
  const notificationDropdownRef = useRef<HTMLDivElement | null>(null);
  const [clockOutConfirmOpen, setClockOutConfirmOpen] = useState(false);

  useEffect(() => {
    function handlePointerOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(target)
      ) {
        setIsProfileDropdownOpen(false);
      }
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(target)
      ) {
        setIsNotificationDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (isProfileDropdownOpen) {
        event.preventDefault();
        setIsProfileDropdownOpen(false);
      }
      if (isNotificationDropdownOpen) {
        event.preventDefault();
        setIsNotificationDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isProfileDropdownOpen,
    isNotificationDropdownOpen,
    setIsProfileDropdownOpen,
    setIsNotificationDropdownOpen,
  ]);

  return (
    <header className="border-b border-theme-border bg-theme-card transition-colors duration-300 header-brand-strip shrink-0">
      <div className="w-full max-w-full mx-auto px-3 sm:px-6 lg:px-12 min-h-14 h-14 flex items-center justify-between gap-2 min-w-0">
        {/* Left: Hamburger menu + Title */}
        <div className="flex items-center space-x-2 min-w-0">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="md:hidden inline-flex items-center justify-center min-h-11 min-w-11 -ml-2 rounded-theme text-theme-muted hover:text-theme-text hover:bg-theme-surface transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
            title="Open Menu"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-theme-accent flex-shrink-0" aria-hidden />
          <h1 className="type-page-title text-sm sm:text-lg tracking-tight text-theme-text truncate">
            {NAV_LABELS.dashboard}
          </h1>
        </div>

        {/* Right: Streak, Clock In/Status Switcher, Notification Bell */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
          {/* Streak Badge — quiet chrome, no decorative emoji */}
          {!isManagerial(user.role) && (
            <div
              className="flex items-center space-x-1.5 bg-theme-warning/10 text-theme-warning px-2.5 py-1 rounded-theme text-xs font-bold border border-theme-warning/25"
              title={`${agentStats.streak} day attendance streak`}
            >
              <span className="type-kpi tabular-nums text-theme-warning">
                {agentStats.streak}
              </span>
              <span className="hidden sm:inline type-label text-theme-muted font-semibold normal-case tracking-normal">
                Streak
              </span>
            </div>
          )}

          {/* Clock In or Status Switcher */}
          {!isManagerial(user.role) ? (
            !todayAttendance ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await clockIn(user.username);
                    toast("Successfully Clocked In!", "success");
                  } catch {
                    toast("Failed to Clock In. Try again.", "error");
                  }
                }}
                className="bg-theme-accent hover:opacity-90 text-theme-accent-fg font-bold min-h-11 px-3 sm:px-4 py-2 rounded-theme text-xs transition-all inline-flex items-center space-x-1.5 shadow-elevation-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              >
                <Clock className="w-3.5 h-3.5" aria-hidden />
                <span>Clock In</span>
              </button>
            ) : (
              /* Status Switcher Dropdown Button */
              <div className="relative" ref={profileDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="inline-flex items-center space-x-1.5 bg-theme-surface hover:opacity-90 text-theme-text min-h-11 px-2.5 sm:px-3 py-2 rounded-theme text-xs font-bold transition-all border border-theme-border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                  aria-expanded={isProfileDropdownOpen}
                  aria-haspopup="listbox"
                >
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${statusMeta(myAgentStatus).dot}`}
                    aria-hidden
                  />
                  <span>{statusMeta(myAgentStatus).label}</span>
                  <ChevronRight className="w-3 h-3 rotate-90 text-theme-muted" />
                </button>

                {isProfileDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-[min(16rem,calc(100vw-1.5rem))] bg-theme-card rounded-theme shadow-elevation-md border border-theme-border z-50 p-4 transition-all duration-200 text-xs font-semibold text-theme-text"
                    role="listbox"
                    aria-label="Working status"
                  >
                    <h5 className="type-label text-[10px] uppercase text-theme-muted mb-2 tracking-wide">
                      Change Working Status
                    </h5>
                    <div className="grid grid-cols-2 gap-1.5">
                      {STATUS_OPTIONS.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          role="option"
                          aria-selected={myAgentStatus === item.value}
                          disabled={
                            (!todayAttendance || !!todayAttendance.checkOut) &&
                            item.value !== "offline"
                          }
                          onClick={async () => {
                            setIsProfileDropdownOpen(false);
                            const status = item.value;
                            if (status === "break") {
                              await startBreak(user.username, "break");
                            } else if (status === "lunch") {
                              await startBreak(user.username, "lunch");
                            } else if (status === "offline") {
                              setClockOutConfirmOpen(true);
                            } else {
                              const hasActiveBreak = (
                                todayAttendance?.breaks || []
                              ).some((b) => b.end === null);
                              if (hasActiveBreak) {
                                await endBreak(user.username);
                              }
                              await updateAgentStatus(
                                user.id,
                                status,
                                user.username
                              );
                            }
                          }}
                          className={`min-h-11 px-2 py-2 rounded-theme border text-left text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer truncate inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                            myAgentStatus === item.value
                              ? "bg-theme-accent border-theme-accent text-theme-accent-fg shadow-sm"
                              : "bg-theme-surface hover:opacity-90 border-theme-border text-theme-text"
                          } ${
                            (!todayAttendance || !!todayAttendance.checkOut) &&
                            item.value !== "offline"
                              ? "opacity-40 cursor-not-allowed border-transparent"
                              : ""
                          }`}
                        >
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`}
                            aria-hidden
                          />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            isManagerial(user.role) && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-theme bg-theme-accent-muted text-theme-accent border border-theme-border">
                Manager Desk
              </span>
            )
          )}

          <ThemeToggle compact className="hidden sm:inline-flex" />

          {/* Notification Bell Dropdown */}
          <div className="relative" ref={notificationDropdownRef}>
            <button
              type="button"
              onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
              className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-theme text-theme-muted hover:bg-theme-surface transition-colors cursor-pointer relative border border-transparent hover:border-theme-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              title="Notifications"
              aria-label={
                unreadNotificationsCount > 0
                  ? `Notifications, ${unreadNotificationsCount} unread`
                  : "Notifications"
              }
              aria-expanded={isNotificationDropdownOpen}
              aria-haspopup="true"
              aria-controls="dashboard-notifications-panel"
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
              {unreadNotificationsCount > 0 && (
                <span
                  className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-theme-danger rounded-theme"
                  aria-hidden="true"
                >
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {isNotificationDropdownOpen && (
              <div
                id="dashboard-notifications-panel"
                role="region"
                aria-label="Notifications"
                className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] bg-theme-card rounded-theme shadow-elevation-md py-2 z-50 border border-theme-border text-xs text-theme-text"
              >
                <div className="px-4 py-2 border-b border-theme-border flex justify-between items-center bg-theme-surface gap-2">
                  <span className="type-card-title text-sm">Notifications</span>
                  {unreadNotificationsCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-[10px] text-theme-accent hover:underline font-semibold min-h-11 px-2 rounded-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-theme-border" role="list">
                  {notifications.length === 0 ? (
                    <div className="p-3" role="status">
                      <EmptyState
                        variant="compact"
                        preset="activity"
                        title="You're all caught up"
                        description="New alerts will show up here."
                        hideIcon
                        className="border-0 bg-transparent shadow-none"
                      />
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        role="listitem"
                        className={`p-3 transition-colors flex flex-col space-y-1 ${
                          !n.read ? "bg-theme-accent-muted/30" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-medium pr-2">
                            {!n.read ? (
                              <span className="sr-only">Unread. </span>
                            ) : null}
                            {n.message}
                          </p>
                          {!n.read && (
                            <button
                              type="button"
                              onClick={() => markAsRead(n.id)}
                              className="text-[10px] text-theme-accent hover:underline shrink-0 min-h-11 px-2 rounded-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                        <span className="text-[9px] text-theme-muted">
                          {safeFormatTime(n.createdAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Relocated Page-level Attendance status log */}
      {!isManagerial(user.role) && todayAttendance && (
        <div className="hidden md:flex bg-theme-surface/50 border-t border-theme-border py-1.5 px-4 sm:px-6 lg:px-12 flex-wrap justify-between items-center text-xs font-semibold text-theme-muted gap-3 transition-colors">
          <div className="flex items-center space-x-4 flex-wrap gap-y-1">
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3 h-3 text-theme-accent" />
              <span className="type-label text-[10px] uppercase text-theme-muted">
                Shift:
              </span>
              <span className="type-kpi text-[11px] text-theme-text">
                {formatDuration(elapsedWorkSeconds * 1000)}
              </span>
            </div>
            <div className="h-3 w-[1px] bg-theme-border hidden sm:block" />
            <div className="flex items-center space-x-1.5">
              <span className="type-label text-[10px] uppercase text-theme-muted">
                Break:
              </span>
              <span className="type-kpi text-[11px] text-theme-text">
                {formatDuration(elapsedBreakSeconds * 1000)}
              </span>
              {(todayAttendance.breaks || []).some((b) => b.end === null) && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-theme text-[9px] font-bold bg-theme-warning/20 text-theme-warning border border-theme-warning/40">
                  ON BREAK
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  todayAttendance.checkOut ? "bg-theme-muted" : "bg-theme-success"
                }`}
                aria-hidden
              />
              <span className="text-[11px] text-theme-text">
                {todayAttendance.checkOut
                  ? `Clocked Out at ${safeFormatTime(todayAttendance.checkOut, { hour: "2-digit", minute: "2-digit" })}`
                  : `In since ${safeFormatTime(todayAttendance.checkIn, { hour: "2-digit", minute: "2-digit" })}`}
              </span>
            </div>
          </div>
        </div>
      )}

      <Dialog
        isOpen={clockOutConfirmOpen}
        onClose={() => setClockOutConfirmOpen(false)}
        title="Clock out?"
        description="Are you sure you want to Clock Out for the day?"
        confirmLabel="Clock Out"
        confirmVariant="danger"
        onConfirm={async () => {
          await clockOut(user.username);
          setClockOutConfirmOpen(false);
        }}
      />
    </header>
  );
}
