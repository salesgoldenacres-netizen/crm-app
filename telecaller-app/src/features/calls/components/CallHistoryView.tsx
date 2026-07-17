import { Search, PhoneMissed, PhoneCall, CheckCircle, PhoneOff, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Lead, User, Project } from "@/shared/types";
import { safeFormatDateTime } from "@/shared/utils/dateUtils";
import CallRecordingPlayer from "@/shared/components/CallRecordingPlayer";

interface CallHistoryViewProps {
  user: User;
  leads: Lead[];
  projects: Record<string, Project>;
  callHistoryStats: {
    totalOutbound: number;
    connectedCount: number;
    rnrCount: number;
    busyCount: number;
    switchedOffCount: number;
    missedCount: number;
  };
  filteredLogs: any[];
  pendingCallbacks: { lead: Lead; missedCall: any }[];
  callHistorySearchQuery: string;
  setCallHistorySearchQuery: (val: string) => void;
  startCall: (lead: Lead) => void;
  onOpenCallLogModal: (lead: Lead) => void;
  renderMessageContent: (note: string, isMe: boolean, noteId: string) => ReactNode;
}

export default function CallHistoryView({
  user: _user,
  leads: _leads,
  projects: _projects,
  callHistoryStats,
  filteredLogs,
  pendingCallbacks,
  callHistorySearchQuery,
  setCallHistorySearchQuery,
  startCall,
  onOpenCallLogModal,
  renderMessageContent,
}: CallHistoryViewProps) {
  const {
    totalOutbound,
    connectedCount,
    rnrCount,
    busyCount,
    switchedOffCount,
    missedCount,
  } = callHistoryStats;

  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case "raw":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "new":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "contacted":
        return "bg-gray-100 text-gray-800 bg-theme-card dark:text-gray-300 border-theme-border";
      case "interested":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      case "reserved":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "booked":
        return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800";
      case "not-interested":
        return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800";
      default:
        return "bg-gray-100 text-gray-800 bg-theme-card dark:text-gray-300 border-theme-border";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 rounded-xl border border-theme-border bg-theme-card px-3 py-2.5">
        <div className="min-w-0">
          <h1 className="text-sm font-black text-theme-text tracking-tight leading-tight">
            Call History
          </h1>
          <p className="text-[10px] text-theme-muted mt-0.5 leading-snug">
            Chronological log of all client interactions and call reports.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-theme-muted" />
          </div>
          <input
            type="text"
            className="block w-full pl-8 pr-2.5 h-8 border border-theme-border bg-theme-surface text-theme-text rounded-lg text-[11px] font-semibold outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-ring/20 transition-colors"
            placeholder="Search logs by name, phone, notes..."
            value={callHistorySearchQuery}
            onChange={(e) => setCallHistorySearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Pending Callbacks Queue */}
      {pendingCallbacks.length > 0 && (
        <div className="bg-rose-50/50 dark:bg-rose-950/15 border border-rose-200/60 dark:border-rose-900/40 p-4 rounded-xl shadow-sm mb-6 animate-fadeIn">
          <div className="flex items-center justify-between mb-3 border-b border-rose-100 dark:border-rose-900/30 pb-2">
            <h3 className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
              <PhoneMissed className="w-4 h-4 animate-bounce text-rose-500" />
              Pending Callbacks ({pendingCallbacks.length})
            </h3>
            <span className="text-[10px] text-rose-500 font-bold uppercase">
              Awaiting Outbound Callback
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingCallbacks.map(({ lead, missedCall }) => (
              <div
                key={lead.id}
                className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-rose-100 dark:border-rose-900/80 shadow-xs flex items-center justify-between gap-3 hover:border-rose-300 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-theme-text dark:text-white truncate">
                    {lead.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-semibold">
                    {lead.phone}
                  </p>
                  <p className="text-[9px] text-rose-500/80 dark:text-rose-400 mt-1 font-black">
                    Missed: {safeFormatDateTime(missedCall.date, false)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startCall(lead)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[11px] font-bold rounded-md shadow-xs flex items-center gap-1 cursor-pointer transition-all shrink-0 border border-rose-500/20"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Call Back</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call Analytics cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 animate-fadeIn">
        {/* Outbound Calls Card */}
        <div className="bg-theme-card p-4 rounded-xl border border-theme-border shadow-sm flex items-center space-x-3 transition-all hover:shadow-md hover:scale-[1.02]">
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider block">
              Total Outbound
            </span>
            <span className="text-xl font-bold text-theme-text mt-0.5 block">
              {totalOutbound}
            </span>
          </div>
        </div>

        {/* Connected Calls Card */}
        <div className="bg-theme-card p-4 rounded-xl border border-theme-border shadow-sm flex items-center space-x-3 transition-all hover:shadow-md hover:scale-[1.02]">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider block">
              Connected
            </span>
            <span className="text-xl font-bold text-theme-text mt-0.5 block">
              {connectedCount}
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 ml-1.5">
                ({totalOutbound > 0 ? Math.round((connectedCount / totalOutbound) * 100) : 0}%)
              </span>
            </span>
          </div>
        </div>

        {/* RNR (Ringing No Response) Card */}
        <div className="bg-theme-card p-4 rounded-xl border border-theme-border shadow-sm flex items-center space-x-3 transition-all hover:shadow-md hover:scale-[1.02]">
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
            <PhoneOff className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider block">
              RNR (No Answer)
            </span>
            <span className="text-xl font-bold text-theme-text mt-0.5 block">
              {rnrCount}
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 ml-1.5">
                ({totalOutbound > 0 ? Math.round((rnrCount / totalOutbound) * 100) : 0}%)
              </span>
            </span>
          </div>
        </div>

        {/* Switched Off / Busy Card */}
        <div className="bg-theme-card p-4 rounded-xl border border-theme-border shadow-sm flex items-center space-x-3 transition-all hover:shadow-md hover:scale-[1.02]">
          <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-theme-muted">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider block">
              Busy / Off
            </span>
            <span className="text-xl font-bold text-theme-text mt-0.5 block">
              {busyCount + switchedOffCount}
              <span className="text-[10px] font-semibold text-gray-500 ml-1.5">
                ({totalOutbound > 0 ? Math.round(((busyCount + switchedOffCount) / totalOutbound) * 100) : 0}%)
              </span>
            </span>
          </div>
        </div>

        {/* Missed Calls Card */}
        <div className="bg-theme-card p-4 rounded-xl border border-theme-border shadow-sm flex items-center space-x-3 transition-all hover:shadow-md hover:scale-[1.02]">
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
            <PhoneMissed className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider block">
              Inbound Missed
            </span>
            <span className="text-xl font-bold text-theme-text mt-0.5 block">
              {missedCount}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-theme-card rounded-xl shadow-md border border-theme-border overflow-hidden">
        {filteredLogs.length > 0 ? (
          <div className="divide-y divide-theme-border max-h-[600px] overflow-y-auto animate-fadeIn animate-duration-300">
            {filteredLogs.map((log: any, idx: number) => {
              const isWhatsApp = log.note && (log.note.includes("[WhatsApp") || log.note.includes("[WhatsApp Sent]"));
              return (
                <div
                  key={idx}
                  className="p-4 hover:bg-theme-surface dark:hover:bg-theme-surface/30 transition-colors flex flex-col sm:flex-row justify-between items-center gap-3"
                >
                  <div className="space-y-1 w-full sm:w-3/4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenCallLogModal) onOpenCallLogModal(log.leadObj);
                        }}
                        className="font-bold text-theme-text text-sm hover:text-theme-accent dark:hover:text-indigo-400 hover:underline text-left cursor-pointer bg-transparent border-0"
                      >
                        {log.leadName}
                      </button>
                      <span className="text-xs text-theme-muted font-bold">({log.leadPhone})</span>
                      <span
                        className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase ${
                          isWhatsApp
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400"
                        }`}
                      >
                        {isWhatsApp ? "💬 WhatsApp" : "📞 Call"}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border ${getLeadStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30 p-2.5 rounded-lg border border-theme-border/50 mt-1 whitespace-pre-line leading-relaxed w-full font-medium">
                      {renderMessageContent(log.note, log.agent !== "Customer", "history-" + idx)}
                    </div>
                    {(() => {
                      const durationMatch = log.note?.match(/\[Call Log - Duration:\s*([0-9:]+)\]/);
                      if (durationMatch) {
                        return (
                          <div className="mt-1.5">
                            <CallRecordingPlayer duration={durationMatch[1]} />
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="text-right flex flex-col items-end shrink-0 text-[10px] text-theme-muted gap-0.5 font-bold">
                    <span className="font-extrabold text-gray-600 dark:text-theme-muted capitalize">Logged by: {log.agent}</span>
                    <span>{safeFormatDateTime(log.date)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 bg-slate-50 dark:bg-slate-900/10">
            <PhoneCall className="w-12 h-12 mx-auto mb-3 opacity-30 text-theme-muted animate-pulse" />
            <p className="font-bold text-lg text-slate-800 dark:text-white">No matching call logs</p>
            <p className="text-sm mt-1">Try adjusting your search terms or verify log data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
