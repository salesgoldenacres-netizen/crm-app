import {
  PhoneCall,
  PhoneOff,
  MicOff,
  Mic,
  Volume2,
  Phone,
  User,
} from "lucide-react";
import { formatDuration } from "@/shared/utils/dateUtils";
import { Lead } from "@/shared/types";

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
  return (
    <div className="card-premium p-4 space-y-4">
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden space-y-4">
        <div className="absolute inset-0 bg-radial-gradient from-[color-mix(in_srgb,var(--primary-color)_12%,transparent)] via-transparent to-transparent pointer-events-none" />
        <div className="flex justify-between items-center border-b border-slate-900 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
            <PhoneCall className="w-4 h-4 mr-1.5 text-amber-500 animate-pulse" />
            Simulated Dialer Portal
          </h3>
          {activeDialerLead && (
            <span className="animate-pulse bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase">
              Connected
            </span>
          )}
        </div>

        {activeDialerLead ? (
          <div className="space-y-4 py-2 animate-scaleUp">
            <div className="text-center">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-all duration-300 ${
                  dialerStatus === "Active Call"
                    ? "bg-green-500/20 border border-green-500/30 call-ring-pulse text-green-400"
                    : "bg-theme-accent/15 border border-theme-accent/30 animate-pulse text-theme-accent"
                }`}
              >
                <User className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black tracking-tight text-white">
                {activeDialerLead.name}
              </h4>
              <p className="text-slate-400 text-xs font-mono font-semibold mt-1">
                {activeDialerLead.phone}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
              <span className="text-amber-400 text-xs font-extrabold uppercase tracking-widest animate-pulse">
                {dialerStatus}
              </span>
              {dialerStatus === "Active Call" && (
                <>
                  <span className="text-3xl font-black text-white tracking-widest font-mono tabular-nums">
                    {formatDuration(dialerSeconds)}
                  </span>
                  {/* Waveform Visualization */}
                  <div className="flex items-center justify-center space-x-1.5 h-6 mt-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((bar) => {
                      const heights = [
                        "h-2",
                        "h-4",
                        "h-5",
                        "h-3",
                        "h-4",
                        "h-6",
                        "h-3",
                        "h-4",
                        "h-1",
                      ];
                      return (
                        <div
                          key={bar}
                          className={`w-1 bg-gradient-to-t from-green-500 to-emerald-400 rounded-full animate-bounce ${heights[bar % 9]}`}
                          style={{
                            animationDelay: `${bar * 0.08}s`,
                            animationDuration: "0.8s",
                          }}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Dialer Call Controls */}
            <div className="flex justify-center items-center space-x-6 pt-2">
              <button
                type="button"
                onClick={() => setDialerMuted(!dialerMuted)}
                className={`p-3.5 rounded-full border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                  dialerMuted
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                }`}
              >
                {dialerMuted ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                className="p-4.5 rounded-full bg-theme-danger hover:opacity-90 text-white cursor-pointer transition-all hover:scale-110 active:scale-90 shadow-lg shadow-rose-950/20 flex items-center justify-center border-0"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              <button
                type="button"
                onClick={() => setDialerSpeaker(!dialerSpeaker)}
                className={`p-3.5 rounded-full border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                  dialerSpeaker
                    ? "bg-theme-accent/15 text-theme-accent border-theme-accent/25"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                }`}
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 space-y-3">
            <p className="text-slate-400 text-xs font-semibold">
              Simulated caller is ready to dial.
            </p>
            <button
              type="button"
              onClick={() => handleStartCall(activeLead)}
              className="btn-premium-primary bg-brand-gradient border-0 shadow-md flex items-center justify-center mx-auto text-xs px-6 py-2.5"
            >
              <Phone className="w-4 h-4 mr-2" />
              Start Simulated Call
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
