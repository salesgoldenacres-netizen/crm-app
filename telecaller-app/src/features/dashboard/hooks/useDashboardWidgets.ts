import { useState, useRef, useEffect, useCallback } from "react";

export interface Widget {
  id: string;
  title: string;
  w: number;
  h: number;
  visible: boolean;
}

export function useDashboardWidgets(
  prefsLoaded: boolean,
  dbWidgetsPreference: Widget[] | undefined,
  updateWidgets: (widgets: Widget[]) => Promise<void>
) {
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: "callsToday", title: "Daily Call Target", w: 1, h: 280, visible: true },
    { id: "bookingsToday", title: "Monthly Booking Target", w: 1, h: 280, visible: true },
    { id: "teamGoals", title: "Team Monthly Goals", w: 2, h: 280, visible: true },
    { id: "todayEvents", title: "Today's Events", w: 1, h: 280, visible: true },
    { id: "leaderboard", title: "Leaderboard", w: 1, h: 280, visible: true },
    { id: "pipeline", title: "Pipeline Funnel", w: 1, h: 285, visible: true },
    { id: "coachingTip", title: "Coaching Insight", w: 1, h: 285, visible: true },
    { id: "tasksWidget", title: "Personal Tasks List", w: 1, h: 285, visible: true },
    { id: "callLogsWidget", title: "Recent Call Timeline", w: 2, h: 285, visible: true },
    { id: "leaveRequests", title: "Leave Requests", w: 1, h: 285, visible: true },
    { id: "weeklyRoster", title: "Shift Planner & Roster", w: 1, h: 285, visible: true },
    { id: "telecallerMetrics", title: "Performance Stats", w: 1, h: 285, visible: true },
  ]);

  const [lastSyncedWidgetsStr, setLastSyncedWidgetsStr] = useState<string>("");

  if (prefsLoaded) {
    if (dbWidgetsPreference) {
      const currentWidgetsStr = JSON.stringify(dbWidgetsPreference);
      if (currentWidgetsStr !== lastSyncedWidgetsStr) {
        setLastSyncedWidgetsStr(currentWidgetsStr);
        setWidgets(dbWidgetsPreference);
      }
    }
  }

  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);
  const resizeCleanupsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (resizeCleanupsRef.current) {
        resizeCleanupsRef.current();
      }
    };
  }, []);

  const widgetsRef = useRef<Widget[]>(widgets);
  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  const startResize = useCallback((e: React.PointerEvent, widgetId: string, currentWidthSpan: number) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const gridElement = document.getElementById("dashboard-widget-grid");
    const cardElement = document.getElementById(`widget-${widgetId}`);
    if (!gridElement || !cardElement) return;

    const totalGapWidth = 24 * 3; // 3 gaps of 24px
    const colWidth = (gridElement.clientWidth - totalGapWidth) / 4;
    const startHeight = cardElement.clientHeight;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      const deltaCols = Math.round(dx / (colWidth + 24));
      const newWidthSpan = Math.max(
        1,
        Math.min(4, currentWidthSpan + deltaCols)
      );

      const newHeight = Math.max(180, Math.min(600, startHeight + dy));

      setWidgets((prev) => {
        return prev.map((w) => {
          if (w.id === widgetId) {
            return { ...w, w: newWidthSpan, h: newHeight };
          }
          return w;
        });
      });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      resizeCleanupsRef.current = null;
      updateWidgets(widgetsRef.current);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    resizeCleanupsRef.current = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [updateWidgets]);

  return {
    widgets,
    setWidgets,
    isCustomizerOpen,
    setIsCustomizerOpen,
    startResize,
  };
}
