export { default as LeadDetailsPage } from "./pages/LeadDetailsPage";

export { default as AddLeadModal } from "./components/AddLeadModal";
export { default as AdminLeadModal } from "./components/AdminLeadModal";
export { default as AdvancedFiltersPanel } from "./components/AdvancedFiltersPanel";
export { default as BulkActionsPanel } from "./components/BulkActionsPanel";
export { default as BulkLeadImportModal } from "./components/BulkLeadImportModal";
export { default as CallLoggingForm } from "./components/CallLoggingForm";
export { default as CampaignBroadcastModal } from "./components/CampaignBroadcastModal";
export { default as DiscountManager } from "./components/DiscountManager";
export { default as LeadAcquisitionAnalytics } from "./components/LeadAcquisitionAnalytics";
export { default as LeadBinWorkspace } from "./components/LeadBinWorkspace";
export { default as LeadDetailsProfile } from "./components/LeadDetailsProfile";
export { default as LeadInteractionHistory } from "./components/LeadInteractionHistory";
export { default as LeadProximityInsights } from "./components/LeadProximityInsights";
export { default as LeadSubmissionForm } from "./components/LeadSubmissionForm";
export { default as LeadsDesktopTable } from "./components/LeadsDesktopTable";
export { default as LeadsFilterPanel } from "./components/LeadsFilterPanel";
export { default as LeadListFilterChips } from "./components/LeadListFilterChips";
export type { FilterChipDisplay, LeadListFilterChipsProps } from "./components/LeadListFilterChips";
export { default as LeadFilterFieldControl } from "./components/LeadFilterFieldControl";
export { default as LeadsKanbanBoard } from "./components/LeadsKanbanBoard";
export { default as LeadsMobileGrid } from "./components/LeadsMobileGrid";
export { default as LeadsTab } from "./components/LeadsTab";
export { default as LeadsWorkspace } from "./components/LeadsWorkspace";
export { default as LinkLeadModal } from "./components/LinkLeadModal";
export { default as LoanEMICalculator } from "./components/LoanEMICalculator";
export { default as MapCallLogModal } from "./components/MapCallLogModal";
export { default as PendingDiscountsApprovals } from "./components/PendingDiscountsApprovals";
export { default as PlotLocator } from "./components/PlotLocator";
export { default as QuickAccessStatusTabs } from "./components/QuickAccessStatusTabs";
export { default as SimulatedDialer } from "./components/SimulatedDialer";
export { default as SiteVisitScheduler } from "./components/SiteVisitScheduler";
export { default as SmartCallScript } from "./components/SmartCallScript";
export { default as TemplateCenterModal } from "./components/TemplateCenterModal";
export { default as WhatsAppAssistant } from "./components/WhatsAppAssistant";

export * from "./hooks/useAdminLeads";
export * from "./hooks/useArchivedLeadsStore";
export * from "./hooks/useLeadsStore";
export * from "./hooks/useAgentOpenLeads";
export * from "./hooks/useLeadQuery";

export * from "./constants/leadTemplates";
// leadColors moved to @/shared/utils/leadColors (audit A-1). Re-exported here for
// backwards compatibility with existing `@/features/leads` barrel consumers.
export * from "@/shared/utils/leadColors";
