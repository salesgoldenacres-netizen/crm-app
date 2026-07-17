// React import removed – JSX transform handles it
import { AuditLog } from "@/shared/types";
import DataTable, { ColumnDef } from "@/shared/components/DataTable";
import Badge from "@/shared/components/ui/Badge";

interface AuditSettingsTabProps {
  auditLogs: AuditLog[];
  safeFormatDateTime: (dateStr: string) => string;
}

export default function AuditSettingsTab({
  auditLogs,
  safeFormatDateTime,
}: AuditSettingsTabProps) {
  const columns: ColumnDef<AuditLog>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      sortable: true,
      className: "text-theme-muted text-xs",
      render: (log) => safeFormatDateTime(log.timestamp),
    },
    {
      key: "user",
      header: "User / Agent",
      sortable: true,
      render: (log) => <Badge variant="primary">{log.user}</Badge>,
    },
    {
      key: "action",
      header: "Action Event",
      sortable: true,
      className: "font-semibold text-theme-text text-xs",
      render: (log) => log.action,
    },
    {
      key: "details",
      header: "Event Details",
      className: "text-theme-muted whitespace-pre-line leading-relaxed text-xs",
      render: (log) => log.details,
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn text-sm">
      <div className="bg-theme-card rounded-theme shadow-elevation-sm overflow-hidden transition-colors border border-theme-border p-6 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-theme-border">
          <span className="font-semibold text-theme-text">
            Active Logs Tracked ({auditLogs.length})
          </span>
          <span className="text-[10px] text-theme-muted font-medium">
            Capture logins, updates, allocations, and Webhook simulated leads
          </span>
        </div>

        <DataTable
          data={auditLogs}
          columns={columns}
          pageSize={20}
          emptyMessage="No audit log entries logged yet."
        />
      </div>
    </div>
  );
}
