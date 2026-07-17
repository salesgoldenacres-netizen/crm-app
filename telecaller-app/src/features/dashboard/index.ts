export { default as Dashboard } from "./pages/Dashboard";

export { default as AgentProfileView } from "./components/AgentProfileView";
export { default as CustomizerDrawer } from "./components/CustomizerDrawer";
export { default as DashboardHeader } from "./components/DashboardHeader";
export { default as LeaderboardWidget } from "./components/LeaderboardWidget";
export { default as MobileDrawer } from "./components/MobileDrawer";
export { default as MobileStatusPanel } from "./components/MobileStatusPanel";
export { default as PipelineFunnelWidget } from "./components/PipelineFunnelWidget";
export { default as ProjectMapsView } from "./components/ProjectMapsView";
export { default as TrainingHQView } from "./components/TrainingHQView";
export { default as WidgetGrid } from "./components/WidgetGrid";

export * from "./hooks/useDashboardLeads";
export * from "./hooks/useDashboardPushConfig";
export * from "./hooks/useDashboardDialer";
export * from "./hooks/useDashboardTimers";
export * from "./hooks/useDashboardWidgets";
export * from "./hooks/useDashboardPreferencesStore";

export * from "@/shared/constants/whatsappTemplates";
export * from "./utils/agentStats";
