import { useState, useEffect } from "react";
import { Calendar, Clock, Coffee, Timer } from "lucide-react";
import { useAttendanceStore } from "../hooks/useAttendanceStore";
import { safeFormatTime, parseSafeDate } from "@/shared/utils/dateUtils";
import { AttendanceRecord, User } from "@/shared/types";
import Dialog from "@/shared/components/ui/Dialog";
import Card, { CardBody, CardHeader } from "@/shared/components/ui/Card";
import Button from "@/shared/components/ui/Button";
import Badge from "@/shared/components/ui/Badge";
import EmptyState from "@/shared/components/ui/EmptyState";
import DataTable, { ColumnDef } from "@/shared/components/DataTable";
import { NAV_LABELS } from "@/shared/constants/navTaxonomy";

type FeedbackDialog =
  | { mode: "alert"; title: string; description: string }
  | {
      mode: "confirm";
      title: string;
      description: string;
      confirmLabel?: string;
      confirmVariant?: "primary" | "danger" | "success";
      onConfirm: () => void | Promise<void>;
    };

interface AttendanceTabProps {
  user: User;
}

function formatDuration(ms: number) {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((totalSecs % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSecs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function statusBadge(status: string) {
  if (status === "present") {
    return <Badge variant="success">{status}</Badge>;
  }
  if (status === "late") {
    return <Badge variant="warning">{status}</Badge>;
  }
  return <Badge variant="default">{status}</Badge>;
}

function breakDurationMs(rec: AttendanceRecord): number {
  let breakMs = 0;
  (rec.breaks || []).forEach((b) => {
    if (b.start && b.end) {
      breakMs +=
        (parseSafeDate(b.end)?.getTime() || 0) -
        (parseSafeDate(b.start)?.getTime() || 0);
    }
  });
  return breakMs;
}

const HISTORY_COLUMNS: ColumnDef<AttendanceRecord>[] = [
  {
    key: "date",
    header: "Date",
    sortable: true,
    render: (rec) => (
      <span className="font-semibold text-theme-text">{rec.date}</span>
    ),
  },
  {
    key: "checkIn",
    header: "Clock In",
    render: (rec) =>
      rec.checkIn
        ? safeFormatTime(rec.checkIn, {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
  },
  {
    key: "checkOut",
    header: "Clock Out",
    render: (rec) =>
      rec.checkOut
        ? safeFormatTime(rec.checkOut, {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
  },
  {
    key: "breakDuration",
    header: "Break Duration",
    render: (rec) => formatDuration(breakDurationMs(rec)),
  },
  {
    key: "totalWorkHours",
    header: "Work Hours",
    render: (rec) => (
      <span className="font-semibold text-theme-text">
        {rec.totalWorkHours
          ? `${rec.totalWorkHours} hrs`
          : rec.checkOut
            ? "—"
            : "In Progress"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (rec) => statusBadge(rec.status),
  },
];

export default function AttendanceTab({ user }: AttendanceTabProps) {
  const {
    todayAttendance,
    allAttendance,
    clockIn,
    startBreak,
    endBreak,
    clockOut,
  } = useAttendanceStore(user?.id);

  const [elapsedWorkSeconds, setElapsedWorkSeconds] = useState(0);
  const [elapsedBreakSeconds, setElapsedBreakSeconds] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackDialog | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const updateTimers = () => {
      if (!todayAttendance) {
        setElapsedWorkSeconds(0);
        setElapsedBreakSeconds(0);
        return;
      }

      const now = new Date();
      const checkInTime = new Date(todayAttendance.checkIn);
      const checkOutTime = todayAttendance.checkOut
        ? new Date(todayAttendance.checkOut)
        : now;

      // Calculate total break milliseconds
      let breakMs = 0;
      (todayAttendance.breaks || []).forEach((b) => {
        if (b.start && b.end) {
          breakMs += new Date(b.end).getTime() - new Date(b.start).getTime();
        } else if (b.start && !b.end) {
          breakMs += now.getTime() - new Date(b.start).getTime();
        }
      });

      // Calculate work milliseconds
      let workMs = checkOutTime.getTime() - checkInTime.getTime() - breakMs;
      if (workMs < 0) workMs = 0;

      setElapsedBreakSeconds(Math.floor(breakMs / 1000));
      setElapsedWorkSeconds(Math.floor(workMs / 1000));
    };

    updateTimers();
    interval = setInterval(updateTimers, 1000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [todayAttendance]);

  const handleBreakToggle = async () => {
    if (!todayAttendance) {
      setFeedback({
        mode: "alert",
        title: "Clock in required",
        description: "Please clock in first before starting a break.",
      });
      return;
    }
    const hasActiveBreak = (todayAttendance.breaks || []).some(
      (b) => b.end === null
    );
    if (hasActiveBreak) {
      await endBreak(user.username);
    } else {
      await startBreak(user.username, "break");
    }
  };

  const handleCheckInToggle = async () => {
    if (todayAttendance) {
      setFeedback({
        mode: "confirm",
        title: "Clock out?",
        description: "Are you sure you want to Clock Out for the day?",
        confirmLabel: "Clock Out",
        confirmVariant: "danger",
        onConfirm: async () => {
          await clockOut(user.username);
          setFeedback(null);
        },
      });
    } else {
      await clockIn(user.username, "morning_shift");
    }
  };

  const userAttendanceRecords = allAttendance.filter(
    (rec) => rec.userId === user.id
  );

  const hasActiveBreak = (todayAttendance?.breaks || []).some(
    (b) => b.end === null
  );
  const isClockedOut = !!(todayAttendance && todayAttendance.checkOut);
  const canToggleBreak = !!todayAttendance && !isClockedOut;

  const todayStatusBadge = !todayAttendance ? (
    <Badge variant="default">Offline</Badge>
  ) : isClockedOut ? (
    <Badge variant="success">Completed</Badge>
  ) : hasActiveBreak ? (
    <Badge variant="warning">On Break</Badge>
  ) : (
    <Badge variant="success">Clocked In</Badge>
  );

  return (
    <div className="w-full max-w-full min-w-0 mx-auto px-3 sm:px-6 lg:px-12 py-5 sm:py-7 space-y-5 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <h2 className="type-page-title text-xl sm:text-2xl text-theme-text">
            {NAV_LABELS.attendance}
          </h2>
          <p className="type-secondary text-sm text-theme-muted mt-1">
            Track your daily shift clock-ins, breaks, and net work hours.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-theme border border-theme-border bg-theme-card px-3 min-h-11 py-2 text-xs font-semibold text-theme-text shrink-0 max-w-full shadow-elevation-sm">
          <Calendar className="w-3.5 h-3.5 text-theme-accent shrink-0" aria-hidden />
          <span className="text-theme-muted font-medium">Current Month</span>
          <span className="truncate">
            {new Date().toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Clock Controls Card */}
      <Card>
        <CardBody className="flex flex-col md:flex-row justify-between items-center gap-5 md:gap-6 py-5">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="type-card-title text-base text-theme-text">
              Daily Shift Management
            </h3>
            <p className="type-secondary text-xs text-theme-muted">
              Log your morning shift and breaks in real-time.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center md:justify-end">
            <Button
              onClick={handleCheckInToggle}
              variant={
                todayAttendance
                  ? isClockedOut
                    ? "secondary"
                    : "danger"
                  : "success"
              }
              size="md"
              disabled={isClockedOut}
              className="gap-1.5"
            >
              <Clock className="w-4 h-4" aria-hidden />
              {todayAttendance
                ? isClockedOut
                  ? "Clocked Out"
                  : "Clock Out"
                : "Clock In"}
            </Button>
            <Button
              onClick={handleBreakToggle}
              disabled={!canToggleBreak}
              variant={hasActiveBreak ? "primary" : "outline"}
              size="md"
              className="gap-1.5"
            >
              <Coffee className="w-4 h-4" aria-hidden />
              {hasActiveBreak ? "End Break" : "Start Break"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Metrics summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardBody className="p-4 space-y-2">
            <span className="type-label text-[10px] text-theme-muted uppercase tracking-wider block">
              Today&apos;s Status
            </span>
            <div className="pt-0.5">{todayStatusBadge}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4 space-y-1">
            <span className="type-label text-[10px] text-theme-muted uppercase tracking-wider block">
              Net Work Time
            </span>
            <span className="type-kpi text-2xl text-theme-text mt-1 block tabular-nums">
              {todayAttendance
                ? formatDuration(elapsedWorkSeconds * 1000)
                : "00:00:00"}
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4 space-y-1">
            <span className="type-label text-[10px] text-theme-muted uppercase tracking-wider flex items-center gap-1.5">
              <Timer className="w-3 h-3" aria-hidden />
              Break Duration
            </span>
            <span className="type-kpi text-2xl text-theme-text mt-1 block tabular-nums">
              {todayAttendance
                ? formatDuration(elapsedBreakSeconds * 1000)
                : "00:00:00"}
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4 space-y-1">
            <span className="type-label text-[10px] text-theme-muted uppercase tracking-wider block">
              Shift Timings
            </span>
            <span className="text-sm font-semibold text-theme-text mt-1 block">
              Morning Shift
            </span>
            <span className="type-secondary text-xs text-theme-muted">
              09:00 AM - 06:00 PM
            </span>
          </CardBody>
        </Card>
      </div>

      {/* History List */}
      <Card className="overflow-hidden">
        <CardHeader>
          <h3 className="type-card-title text-sm text-theme-text">
            Historical Logs
          </h3>
        </CardHeader>
        {userAttendanceRecords.length > 0 ? (
          <div className="p-3 sm:p-4">
            <DataTable
              columns={HISTORY_COLUMNS}
              data={userAttendanceRecords}
              getRowKey={(rec) => rec.id}
              density="comfortable"
              defaultSort={{ key: "date", direction: "desc" }}
              emptyMessage="No attendance records found"
              className="[&>div]:border-0 [&>div]:shadow-none [&>div]:rounded-none"
            />
          </div>
        ) : (
          <CardBody className="py-4">
            <EmptyState
              title="No attendance records found"
              description="Daily clock-ins will populate this log."
              icon={<Calendar className="w-8 h-8" aria-hidden />}
              className="border-0 shadow-none bg-transparent"
            />
          </CardBody>
        )}
      </Card>

      <Dialog
        isOpen={!!feedback}
        onClose={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        description={feedback?.description}
        cancelLabel={feedback?.mode === "alert" ? "OK" : "Cancel"}
        confirmLabel={
          feedback?.mode === "confirm"
            ? feedback.confirmLabel ?? "Confirm"
            : undefined
        }
        confirmVariant={
          feedback?.mode === "confirm"
            ? feedback.confirmVariant ?? "primary"
            : undefined
        }
        onConfirm={
          feedback?.mode === "confirm" ? feedback.onConfirm : undefined
        }
      />
    </div>
  );
}
