import RolesSettingsTab from "./settings/RolesSettingsTab";
import CustomFieldsSettingsTab from "./settings/CustomFieldsSettingsTab";
import MergeSettingsTab from "./settings/MergeSettingsTab";
import BrandingSettingsTab from "./settings/BrandingSettingsTab";
import IntegrationsSettingsTab from "./settings/IntegrationsSettingsTab";
import AuditSettingsTab from "./settings/AuditSettingsTab";
import { useCustomFieldsStore, useBrandingStore, useAuditLogsStore } from "@/features/admin/hooks/adminStores";
import { useIVRStore } from "@/features/calls/hooks/useIVRStore";
import { User, Lead, Project, CustomRole } from "@/shared/types";

interface AdminSettingsTabsProps {
  tab: string;
  user: User;
  users: User[];
  customRoles: CustomRole[];
  addCustomRole: (roleData: {
    code: string;
    name: string;
    isManagerial?: boolean;
    hideFinancials?: boolean;
    hideEmail?: boolean;
    hideLeadSource?: boolean;
    allowExport?: boolean;
  }) => Promise<void>;
  updateCustomRole: (id: string, roleData: Partial<CustomRole>) => Promise<void>;
  deleteCustomRole: (id: string) => Promise<void>;
  leads: Lead[];
  addLead: (leadData: Partial<Lead> & { name: string; phone: string }) => Promise<Lead | { isDuplicate: boolean }>;
  updateLeadInStore: (
    id: string,
    leadData: Partial<Lead>,
    options?: { suppressTimeline?: boolean },
  ) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  projects: Record<string, Project>;
  isManagerial: (role: string) => boolean;
  safeFormatDateTime: (dateStr: string, showTime?: boolean) => string;
}

export default function AdminSettingsTabs({
  tab,
  user,
  users,
  customRoles,
  addCustomRole,
  updateCustomRole,
  deleteCustomRole,
  leads,
  addLead,
  updateLeadInStore,
  deleteLead,
  projects,
  isManagerial: checkIsManagerial,
  safeFormatDateTime: formatDt,
}: AdminSettingsTabsProps) {
  const { customFields, saveCustomFields } = useCustomFieldsStore();
  const { branding, updateBranding, isLoaded: brandingLoaded } = useBrandingStore();
  // List listener only on Audit UI — write helper stays available on all settings tabs
  const { auditLogs, logAuditEvent } = useAuditLogsStore({
    subscribeToList: tab === "audit",
  });
  const { simulateIncomingIvrCall } = useIVRStore(user?.id);

  if (tab === "roles") {
    return (
      <RolesSettingsTab
        customRoles={customRoles}
        addCustomRole={addCustomRole}
        updateCustomRole={updateCustomRole}
        deleteCustomRole={deleteCustomRole}
      />
    );
  }

  if (tab === "customfields") {
    return (
      <CustomFieldsSettingsTab
        customFields={customFields}
        saveCustomFields={saveCustomFields}
        logAuditEvent={logAuditEvent}
        user={user}
      />
    );
  }

  if (tab === "merge") {
    return (
      <MergeSettingsTab
        leads={leads}
        projects={projects}
        updateLeadInStore={updateLeadInStore}
        deleteLead={deleteLead}
        logAuditEvent={logAuditEvent}
        user={user}
      />
    );
  }

  if (tab === "branding") {
    return (
      <BrandingSettingsTab
        key={brandingLoaded ? "branding-ready" : "branding-loading"}
        branding={branding}
        brandingLoaded={brandingLoaded}
        updateBranding={updateBranding}
        logAuditEvent={logAuditEvent}
        user={user}
      />
    );
  }

  if (tab === "integrations") {
    return (
      <IntegrationsSettingsTab
        user={user}
        users={users}
        leads={leads}
        addLead={addLead}
        logAuditEvent={logAuditEvent}
        isManagerial={checkIsManagerial}
        simulateIncomingIvrCall={simulateIncomingIvrCall}
      />
    );
  }

  if (tab === "audit") {
    return (
      <AuditSettingsTab
        auditLogs={auditLogs}
        safeFormatDateTime={formatDt}
      />
    );
  }

  return null;
}
