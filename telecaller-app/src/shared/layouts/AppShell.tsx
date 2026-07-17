import { ReactNode } from "react";
import { ToastProvider } from "@/shared/components/Toast";
import ModalHost from "@/shared/layouts/ModalHost";
import { User } from "@/shared/types";
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
  return (
    <ToastProvider>
      <ModalHost
        user={user}
        projects={projects}
        leads={leadsStore.leads}
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
