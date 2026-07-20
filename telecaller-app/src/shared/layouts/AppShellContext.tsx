import { createContext, useContext } from "react";
import { User, Lead } from "@/shared/types";
import type { TemplateModalContext } from "@/shared/layouts/ModalRegistryContext";

export interface AppShellContextType {
  openTemplates: () => void;
  openShortcuts: () => void;
  setTemplateContext: (context: Partial<TemplateModalContext>) => void;
  user: User | null;
  startCall: (lead: Lead) => void;
  activeDialerLead: Lead | null;
  isDialPadOpen: boolean;
  setIsDialPadOpen: (open: boolean) => void;
  isCallLogModalOpen: boolean;
  callLogLead: Lead | null;
  openCallLogModal: (lead: Lead) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

export const AppShellContext = createContext<AppShellContextType>({
  openTemplates: () => {},
  openShortcuts: () => {},
  setTemplateContext: () => {},
  user: null,
  startCall: () => {},
  activeDialerLead: null,
  isDialPadOpen: false,
  setIsDialPadOpen: () => {},
  isCallLogModalOpen: false,
  callLogLead: null,
  openCallLogModal: () => {},
  isFullscreen: false,
  toggleFullscreen: () => {},
});

export function useAppShell() {
  return useContext(AppShellContext);
}
