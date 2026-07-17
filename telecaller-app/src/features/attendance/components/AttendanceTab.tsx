import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { useAttendanceStore } from "../hooks/useAttendanceStore";
import { safeFormatTime, parseSafeDate } from "@/shared/utils/dateUtils";
import { User } from "@/shared/types";
import Dialog from "@/shared/components/ui/Dialog";

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
    let interval: any = null;
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
    return () => clearInterval(interval);
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

  const formatDuration = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((totalSecs % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSecs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const userAttendanceRecords = allAttendance.filter(
    (rec) => rec.userId === user.id
  );

  return (
    <div className="w-full max-w-full mx-auto px-3 sm:px-6 lg:px-12 py-5 sm:py-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-950 dark:text-white">
            My Attendance Log
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Track your daily shift clock-ins, breaks, and net work hours.
          </p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded-lg p-3 text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
          📅 Current Month:{" "}
          {new Date().toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      {/* Clock Controls Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="font-bold text-lg text-gray-950 dark:text-white">
            Daily Shift Management
          </h3>
          <p className="text-xs text-gray-500">
            Log your morning shift and breaks in real-time.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCheckInToggle}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95 text-white ${
              todayAttendance
                ? todayAttendance.checkOut
                  ? "bg-gray-400 hover:bg-gray-500"
                  : "bg-rose-600 hover:bg-rose-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
            disabled={!!(todayAttendance && todayAttendance.checkOut)}
          >
            {todayAttendance
              ? todayAttendance.checkOut
                ? "Clocked Out"
                : "Clock Out ⏰"
              : "Clock In ⏰"}
          </button>
          <button
            onClick={handleBreakToggle}
            disabled={!todayAttendance || !!todayAttendance.checkOut}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95 border ${
              !todayAttendance || todayAttendance.checkOut
                ? "bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-950 dark:text-gray-600 dark:border-gray-800"
                : (todayAttendance.breaks || []).some((b) => b.end === null)
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 border-transparent animate-pulse"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:border-gray-600"
            }`}
          >
            {(todayAttendance?.breaks || []).some((b) => b.end === null)
              ? "End Break ☕"
              : "Start Break ☕"}
          </button>
        </div>
      </div>

      {/* Metrics summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
            Today's Status
          </span>
          <span className="text-2xl font-bold text-gray-950 dark:text-white mt-1 block">
            {todayAttendance
              ? todayAttendance.checkOut
                ? "🟢 Completed"
                : "🟢 Clocked In"
              : "⚪ Offline"}
          </span>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
            Net Work Time
          </span>
          <span className="text-2xl font-bold text-gray-950 dark:text-white mt-1 block">
            {todayAttendance
              ? formatDuration(elapsedWorkSeconds * 1000)
              : "00:00:00"}
          </span>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
            Break Duration
          </span>
          <span className="text-2xl font-bold text-gray-950 dark:text-white mt-1 block">
            {todayAttendance
              ? formatDuration(elapsedBreakSeconds * 1000)
              : "00:00:00"}
          </span>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
            Shift Timings
          </span>
          <span className="text-sm font-semibold text-gray-950 dark:text-white mt-2 block">
            Morning Shift
            <br />
            <span className="text-gray-500 text-xs font-normal">
              09:00 AM - 06:00 PM
            </span>
          </span>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-950 dark:text-white">
            Historical Logs
          </h3>
        </div>
        {userAttendanceRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Clock In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Clock Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Break Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Work Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {userAttendanceRecords.map((rec) => {
                  // Sum completed breaks
                  let breakMs = 0;
                  (rec.breaks || []).forEach((b) => {
                    if (b.start && b.end) {
                      breakMs +=
                        (parseSafeDate(b.end)?.getTime() || 0) -
                        (parseSafeDate(b.start)?.getTime() || 0);
                    }
                  });
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {rec.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {rec.checkIn
                          ? safeFormatTime(rec.checkIn, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {rec.checkOut
                          ? safeFormatTime(rec.checkOut, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatDuration(breakMs)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-semibold">
                        {rec.totalWorkHours
                          ? `${rec.totalWorkHours} hrs`
                          : rec.checkOut
                            ? "—"
                            : "In Progress"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                            rec.status === "present"
                              ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400"
                              : rec.status === "late"
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400"
                                : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-400" />
            <p className="font-semibold text-lg">No attendance records found</p>
            <p className="text-sm mt-1">
              Daily clock-ins will populate this log.
            </p>
          </div>
        )}
      </div>

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
