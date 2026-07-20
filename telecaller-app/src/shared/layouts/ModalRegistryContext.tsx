import React, { createContext, useContext } from "react";
import { User, Lead, Project, CallLog } from "@/shared/types";
import { IVRActiveCall, IVRSettings } from "@/features/calls/hooks/useIVRStore";

/** Template Center modal pre-fill payload (AppShell → TemplateCenterModal). */
export interface TemplateModalContext {
  clientName: string;
  phone: string;
  projectName: string;
  plotNumber: string;
}

/** Dialer overlay connection states. */
export type DialerStatus =
  | "Dialing..."
  | "Ringing..."
  | "Connecting IVR..."
  | "Ringing agent..."
  | "Connecting customer..."
  | "Active Call";

export interface ModalRegistry {
  TemplateCenterModal?: React.ComponentType<{
    isOpen: boolean;
    onClose: () => void;
  } & TemplateModalContext>;
  DialPadDrawer?: React.ComponentType<{
    isOpen: boolean;
    onClose: () => void;
    leads: Lead[];
    onStartCall: (lead: Lead) => void;
    projects?: Record<string, Project>;
    addLead: (lead: Partial<Lead>) => Promise<Lead | null>;
  }>;
  DialerOverlay?: React.ComponentType<{
    activeDialerLead: Lead | null;
    dialerStatus: DialerStatus;
    dialerSeconds: number;
    dialerMuted: boolean;
    setDialerMuted: (muted: boolean) => void;
    dialerSpeaker: boolean;
    setDialerSpeaker: (speaker: boolean) => void;
    handleEndCall: () => void;
    activeIvrCall: IVRActiveCall | null;
    ivrSettings: IVRSettings | null;
    matchedIvrLead: Lead | null;
    projects: Record<string, Project>;
    clearActiveIvrCall: () => Promise<void>;
    handleAnswerIvrCall: () => Promise<void>;
  }>;
  CallLogModal?: React.ComponentType<{
    isOpen: boolean;
    onClose: () => void;
    lead: Lead;
    durationSeconds: number;
    logCall: (leadId: string, call: Partial<CallLog>) => Promise<void>;
    updateLead: (id: string, data: Partial<Lead>) => Promise<void>;
    user: User;
  }>;
}

export const ModalRegistryContext = createContext<ModalRegistry>({});

export const useModalRegistry = () => useContext(ModalRegistryContext);
