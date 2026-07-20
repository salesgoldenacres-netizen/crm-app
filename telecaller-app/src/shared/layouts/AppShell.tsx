import { ReactNode } from "react";
import { ToastProvider } from "@/shared/components/Toast";
import ModalHost from "@/shared/layouts/ModalHost";
import { User } from "@/shared/types";
import { useAgentOpenLeads } from "@/features/leads/hooks/useAgentOpenLeads";
import { AppShellContext, useAppShell } from "./AppShellContext";

export { useAppShell, AppShellContext };
export type { AppShellContextType } from "./AppShellContext";

interface AppShellProps {
  user: User | null;
  children: ReactNode;
  projects: any;
  leadsStore: any;
  ivrStore: any;
}

export default function AppShell({
  user,
  children,
  projects,
  leadsStore,
  ivrStore,
}: AppShellProps) {
  // Agent dialer convenience only — not list SoT (LeadQueryService).
  const { openLeads } = useAgentOpenLeads();

  return (
    <ToastProvider>
      <ModalHost
        user={user}
        projects={projects}
        leads={openLeads}
        addLead={leadsStore.addLead}
        updateLead={leadsStore.updateLead}
        logCall={leadsStore.logCall}
        ivrSettings={ivrStore.ivrSettings}
        activeIvrCall={ivrStore.activeIvrCall}
        clearActiveIvrCall={ivrStore.clearActiveIvrCall}
      >
        {children}
      </ModalHost>
    </ToastProvider>
  );
}
