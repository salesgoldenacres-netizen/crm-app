import { useState, useEffect } from "react";
import EmptyState from "@/shared/components/ui/EmptyState";
import { CallLogsRepository } from "@/shared/services/firebase/CallLogsRepository";
import { AGENT_OPEN_LEADS_REALTIME_BOUND } from "@/shared/services/leads/leadQueryConstants";
import { Lead, User, CallLogDocument } from "@/shared/types";

interface RecentCall {
  leadName: string;
  leadId: string;
  date: string;
  status: string;
  agent: string;
  note: string;
  duration?: number;
}

interface CallLogsWidgetProps {
  leads: Lead[];
  user: User;
  setActiveLead: (id: string) => void;
  safeFormatTime: (dateVal: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => string;
}

const RECENT_CALLS_LIMIT = 10;
const CALL_LOGS_PAGE_SIZE = 20;

function agentMatchesLog(log: CallLogDocument, user: User): boolean {
  const agent = log.agent;
  if (!agent) return false;
  return agent === user.username || agent.startsWith(user.username);
}

function statusChipClass(status: string): string {
  if (status === "booked") {
    return "bg-theme-success/15 text-theme-success border-theme-success/25";
  }
  if (status === "site-visit-completed") {
    return "bg-theme-accent-muted text-theme-accent border-theme-accent/25";
  }
  if (status === "interested") {
    return "bg-theme-warning/15 text-theme-warning border-theme-warning/25";
  }
  return "bg-theme-surface text-theme-muted border-theme-border";
}

export default function CallLogsWidget({ leads, user, setActiveLead, safeFormatTime }: CallLogsWidgetProps) {
  const [myRecentCalls, setMyRecentCalls] = useState<RecentCall[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Phase C dual-read: top-level callLogs + embedded fallback per bounded open lead.
  useEffect(() => {
    let cancelled = false;
    const leadsToScan = leads.slice(0, AGENT_OPEN_LEADS_REALTIME_BOUND);

    async function loadRecentCalls() {
      setLoaded(false);
      try {
        const batches = await Promise.all(
          leadsToScan.map(async (lead) => {
            const logs = await CallLogsRepository.listByLeadIdWithFallback(lead, {
              pageSize: CALL_LOGS_PAGE_SIZE,
            });
            return logs
              .filter((log) => agentMatchesLog(log, user))
              .map((log) => ({
                leadName: lead.name,
                leadId: lead.id,
                date: log.date,
                status: log.status,
                agent: log.agent ?? "",
                note: log.note ?? "",
                duration: log.duration,
              }));
          })
        );

        if (cancelled) return;

        const sorted = batches
          .flat()
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, RECENT_CALLS_LIMIT);

        setMyRecentCalls(sorted);
      } catch {
        if (!cancelled) setMyRecentCalls([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    void loadRecentCalls();
    return () => {
      cancelled = true;
    };
  }, [leads, user]);

  return (
    <div className="flex h-full w-full flex-col justify-start gap-widget overflow-hidden">
      <div className="max-h-[220px] flex-1 space-y-2 overflow-y-auto pr-0.5">
        {myRecentCalls.map((call) => (
          <div
            key={`${call.leadId}-${call.date}-${call.status}`}
            className="flex items-start justify-between border-b border-theme-border pb-2 text-[11px] last:border-0 last:pb-0"
          >
            <div className="min-w-0 flex-1 pr-3">
              <p className="truncate font-semibold text-theme-text">
                Logged call for{" "}
                <span
                  onClick={() => setActiveLead(call.leadId)}
                  className="cursor-pointer font-bold text-theme-accent hover:underline"
                >
                  {call.leadName}
                </span>
              </p>
              <p
                className="type-secondary mt-0.5 truncate text-[10px] text-theme-muted"
                title={call.note}
              >
                {call.note}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end space-y-1 text-right">
              <span className="type-secondary text-[9px] font-semibold text-theme-muted">
                {safeFormatTime(call.date, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span
                className={`rounded-theme border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${statusChipClass(
                  call.status
                )}`}
              >
                {call.status}
              </span>
            </div>
          </div>
        ))}
        {loaded && myRecentCalls.length === 0 && (
          <EmptyState
            variant="compact"
            preset="activity"
            hideIcon
            title="No recent calls"
            description="Logged calls will show up in this timeline."
            className="border-0 bg-transparent py-6"
          />
        )}
      </div>
    </div>
  );
}
