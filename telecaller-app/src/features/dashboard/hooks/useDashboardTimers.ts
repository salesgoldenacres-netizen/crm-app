import { useState, useEffect } from "react";
import { AttendanceRecord } from "@/shared/types";

export function useDashboardTimers(todayAttendance: AttendanceRecord | null | undefined) {
  const [elapsedWorkSeconds, setElapsedWorkSeconds] = useState(0);
  const [elapsedBreakSeconds, setElapsedBreakSeconds] = useState(0);

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

  return { elapsedWorkSeconds, elapsedBreakSeconds };
}
