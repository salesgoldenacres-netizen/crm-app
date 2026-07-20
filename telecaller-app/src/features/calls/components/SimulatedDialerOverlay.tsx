import { useId } from "react";
import Modal from "@/shared/components/ui/Modal";
import { Lead } from "@/shared/types";
import {
  DialerContactBlock,
  DialerEndCallButton,
  DialerMuteSpeakerControls,
} from "./DialerChrome";

interface SimulatedDialerOverlayProps {
  activeDialerLead: Lead;
  dialerStatus: string;
  dialerSeconds: number;
  dialerMuted: boolean;
  setDialerMuted: (muted: boolean) => void;
  dialerSpeaker: boolean;
  setDialerSpeaker: (speaker: boolean) => void;
  handleEndCall: () => void;
}

export default function SimulatedDialerOverlay({
  activeDialerLead,
  dialerStatus,
  dialerSeconds,
  dialerMuted,
  setDialerMuted,
  dialerSpeaker,
  setDialerSpeaker,
  handleEndCall,
}: SimulatedDialerOverlayProps) {
  const descId = useId();
  const isActiveCall = dialerStatus === "Active Call";

  return (
    <Modal
      isOpen
      onClose={handleEndCall}
      title={dialerStatus || "Call"}
      size="sm"
      variant="sheet"
      closeOnBackdrop={false}
      closeLabel="End call"
      descriptionId={descId}
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
      <div className="flex flex-col items-center py-2">
        <DialerContactBlock
          name={activeDialerLead.name}
          phone={activeDialerLead.phone}
          status={dialerStatus}
          isActive={isActiveCall}
          seconds={dialerSeconds}
        />
        <p id={descId} className="sr-only">
          {isActiveCall
            ? `Active call with ${activeDialerLead.name}. Use mute, speaker, or end call.`
            : `Calling ${activeDialerLead.name}. Status: ${dialerStatus}.`}
        </p>
      </div>
    </Modal>
  );
}
