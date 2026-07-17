import { MicOff, Mic, Volume2, PhoneOff, User } from "lucide-react";
import { formatDuration } from "@/shared/utils/dateUtils";
import { Lead } from "@/shared/types";

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
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-55 p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center justify-between p-8 min-h-[480px] relative animate-scaleUp">
        {/* Top decorative element */}
        <div className="w-12 h-1.5 bg-slate-800 rounded-full mb-6"></div>

        {/* Calling Details */}
        <div className="text-center space-y-2 mt-4 flex-1 flex flex-col justify-start">
          <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <User className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight">
            {activeDialerLead.name}
          </h3>
          <p className="text-slate-400 text-sm font-medium">
            {activeDialerLead.phone}
          </p>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-xs font-semibold text-indigo-400 mt-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span>{dialerStatus}</span>
          </div>
        </div>

        {/* Animation / Timer Section */}
        <div className="w-full flex flex-col items-center my-6 space-y-4">
          {dialerStatus === "Active Call" ? (
            <>
              {/* Digital Clock */}
              <div className="text-4xl font-mono font-bold text-green-400 drop-shadow-md tracking-widest animate-pulse">
                {formatDuration(dialerSeconds * 1000)}
              </div>
              {/* Waveform Visualization */}
              <div className="flex items-center justify-center space-x-1.5 h-10 px-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((bar) => {
                  const heights = [
                    "h-3",
                    "h-6",
                    "h-8",
                    "h-5",
                    "h-7",
                    "h-9",
                    "h-4",
                    "h-6",
                    "h-2",
                  ];
                  return (
                    <div
                      key={bar}
                      className={`w-1.5 bg-gradient-to-t from-green-500 to-emerald-400 rounded-full animate-bounce ${heights[bar % 9]}`}
                      style={{
                        animationDelay: `${bar * 0.1}s`,
                        animationDuration: "0.8s",
                      }}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-16 flex items-center justify-center">
              <div className="flex space-x-2">
                <div
                  className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.3s" }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Dialer Call Controls */}
        <div className="w-full space-y-8 mt-auto">
          <div className="flex items-center justify-center space-x-10">
            {/* Mute Button */}
            <button
              type="button"
              onClick={() => setDialerMuted(!dialerMuted)}
              className={`p-3 rounded-full border transition-all cursor-pointer ${
                dialerMuted
                  ? "bg-red-500/20 border-red-500 text-red-400"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {dialerMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            {/* Speaker Button */}
            <button
              type="button"
              onClick={() => setDialerSpeaker(!dialerSpeaker)}
              className={`p-3 rounded-full border transition-all cursor-pointer ${
                dialerSpeaker
                  ? "bg-indigo-500/20 border-indigo-500 text-indigo-400"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          {/* End Call Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleEndCall}
              className="w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-red-900/50 transition-all transform hover:scale-105 active:scale-95 cursor-pointer border-0"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
