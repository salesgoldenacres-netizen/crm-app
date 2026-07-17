import React, { createContext, useContext } from "react";

export interface ModalRegistry {
  TemplateCenterModal?: React.ComponentType<{
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
    phone: string;
    projectName: string;
    plotNumber: string;
  }>;
  DialPadDrawer?: React.ComponentType<{
    isOpen: boolean;
    onClose: () => void;
    leads: any[];
    onStartCall: (lead: any) => void;
    projects?: any;
    addLead: (lead: any) => Promise<any>;
  }>;
  DialerOverlay?: React.ComponentType<{
    activeDialerLead: any;
    dialerStatus: string;
    dialerSeconds: number;
    dialerMuted: boolean;
    setDialerMuted: (muted: boolean) => void;
    dialerSpeaker: boolean;
    setDialerSpeaker: (speaker: boolean) => void;
    handleEndCall: () => void;
    activeIvrCall: any;
    ivrSettings: any;
    matchedIvrLead: any;
    projects: any;
    clearActiveIvrCall: () => Promise<void>;
    handleAnswerIvrCall: () => Promise<void>;
  }>;
  CallLogModal?: React.ComponentType<{
    isOpen: boolean;
    onClose: () => void;
    lead: any;
    durationSeconds: number;
    logCall: (leadId: string, call: any) => Promise<any>;
    updateLead: (id: string, data: any) => Promise<any>;
    user: any;
  }>;
}

export const ModalRegistryContext = createContext<ModalRegistry>({});

export const useModalRegistry = () => useContext(ModalRegistryContext);
