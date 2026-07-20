import { PhoneCall, PhoneOff, MicOff, Mic, Volume2, Phone, User } from "lucide-react";
import { clsx } from "clsx";
import { formatDuration } from "@/shared/utils/dateUtils";
import { Lead } from "@/shared/types";
import Button from "@/shared/components/ui/Button";
import { DialerStatusChip } from "@/features/calls/components/DialerChrome";

interface SimulatedDialerProps {
  activeDialerLead: Lead | null;
  dialerStatus: string;
  dialerSeconds: number;
  dialerMuted: boolean;
  setDialerMuted: (muted: boolean) => void;
  dialerSpeaker: boolean;
  setDialerSpeaker: (speaker: boolean) => void;
  handleStartCall: (lead: Lead) => void;
  handleEndCall: () => void;
  activeLead: Lead;
}

const controlBase =
  "inline-flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-full border px-2.5 py-2 text-[10px] font-semibold transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring cursor-pointer";

export default function SimulatedDialer({
  activeDialerLead,
  dialerStatus,
  dialerSeconds,
  dialerMuted,
  setDialerMuted,
  dialerSpeaker,
  setDialerSpeaker,
  handleStartCall,
  handleEndCall,
  activeLead,
}: SimulatedDialerProps) {
  const isActiveCall = dialerStatus === "Active Call";

  return (
    <div className="card-premium space-y-4 p-4">
      <div className="relative space-y-4 overflow-hidden rounded-theme border border-theme-border bg-theme-card p-4">
        <div className="flex items-center justify-between border-b border-theme-border pb-3">
          <h3 className="flex items-center text-xs font-semibold uppercase tracking-wider text-theme-muted">
            <PhoneCall
              className="mr-1.5 h-4 w-4 text-theme-accent"
              aria-hidden="true"
            />
            Simulated Dialer Portal
          </h3>
          {activeDialerLead ? (
            <DialerStatusChip status="Connected" isActive />
          ) : null}
        </div>

        {activeDialerLead ? (
          <div className="space-y-4 py-2">
            <div className="text-center">
              <div
                className={clsx(
                  "mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border transition-colors",
                  isActiveCall
                    ? "border-theme-success/30 bg-theme-success/15 text-theme-success"
                    : "border-theme-accent/30 bg-theme-accent-muted text-theme-accent"
                )}
                aria-hidden="true"
              >
                <User className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-bold tracking-tight text-theme-text">
                {activeDialerLead.name}
              </h4>
              <p className="mt-1 font-mono text-xs font-semibold text-theme-muted">
                {activeDialerLead.phone}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-2 rounded-theme border border-theme-border bg-theme-surface p-4">
              <DialerStatusChip status={dialerStatus} isActive={isActiveCall} />
              {isActiveCall ? (
                <p
                  className="font-mono text-3xl font-bold tracking-widest text-theme-text tabular-nums"
                  aria-live="polite"
                >
                  <span className="sr-only">Call duration </span>
                  {formatDuration(dialerSeconds)}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-center gap-6 pt-2">
              <button
                type="button"
                onClick={() => setDialerMuted(!dialerMuted)}
                aria-pressed={dialerMuted}
                aria-label={dialerMuted ? "Unmute microphone" : "Mute microphone"}
                className={clsx(
                  controlBase,
                  dialerMuted
                    ? "border-theme-danger/40 bg-theme-danger/10 text-theme-danger"
                    : "border-theme-border bg-theme-surface text-theme-text hover:bg-theme-card"
                )}
              >
                {dialerMuted ? (
                  <MicOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Mic className="h-5 w-5" aria-hidden="true" />
                )}
                <span aria-hidden="true">{dialerMuted ? "Unmute" : "Mute"}</span>
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                aria-label="End call"
                className={
                  "inline-flex h-14 w-14 items-center justify-center rounded-full border-0 " +
                  "bg-theme-danger text-white shadow-md transition-opacity hover:opacity-90 " +
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring cursor-pointer"
                }
              >
                <PhoneOff className="h-6 w-6" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setDialerSpeaker(!dialerSpeaker)}
                aria-pressed={dialerSpeaker}
                aria-label={
                  dialerSpeaker ? "Turn speaker off" : "Turn speaker on"
                }
                className={clsx(
                  controlBase,
                  dialerSpeaker
                    ? "border-theme-accent/40 bg-theme-accent-muted text-theme-accent"
                    : "border-theme-border bg-theme-surface text-theme-text hover:bg-theme-card"
                )}
              >
                <Volume2 className="h-5 w-5" aria-hidden="true" />
                <span aria-hidden="true">Speaker</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-6 text-center">
            <p className="text-xs font-medium text-theme-muted">
              Simulated caller is ready to dial.
            </p>
            <Button
              type="button"
              variant="primary"
              className="mx-auto"
              onClick={() => handleStartCall(activeLead)}
            >
              <Phone className="mr-2 h-4 w-4" aria-hidden="true" />
              Start Simulated Call
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
