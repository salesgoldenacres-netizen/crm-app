import EmptyState from "@/shared/components/ui/EmptyState";
import { Lead, User } from "@/shared/types";

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
  const myRecentCalls: RecentCall[] = [];
  leads.forEach((l) => {
    (l.callLogs || []).forEach((log) => {
      if (
        log.agent === user.username ||
        (log.agent && log.agent.startsWith(user.username))
      ) {
        myRecentCalls.push({
          leadName: l.name,
          leadId: l.id,
          ...log,
        });
      }
    });
  });

  myRecentCalls.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="flex h-full w-full flex-col justify-start gap-widget overflow-hidden">
      <div className="max-h-[220px] flex-1 space-y-2 overflow-y-auto pr-0.5">
        {myRecentCalls.slice(0, 10).map((call, idx) => (
          <div
            key={idx}
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
        {myRecentCalls.length === 0 && (
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
