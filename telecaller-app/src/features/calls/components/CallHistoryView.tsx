import { Search, PhoneMissed, PhoneCall, CheckCircle, PhoneOff, Zap, Phone, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Lead, User, Project } from "@/shared/types";
import { safeFormatDateTime } from "@/shared/utils/dateUtils";
import CallRecordingPlayer from "@/shared/components/CallRecordingPlayer";
import Badge from "@/shared/components/ui/Badge";
import EmptyState from "@/shared/components/ui/EmptyState";
import { getLeadStatusBadgeVariant } from "@/features/leads/utils/leadColors";

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

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 rounded-theme border border-theme-border bg-theme-card px-3 py-2.5">
        <div className="min-w-0">
          <h1 className="type-card-title text-theme-text tracking-tight leading-tight">
            Call History
          </h1>
          <p className="text-[10px] text-theme-muted mt-0.5 leading-snug">
            Chronological log of all client interactions and call reports.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-theme-muted" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full pl-8 pr-2.5 h-8 border border-theme-border bg-theme-surface text-theme-text rounded-theme text-[11px] font-semibold outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-ring/20 transition-colors"
            placeholder="Search logs by name, phone, notes..."
            value={callHistorySearchQuery}
            onChange={(e) => setCallHistorySearchQuery(e.target.value)}
            aria-label="Search call logs"
          />
        </div>
      </div>

      {pendingCallbacks.length > 0 && (
        <div className="bg-theme-danger/10 border border-theme-danger/20 p-4 rounded-theme shadow-sm mb-6 animate-fadeIn">
          <div className="flex items-center justify-between mb-3 border-b border-theme-danger/20 pb-2">
            <h3 className="text-xs font-bold text-theme-danger uppercase tracking-widest flex items-center gap-1.5">
              <PhoneMissed className="w-4 h-4 text-theme-danger" aria-hidden="true" />
              Pending Callbacks ({pendingCallbacks.length})
            </h3>
            <span className="text-[10px] text-theme-danger font-bold uppercase">
              Awaiting Outbound Callback
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingCallbacks.map(({ lead, missedCall }) => (
              <div
                key={lead.id}
                className="bg-theme-card p-3 rounded-theme border border-theme-danger/20 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-theme-text truncate">
                    {lead.name}
                  </p>
                  <p className="text-[10px] text-theme-muted truncate mt-0.5 font-semibold">
                    {lead.phone}
                  </p>
                  <p className="text-[9px] text-theme-danger mt-1 font-bold">
                    Missed: {safeFormatDateTime(missedCall.date, false)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startCall(lead)}
                  className="px-3 py-1.5 min-h-11 sm:min-h-0 bg-theme-danger hover:opacity-90 text-white text-[11px] font-bold rounded-theme shadow-xs flex items-center gap-1 cursor-pointer transition-all shrink-0 border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                >
                  <PhoneCall className="w-3 h-3" aria-hidden="true" />
                  <span>Call Back</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 animate-fadeIn">
        <div className="bg-theme-card p-4 rounded-theme border border-theme-border shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-theme bg-theme-accent-muted text-theme-accent">
            <PhoneCall className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <span className="type-label text-theme-muted block">
              Total Outbound
            </span>
            <span className="type-kpi text-theme-text mt-0.5 block">
              {totalOutbound}
            </span>
          </div>
        </div>

        <div className="bg-theme-card p-4 rounded-theme border border-theme-border shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-theme bg-theme-success/10 text-theme-success">
            <CheckCircle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <span className="type-label text-theme-muted block">
              Connected
            </span>
            <span className="type-kpi text-theme-text mt-0.5 block">
              {connectedCount}
              <span className="text-[10px] font-semibold text-theme-success ml-1.5">
                ({totalOutbound > 0 ? Math.round((connectedCount / totalOutbound) * 100) : 0}%)
              </span>
            </span>
          </div>
        </div>

        <div className="bg-theme-card p-4 rounded-theme border border-theme-border shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-theme bg-theme-warning/10 text-theme-warning">
            <PhoneOff className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <span className="type-label text-theme-muted block">
              RNR (No Answer)
            </span>
            <span className="type-kpi text-theme-text mt-0.5 block">
              {rnrCount}
              <span className="text-[10px] font-semibold text-theme-warning ml-1.5">
                ({totalOutbound > 0 ? Math.round((rnrCount / totalOutbound) * 100) : 0}%)
              </span>
            </span>
          </div>
        </div>

        <div className="bg-theme-card p-4 rounded-theme border border-theme-border shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-theme bg-theme-surface text-theme-muted">
            <Zap className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <span className="type-label text-theme-muted block">
              Busy / Off
            </span>
            <span className="type-kpi text-theme-text mt-0.5 block">
              {busyCount + switchedOffCount}
              <span className="text-[10px] font-semibold text-theme-muted ml-1.5">
                ({totalOutbound > 0 ? Math.round(((busyCount + switchedOffCount) / totalOutbound) * 100) : 0}%)
              </span>
            </span>
          </div>
        </div>

        <div className="bg-theme-card p-4 rounded-theme border border-theme-border shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-theme bg-theme-danger/10 text-theme-danger">
            <PhoneMissed className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <span className="type-label text-theme-muted block">
              Inbound Missed
            </span>
            <span className="type-kpi text-theme-text mt-0.5 block">
              {missedCount}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-theme-card rounded-theme shadow-md border border-theme-border overflow-hidden">
        {filteredLogs.length > 0 ? (
          <div className="divide-y divide-theme-border max-h-[600px] overflow-y-auto animate-fadeIn">
            {filteredLogs.map((log: any, idx: number) => {
              const isWhatsApp = log.note && (log.note.includes("[WhatsApp") || log.note.includes("[WhatsApp Sent]"));
              return (
                <div
                  key={idx}
                  className="p-4 hover:bg-theme-surface transition-colors flex flex-col sm:flex-row justify-between items-center gap-3"
                >
                  <div className="space-y-1 w-full sm:w-3/4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenCallLogModal) onOpenCallLogModal(log.leadObj);
                        }}
                        className="font-semibold text-theme-text text-sm hover:text-theme-accent hover:underline text-left cursor-pointer bg-transparent border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
                      >
                        {log.leadName}
                      </button>
                      <span className="text-xs text-theme-muted font-semibold">({log.leadPhone})</span>
                      <Badge
                        variant={isWhatsApp ? "success" : "primary"}
                        className="gap-1 normal-case tracking-wide"
                      >
                        {isWhatsApp ? (
                          <MessageCircle className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <Phone className="w-3 h-3" aria-hidden="true" />
                        )}
                        {isWhatsApp ? "WhatsApp" : "Call"}
                      </Badge>
                      <Badge
                        variant={getLeadStatusBadgeVariant(log.status)}
                        className="normal-case tracking-wide"
                      >
                        {log.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-theme-text bg-theme-surface p-2.5 rounded-theme border border-theme-border mt-1 whitespace-pre-line leading-relaxed w-full font-medium">
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
                  <div className="text-right flex flex-col items-end shrink-0 text-[10px] text-theme-muted gap-0.5 font-semibold">
                    <span className="capitalize">Logged by: {log.agent}</span>
                    <span>{safeFormatDateTime(log.date)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No matching call logs"
            description="Try adjusting your search terms or verify log data."
            icon={<PhoneCall className="w-8 h-8" aria-hidden="true" />}
            className="max-w-none border-0 shadow-none rounded-none"
          />
        )}
      </div>
    </div>
  );
}
