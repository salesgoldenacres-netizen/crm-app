import { ReactNode, ComponentType } from "react";
import { ToastProvider } from "@/shared/components/Toast";
import ModalHost from "@/shared/layouts/ModalHost";
import { User, Lead, Project, Branding } from "@/shared/types";
import type { IVRActiveCall, IVRSettings } from "@/shared/types/ivr";
import { AppShellContext, useAppShell } from "./AppShellContext";

export { useAppShell, AppShellContext };
export type { AppShellContextType } from "./AppShellContext";

export type InCallWhatsAppBarProps = {
  lead: Lead;
  user: User;
  projects: Record<string, Project>;
};

export interface AppShellProps {
  user: User | null;
  children: ReactNode;
  projects: Record<string, Project> | null;
  openLeads: Lead[];
  branding: Branding;
  leadsStore: {
    addLead: (lead: Partial<Lead>) => Promise<unknown>;
    updateLead: (id: string, data: Partial<Lead>) => Promise<unknown>;
    logCall: (leadId: string, call: Record<string, unknown>) => Promise<unknown>;
  };
  ivrStore: {
    ivrSettings: IVRSettings | null;
    activeIvrCall: IVRActiveCall | null;
    clearActiveIvrCall: () => Promise<void>;
  };
  InCallWhatsAppBar?: ComponentType<InCallWhatsAppBarProps>;
  themeToggle?: ReactNode;
}

export default function AppShell({
  user,
  children,
  projects,
  openLeads,
  branding,
  leadsStore,
  ivrStore,
  InCallWhatsAppBar,
  themeToggle,
}: AppShellProps) {
  return (
    <ToastProvider>
      <ModalHost
        user={user}
        projects={projects}
        leads={openLeads}
        branding={branding}
        addLead={leadsStore.addLead}
        updateLead={leadsStore.updateLead}
        logCall={leadsStore.logCall}
        ivrSettings={ivrStore.ivrSettings}
        activeIvrCall={ivrStore.activeIvrCall}
        clearActiveIvrCall={ivrStore.clearActiveIvrCall}
        InCallWhatsAppBar={InCallWhatsAppBar}
        themeToggle={themeToggle}
      >
        {children}
      </ModalHost>
    </ToastProvider>
  );
}
