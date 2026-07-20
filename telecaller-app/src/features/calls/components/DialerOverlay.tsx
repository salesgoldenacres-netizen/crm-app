import { useId } from "react";
import { Phone, PhoneCall } from "lucide-react";
import Modal from "@/shared/components/ui/Modal";
import Button from "@/shared/components/ui/Button";
import { Lead, Project } from "@/shared/types";
import {
  DialerContactBlock,
  DialerEndCallButton,
  DialerMuteSpeakerControls,
  DialerStatusChip,
} from "./DialerChrome";

interface DialerOverlayProps {
  activeDialerLead: Lead | null;
  dialerStatus: string;
  dialerSeconds: number;
  dialerMuted: boolean;
  setDialerMuted: (muted: boolean) => void;
  dialerSpeaker: boolean;
  setDialerSpeaker: (speaker: boolean) => void;
  handleEndCall: () => void;
  activeIvrCall: any;
  ivrSettings: any;
  matchedIvrLead: Lead | null;
  projects: Record<string, Project>;
  clearActiveIvrCall: () => Promise<void> | void;
  handleAnswerIvrCall: () => void;
}

export default function DialerOverlay({
  activeDialerLead,
  dialerStatus,
  dialerSeconds,
  dialerMuted,
  setDialerMuted,
  dialerSpeaker,
  setDialerSpeaker,
  handleEndCall,
  activeIvrCall,
  ivrSettings,
  matchedIvrLead,
  projects,
  clearActiveIvrCall,
  handleAnswerIvrCall,
}: DialerOverlayProps) {
  const dialerDescId = useId();
  const ivrDescId = useId();
  const isActiveCall = dialerStatus === "Active Call";
  const isIvrRinging = Boolean(activeIvrCall && activeIvrCall.status === "ringing");

  const callerName = matchedIvrLead
    ? matchedIvrLead.name
    : activeIvrCall?.callerName ?? "Incoming call";

  return (
    <>
      {/* Outbound / simulated call overlay */}
      <Modal
        isOpen={Boolean(activeDialerLead)}
        onClose={handleEndCall}
        title={dialerStatus || "Call"}
        size="sm"
        variant="sheet"
        closeOnBackdrop={false}
        closeLabel="End call"
        descriptionId={dialerDescId}
        footer={
          <div className="flex w-full flex-col items-center gap-6">
            <DialerMuteSpeakerControls
              muted={dialerMuted}
              onMuteChange={setDialerMuted}
              speaker={dialerSpeaker}
              onSpeakerChange={setDialerSpeaker}
            />
            <DialerEndCallButton onEnd={handleEndCall} />
          </div>
        }
      >
        {activeDialerLead && (
          <div className="flex flex-col items-center py-2">
            <DialerContactBlock
              name={activeDialerLead.name}
              phone={activeDialerLead.phone}
              status={dialerStatus}
              isActive={isActiveCall}
              seconds={dialerSeconds}
            />
            <p id={dialerDescId} className="sr-only">
              {isActiveCall
                ? `Active call with ${activeDialerLead.name}. Use mute, speaker, or end call.`
                : `Calling ${activeDialerLead.name}. Status: ${dialerStatus}.`}
            </p>
          </div>
        )}
      </Modal>

      {/* Incoming IVR ringing overlay */}
      <Modal
        isOpen={isIvrRinging}
        onClose={() => {
          void clearActiveIvrCall();
        }}
        title="Incoming IVR Call"
        size="md"
        variant="center"
        closeOnBackdrop={false}
        closeLabel="Decline call"
        descriptionId={ivrDescId}
        footer={
          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                void clearActiveIvrCall();
              }}
            >
              Decline
            </Button>
            <Button
              type="button"
              variant="success"
              className="w-full sm:min-w-[12rem] sm:flex-1"
              onClick={handleAnswerIvrCall}
            >
              <Phone className="mr-2 h-4 w-4" aria-hidden="true" />
              Answer & Open Profile
            </Button>
          </div>
        }
      >
        {activeIvrCall && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <DialerStatusChip status="Ringing" isActive={false} />
              {ivrSettings?.ivrVirtualNumber ? (
                <span className="rounded-theme border border-theme-border bg-theme-surface px-2.5 py-1 font-mono text-[10px] text-theme-muted">
                  via {ivrSettings.ivrVirtualNumber}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col items-center text-center">
              <div
                className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-theme-danger/30 bg-theme-danger/10 text-theme-danger"
                aria-hidden="true"
              >
                <PhoneCall className="h-8 w-8" />
              </div>
              <h4 className="text-xl font-bold tracking-tight text-theme-text">
                {callerName}
              </h4>
              <p
                id={ivrDescId}
                className="mt-1 font-mono text-sm text-theme-muted"
              >
                {activeIvrCall.callerPhone}
              </p>
            </div>

            {matchedIvrLead && (
              <div className="space-y-2 rounded-theme border border-theme-border bg-theme-surface p-3.5 text-left text-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
                  Lead Context
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-theme-muted">Project</span>
                  <span className="font-semibold text-theme-text">
                    {projects[matchedIvrLead.projectId || ""]?.name || "N/A"}
                  </span>
                </div>
                {matchedIvrLead.plotId ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-theme-muted">Plot Interest</span>
                    <span className="font-semibold text-theme-text">
                      Plot {matchedIvrLead.plotId}
                    </span>
                  </div>
                ) : null}
                {matchedIvrLead.status ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-theme-muted">Status</span>
                    <span className="rounded-theme border border-theme-border bg-theme-accent-muted px-2 py-0.5 text-[10px] font-bold capitalize text-theme-accent">
                      {matchedIvrLead.status}
                    </span>
                  </div>
                ) : null}
                {matchedIvrLead.notes ? (
                  <div className="mt-1 border-t border-theme-border pt-2">
                    <span className="mb-0.5 block text-theme-muted">Notes</span>
                    <span className="line-clamp-2 italic leading-relaxed text-theme-text">
                      &ldquo;{matchedIvrLead.notes}&rdquo;
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
