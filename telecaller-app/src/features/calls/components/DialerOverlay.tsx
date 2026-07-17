import {
  User,
  MicOff,
  Mic,
  Volume2,
  PhoneOff,
  PhoneCall,
  Phone,
} from "lucide-react";
import { formatDuration } from "@/shared/utils/dateUtils";
import { Lead, Project } from "@/shared/types";

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
  return (
    <>
      {/* SIMULATED DIALER OVERLAY */}
      {activeDialerLead && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center z-55 p-0 sm:p-4 animate-fadeIn">
          <div className="bg-slate-900 border-t sm:border border-slate-800 sm:border-slate-800 text-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden flex flex-col items-center justify-between p-8 min-h-[440px] sm:min-h-[480px] relative animate-bottomSheet sm:animate-scaleUp">
            {/* Top decorative element */}
            <div className="w-12 h-1.5 bg-slate-800 rounded-full mb-6"></div>

            {/* Calling Details */}
            <div className="text-center space-y-2 mt-4 flex-1 flex flex-col justify-start">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
                  dialerStatus === "Active Call"
                    ? "bg-green-500/20 border border-green-500/30 call-ring-pulse text-green-400"
                    : "bg-indigo-500/10 border border-indigo-500/30 animate-pulse text-indigo-400"
                }`}
              >
                <User className="w-10 h-10" />
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
                    {formatDuration(dialerSeconds)}
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
                  className="w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-red-900/50 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INCOMING IVR CALL RINGING OVERLAY */}
      {activeIvrCall && activeIvrCall.status === "ringing" && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-55 p-4 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-indigo-500 text-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-6 animate-scaleUp">
            {/* Flashing Ringing Banner Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 animate-pulse"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 animate-pulse">
                  Incoming IVR Call
                </span>
              </div>
              {ivrSettings?.ivrVirtualNumber && (
                <span className="text-[10px] bg-slate-800 px-2.5 py-1 rounded-full text-slate-400 font-mono">
                  via {ivrSettings.ivrVirtualNumber}
                </span>
              )}
            </div>

            {/* Caller Information */}
            <div className="py-6 flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center animate-bounce">
                <PhoneCall className="w-8 h-8 text-red-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">
                  {matchedIvrLead
                    ? matchedIvrLead.name
                    : activeIvrCall.callerName}
                </h3>
                <p className="text-slate-400 font-mono text-sm">
                  {activeIvrCall.callerPhone}
                </p>
              </div>

              {matchedIvrLead && (
                <div className="w-full bg-slate-800/50 border border-slate-800 rounded-xl p-3.5 mt-2 text-left space-y-2 text-xs">
                  <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    Lead Context
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Project:</span>
                    <span className="font-semibold text-slate-200">
                      {projects[matchedIvrLead.projectId || ""]?.name || "N/A"}
                    </span>
                  </div>
                  {matchedIvrLead.plotId && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Plot Interest:</span>
                      <span className="font-semibold text-slate-200">
                        Plot {matchedIvrLead.plotId}
                      </span>
                    </div>
                  )}
                  {matchedIvrLead.status && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Status:</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 capitalize">
                        {matchedIvrLead.status}
                      </span>
                    </div>
                  )}
                  {matchedIvrLead.notes && (
                    <div className="pt-1.5 border-t border-slate-800/60 mt-1">
                      <span className="text-slate-500 block mb-0.5">
                        Notes Summary:
                      </span>
                      <span className="text-slate-300 italic block line-clamp-2 leading-relaxed">
                        "{matchedIvrLead.notes}"
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Answer / Decline Actions */}
            <div className="flex items-center space-x-3 mt-4">
              <button
                type="button"
                onClick={async () => {
                  await clearActiveIvrCall();
                }}
                className="flex-1 py-3 text-center text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700/80 rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                Decline
              </button>

              <button
                type="button"
                onClick={handleAnswerIvrCall}
                className="flex-2 py-3 text-center text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-900/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Phone className="w-4 h-4 text-white fill-current" />
                <span>Answer & Open Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
