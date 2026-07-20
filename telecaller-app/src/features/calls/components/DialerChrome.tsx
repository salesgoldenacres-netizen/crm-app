import { Mic, MicOff, PhoneOff, User, Volume2 } from "lucide-react";
import { clsx } from "clsx";
import { formatDuration } from "@/shared/utils/dateUtils";

/** Presentational dialer chrome only — no call placement / Firestore logic. */

export function DialerAvatar({ isActive }: { isActive: boolean }) {
  return (
    <div
      className={clsx(
        "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border transition-colors",
        isActive
          ? "border-theme-success/30 bg-theme-success/15 text-theme-success"
          : "border-theme-accent/30 bg-theme-accent-muted text-theme-accent"
      )}
      aria-hidden="true"
    >
      <User className="h-10 w-10" />
    </div>
  );
}

export function DialerStatusChip({
  status,
  isActive,
}: {
  status: string;
  isActive: boolean;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-theme border border-theme-border bg-theme-surface px-3 py-1.5 text-xs font-semibold text-theme-text"
    >
      <span
        className={clsx(
          "h-2 w-2 shrink-0 rounded-full",
          isActive ? "bg-theme-success" : "bg-theme-accent"
        )}
        aria-hidden="true"
      />
      <span>{status}</span>
    </span>
  );
}

export function DialerTimer({ seconds }: { seconds: number }) {
  return (
    <p
      className="font-mono text-4xl font-bold tracking-widest text-theme-success tabular-nums"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="sr-only">Call duration </span>
      {formatDuration(seconds)}
    </p>
  );
}

export function DialerConnectingHint() {
  return (
    <p className="text-sm font-medium text-theme-muted" role="status" aria-live="polite">
      Connecting…
    </p>
  );
}

const controlBase =
  "inline-flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-full border px-3 py-2 text-[10px] font-semibold transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring cursor-pointer";

export function DialerMuteSpeakerControls({
  muted,
  onMuteChange,
  speaker,
  onSpeakerChange,
}: {
  muted: boolean;
  onMuteChange: (muted: boolean) => void;
  speaker: boolean;
  onSpeakerChange: (speaker: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-8">
      <button
        type="button"
        onClick={() => onMuteChange(!muted)}
        aria-pressed={muted}
        aria-label={muted ? "Unmute microphone" : "Mute microphone"}
        className={clsx(
          controlBase,
          muted
            ? "border-theme-danger/40 bg-theme-danger/10 text-theme-danger"
            : "border-theme-border bg-theme-surface text-theme-text hover:bg-theme-card"
        )}
      >
        {muted ? (
          <MicOff className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Mic className="h-5 w-5" aria-hidden="true" />
        )}
        <span aria-hidden="true">{muted ? "Unmute" : "Mute"}</span>
      </button>

      <button
        type="button"
        onClick={() => onSpeakerChange(!speaker)}
        aria-pressed={speaker}
        aria-label={speaker ? "Turn speaker off" : "Turn speaker on"}
        className={clsx(
          controlBase,
          speaker
            ? "border-theme-accent/40 bg-theme-accent-muted text-theme-accent"
            : "border-theme-border bg-theme-surface text-theme-text hover:bg-theme-card"
        )}
      >
        <Volume2 className="h-5 w-5" aria-hidden="true" />
        <span aria-hidden="true">Speaker</span>
      </button>
    </div>
  );
}

export function DialerEndCallButton({ onEnd }: { onEnd: () => void }) {
  return (
    <button
      type="button"
      onClick={onEnd}
      aria-label="End call"
      className={
        "inline-flex h-16 w-16 items-center justify-center rounded-full border-0 " +
        "bg-theme-danger text-white shadow-md transition-opacity hover:opacity-90 " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring " +
        "focus-visible:ring-offset-2 focus-visible:ring-offset-theme-card cursor-pointer"
      }
    >
      <PhoneOff className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}

export function DialerContactBlock({
  name,
  phone,
  status,
  isActive,
  seconds,
}: {
  name: string;
  phone?: string | null;
  status: string;
  isActive: boolean;
  seconds: number;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-0.5">
      <DialerAvatar isActive={isActive} />
      <h4 className="type-card-title text-xl sm:text-2xl tracking-tight text-theme-text">
        {name}
      </h4>
      {phone ? (
        <p className="mt-1 font-mono text-sm font-medium text-theme-muted tabular-nums">
          {phone}
        </p>
      ) : null}
      <div className="mt-3">
        <DialerStatusChip status={status} isActive={isActive} />
      </div>
      <div className="mt-5 flex min-h-12 flex-col items-center justify-center">
        {isActive ? <DialerTimer seconds={seconds} /> : <DialerConnectingHint />}
      </div>
    </div>
  );
}
