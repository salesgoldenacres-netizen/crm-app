import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Lead, Project, User } from "@/shared/types";
import DialerOverlay from "@/features/calls/components/DialerOverlay";
import { useDashboardDialer } from "@/features/dashboard/hooks/useDashboardDialer";
import { AddLeadFormState } from "@/features/leads/components/AddLeadModal";

/**
 * Imperative handle exposed to the Dashboard so it can start an outbound call
 * without subscribing to the dialer's 1Hz ticking state.
 */
export interface DashboardDialerHandle {
  startCall: (lead: Lead) => void;
}

interface DashboardDialerHostProps {
  user: User;
  isManagerial: (role?: string) => boolean;
  updateAgentStatus: (userId: string, status: string, username: string) => Promise<void>;
  ivrSettings: any;
  activeIvrCall: any;
  clearActiveIvrCall: () => Promise<void>;
  matchedIvrLead: Lead | null;
  toast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  setActiveLeadId: (leadId: string) => void;
  setIsAddLeadModalOpen: (open: boolean) => void;
  setAddLeadForm: React.Dispatch<React.SetStateAction<AddLeadFormState>>;
  projects: Record<string, Project>;
}

/**
 * DashboardDialerHost (P-4)
 *
 * Owns all outbound-dialer state (including the once-per-second call duration
 * ticker) and renders the DialerOverlay. Isolating this state here means the
 * 1Hz `dialerSeconds` updates only re-render this subtree + the overlay, instead
 * of re-rendering the entire Dashboard tab tree every second during a live call.
 *
 * The Dashboard triggers calls through a stable imperative handle, so the
 * call-start path does not force consumers (LeadsTab, WidgetGrid, etc.) to
 * subscribe to the ticking state.
 */
const DashboardDialerHost = forwardRef<DashboardDialerHandle, DashboardDialerHostProps>(
  function DashboardDialerHost(
    {
      user,
      isManagerial,
      updateAgentStatus,
      ivrSettings,
      activeIvrCall,
      clearActiveIvrCall,
      matchedIvrLead,
      toast,
      setActiveLeadId,
      setIsAddLeadModalOpen,
      setAddLeadForm,
      projects,
    },
    ref
  ) {
    // Dialer call-log form draft is only consumed by handleEndCall — keep it local.
    const [, setCallLogForm] = useState({
      note: "",
      status: "contacted",
      followUpDate: "",
      priority: "warm",
      disposition: "Connected",
    });

    const {
      activeDialerLead,
      dialerStatus,
      dialerSeconds,
      dialerMuted,
      setDialerMuted,
      dialerSpeaker,
      setDialerSpeaker,
      handleStartCall,
      handleEndCall,
      handleAnswerIvrCall,
    } = useDashboardDialer(
      user,
      isManagerial,
      updateAgentStatus,
      ivrSettings,
      activeIvrCall,
      clearActiveIvrCall,
      matchedIvrLead,
      toast,
      setActiveLeadId,
      setIsAddLeadModalOpen,
      setAddLeadForm
    );

    useImperativeHandle(ref, () => ({ startCall: handleStartCall }), [handleStartCall]);

    return (
      <DialerOverlay
        activeDialerLead={activeDialerLead}
        dialerStatus={dialerStatus}
        dialerSeconds={dialerSeconds}
        dialerMuted={dialerMuted}
        setDialerMuted={setDialerMuted}
        dialerSpeaker={dialerSpeaker}
        setDialerSpeaker={setDialerSpeaker}
        handleEndCall={() => handleEndCall(setCallLogForm as any)}
        activeIvrCall={null}
        ivrSettings={ivrSettings}
        matchedIvrLead={null}
        projects={projects}
        clearActiveIvrCall={clearActiveIvrCall}
        handleAnswerIvrCall={handleAnswerIvrCall}
      />
    );
  }
);

export default DashboardDialerHost;
