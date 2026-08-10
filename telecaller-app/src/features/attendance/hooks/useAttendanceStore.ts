import { useState, useEffect } from "react";
import { AttendanceRecord, BreakSession } from "@/shared/types";
import { AttendanceRepository, AgentStatusRepository } from "@/shared/services/firebase/repositories";

/** Rolling window for list listeners — avoids unbounded attendance sync. */
const ATTENDANCE_LIST_RANGE_DAYS = 90;

function getLocalDateStr(d = new Date()) {
  // Use Indian Standard Time (IST) offsets for consistent local date formats
  const offset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(d.getTime() + offset);
  return istTime.toISOString().split("T")[0];
}

function shiftLocalDateStr(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return getLocalDateStr(d);
}

export function useAttendanceStore(userId?: string, options?: { managerial?: boolean }) {
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(!userId);
  const [prevUserId, setPrevUserId] = useState(userId);

  if (userId !== prevUserId) {
    setPrevUserId(userId);
    setIsLoaded(!userId);
  }

  useEffect(() => {
    const endDate = getLocalDateStr();
    const startDate = shiftLocalDateStr(ATTENDANCE_LIST_RANGE_DAYS);
    const managerial = options?.managerial === true;

    // 1. Date-ranged attendance list — managerial sees all; agents only self (SEC-1)
    const unsubscribeAll = AttendanceRepository.subscribeRange(
      startDate,
      endDate,
      (records) => {
      // Sort by checkIn descending
      records.sort(
        (a, b) =>
          new Date(b.checkIn || 0).getTime() -
          new Date(a.checkIn || 0).getTime(),
      );
      setAllAttendance(records);
      if (!userId) {
        setIsLoaded(true);
      }
    },
      managerial ? undefined : userId,
    );

    // 2. Subscribe to today's record for this user if logged in
    let unsubscribeToday = () => {};
    if (userId) {
      const todayStr = getLocalDateStr();
      const docId = `${todayStr}_${userId}`;
      unsubscribeToday = AttendanceRepository.subscribeToday(docId, (record) => {
        setTodayAttendance(record);
        setIsLoaded(true);
      });
    }

    return () => {
      unsubscribeAll();
      unsubscribeToday();
    };
  }, [userId, options?.managerial]);

  const clockIn = async (username: string, shiftId = "morning_shift") => {
    if (!userId) return;
    const todayStr = getLocalDateStr();
    const docId = `${todayStr}_${userId}`;

    // Check if shift is late (Morning Shift starts at 09:00 AM)
    const now = new Date();
    let status = "present";
    let lateMinutes = 0;
    if (shiftId === "morning_shift") {
      const shiftStart = new Date();
      shiftStart.setHours(9, 0, 0, 0); // 09:00 AM
      if (now > shiftStart) {
        lateMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / 60000);
        if (lateMinutes > 15) {
          // 15 mins grace period
          status = "late";
        }
      }
    }

    const attendanceRecord: AttendanceRecord = {
      id: docId,
      userId,
      username: username || "User",
      date: todayStr,
      status,
      checkIn: now.toISOString(),
      checkOut: "",
      lateMinutes,
      totalWorkHours: 0,
      breaks: [],
      deviceInfo:
        typeof window !== "undefined" ? window.navigator.userAgent : "Unknown",
      updatedAt: now.toISOString(),
    };

    await AttendanceRepository.add(attendanceRecord);

    // Update live agent status to available
    await AgentStatusRepository.set(userId, {
      userId,
      username: username || "User",
      status: "available",
      updatedAt: now.toISOString(),
    });
  };

  const startBreak = async (username: string, breakType = "break") => {
    if (!userId || !todayAttendance) return;
    const todayStr = getLocalDateStr();
    const docId = `${todayStr}_${userId}`;
    const now = new Date();

    const newBreak: BreakSession = {
      type: breakType,
      start: now.toISOString(),
      end: null,
    };

    const updatedBreaks = [...(todayAttendance.breaks || []), newBreak];
    await AttendanceRepository.update(docId, {
      breaks: updatedBreaks,
      updatedAt: now.toISOString(),
    });

    // Update live agent status to break/lunch
    await AgentStatusRepository.set(userId, {
      userId,
      username: username || "User",
      status: breakType === "lunch" ? "lunch" : "break",
      updatedAt: now.toISOString(),
    });
  };

  const endBreak = async (username: string) => {
    if (!userId || !todayAttendance || !todayAttendance.breaks) return;
    const todayStr = getLocalDateStr();
    const docId = `${todayStr}_${userId}`;
    const now = new Date();

    const updatedBreaks = todayAttendance.breaks.map((b) => {
      if (b.end === null) {
        return { ...b, end: now.toISOString() };
      }
      return b;
    });

    await AttendanceRepository.update(docId, {
      breaks: updatedBreaks,
      updatedAt: now.toISOString(),
    });

    // Update live agent status back to available
    await AgentStatusRepository.set(userId, {
      userId,
      username: username || "User",
      status: "available",
      updatedAt: now.toISOString(),
    });
  };

  const clockOut = async (username: string) => {
    if (!userId || !todayAttendance) return;
    const todayStr = getLocalDateStr();
    const docId = `${todayStr}_${userId}`;
    const now = new Date();

    // Ensure any open breaks are closed first
    let updatedBreaks = todayAttendance.breaks || [];
    const openBreakIdx = updatedBreaks.findIndex((b) => b.end === null);
    if (openBreakIdx !== -1) {
      updatedBreaks = updatedBreaks.map((b) =>
        b.end === null ? { ...b, end: now.toISOString() } : b
      );
    }

    // Calculate total duration (in hours) excluding break times
    const checkInTime = new Date(todayAttendance.checkIn);
    const checkOutTime = now;
    let totalMs = checkOutTime.getTime() - checkInTime.getTime();

    // Subtract break times
    updatedBreaks.forEach((b) => {
      if (b.start && b.end) {
        totalMs -= new Date(b.end).getTime() - new Date(b.start).getTime();
      }
    });

    const totalHours = Math.max(0, parseFloat((totalMs / 3600000).toFixed(2)));

    await AttendanceRepository.update(docId, {
      checkOut: now.toISOString(),
      breaks: updatedBreaks,
      totalWorkHours: totalHours,
      updatedAt: now.toISOString(),
    });

    // Update live agent status to offline
    await AgentStatusRepository.set(userId, {
      userId,
      username: username || "User",
      status: "offline",
      updatedAt: now.toISOString(),
    });
  };

  const forceClockOut = async (targetUserId: string, targetUsername: string) => {
    const todayStr = getLocalDateStr();
    const docId = `${todayStr}_${targetUserId}`;
    const now = new Date();
    
    await AttendanceRepository.update(docId, {
      checkOut: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    await AgentStatusRepository.set(targetUserId, {
      userId: targetUserId,
      username: targetUsername || "User",
      status: "offline",
      updatedAt: now.toISOString(),
    });
  };

  return {
    todayAttendance,
    allAttendance,
    isLoaded,
    clockIn,
    startBreak,
    endBreak,
    clockOut,
    forceClockOut,
  };
}
