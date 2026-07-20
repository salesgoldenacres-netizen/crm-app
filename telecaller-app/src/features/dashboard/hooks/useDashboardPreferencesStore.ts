import { useState, useEffect } from "react";
import { DashboardPreferencesRepository } from "@/shared/services/firebase/repositories";

export interface WidgetPreference {
  id: string;
  title: string;
  w: number;
  h: number;
  visible: boolean;
}

const DEFAULT_WIDGETS: WidgetPreference[] = [
  { id: "callsToday", title: "Daily Call Target", w: 1, h: 280, visible: true },
  {
    id: "bookingsToday",
    title: "Monthly Booking Target",
    w: 1,
    h: 280,
    visible: true,
  },
  { id: "teamGoals", title: "Team Monthly Goals", w: 2, h: 280, visible: true },
  { id: "todayEvents", title: "Today's Events", w: 1, h: 280, visible: true },
  { id: "leaderboard", title: "Leaderboard", w: 1, h: 280, visible: true },
  { id: "pipeline", title: "Pipeline Funnel", w: 1, h: 285, visible: true },
  { id: "coachingTip", title: "Coaching Insight", w: 1, h: 285, visible: true },
  {
    id: "tasksWidget",
    title: "Personal Tasks List",
    w: 1,
    h: 285,
    visible: true,
  },
  {
    id: "callLogsWidget",
    title: "Recent Call Timeline",
    w: 2,
    h: 285,
    visible: true,
  },
  { id: "leaveRequests", title: "Leave Requests", w: 1, h: 285, visible: true },
  {
    id: "weeklyRoster",
    title: "Shift Planner & Roster",
    w: 1,
    h: 285,
    visible: true,
  },
  {
    id: "telecallerMetrics",
    title: "Performance Stats",
    w: 1,
    h: 285,
    visible: true,
  },
];

export function useDashboardPreferencesStore(userId?: string) {
  const [widgets, setWidgets] = useState<WidgetPreference[]>(DEFAULT_WIDGETS);
  const [widgetStyle, setWidgetStyle] = useState("standard");
  const [widgetDensity, setWidgetDensity] = useState("comfortable");
  const [isLoaded, setIsLoaded] = useState(!userId);
  const [prevUserId, setPrevUserId] = useState(userId);

  if (userId !== prevUserId) {
    setPrevUserId(userId);
    setIsLoaded(!userId);
    if (!userId) {
      setWidgets(DEFAULT_WIDGETS);
      setWidgetStyle("standard");
      setWidgetDensity("comfortable");
    }
  }

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = DashboardPreferencesRepository.subscribe(userId, (data) => {
      if (!data) {
        setIsLoaded(true);
        return;
      }
      if (Array.isArray(data.widgets)) {
        setWidgets(data.widgets as WidgetPreference[]);
      }
      if (typeof data.widgetStyle === "string") {
        setWidgetStyle(data.widgetStyle);
      }
      if (typeof data.widgetDensity === "string") {
        setWidgetDensity(data.widgetDensity);
      }
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [userId]);

  const updateWidgets = async (newWidgets: WidgetPreference[]) => {
    if (!userId) return;
    await DashboardPreferencesRepository.set(userId, { widgets: newWidgets });
  };

  const updateWidgetStyle = async (style: string) => {
    if (!userId) return;
    await DashboardPreferencesRepository.set(userId, { widgetStyle: style });
  };

  const updateWidgetDensity = async (density: string) => {
    if (!userId) return;
    await DashboardPreferencesRepository.set(userId, { widgetDensity: density });
  };

  const resetPreferences = async () => {
    if (!userId) return;
    await DashboardPreferencesRepository.reset(userId, {
      widgets: DEFAULT_WIDGETS,
      widgetStyle: "standard",
      widgetDensity: "comfortable",
    });
  };

  return {
    widgets,
    setWidgets,
    widgetStyle,
    setWidgetStyle,
    widgetDensity,
    setWidgetDensity,
    isLoaded,
    updateWidgets,
    updateWidgetStyle,
    updateWidgetDensity,
    resetPreferences,
  };
}
