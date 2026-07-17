import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { LeaveRequest, User } from "@/shared/types";
import DataTable, { ColumnDef } from "@/shared/components/DataTable";
import Badge from "@/shared/components/ui/Badge";
import Button from "@/shared/components/ui/Button";

interface LeaveRequestsManagementProps {
  leaveRequests: LeaveRequest[];
  users: User[];
  updateLeaveStatus: (id: string, status: LeaveRequest["status"]) => Promise<void>;
  logAuditEvent: (event: any) => Promise<void>;
  user: User;
  safeFormatDateTime: (dateStr?: string, showTime?: boolean) => string;
}

export default function LeaveRequestsManagement({
  leaveRequests,
  users,
  updateLeaveStatus,
  logAuditEvent,
  user,
  safeFormatDateTime,
}: LeaveRequestsManagementProps) {
  const [leaveFilter, setLeaveFilter] = useState("all");

  const pendingLeaves = leaveRequests.filter((lr: any) => lr.status === "pending");

  // Filter and sort raw data for DataTable consumption
  const filteredData = leaveRequests
    .filter((lr: any) => leaveFilter === "all" || lr.status === leaveFilter)
    .map((lr: any) => {
      const agentUser = users.find((u) => u.id === lr.userId);
      return {
        ...lr,
        agentName: agentUser?.username || lr.username || "Unknown",
        agentUser,
      };
    });

  const columns: ColumnDef<any>[] = [
    {
      key: "agentName",
      header: "Agent",
      sortable: true,
      className: "font-semibold text-theme-text",
    },
    {
      key: "leaveType",
      header: "Leave Type",
      sortable: true,
      render: (lr) => {
        const leaveTypeVariant: Record<string, "danger" | "info" | "primary"> = {
          sick: "danger",
          casual: "info",
          earned: "primary",
        };
        return (
          <Badge variant={leaveTypeVariant[lr.leaveType] || "default"}>
            {lr.leaveType || "casual"}
          </Badge>
        );
      },
    },
    {
      key: "startDate",
      header: "From",
      sortable: true,
      render: (lr) => (lr.startDate ? safeFormatDateTime(lr.startDate, false) : "—"),
    },
    {
      key: "endDate",
      header: "To",
      sortable: true,
      render: (lr) => (lr.endDate ? safeFormatDateTime(lr.endDate, false) : "—"),
    },
    {
      key: "reason",
      header: "Reason",
      className: "max-w-[200px] truncate italic text-theme-muted",
      render: (lr) => `"${lr.reason || "No reason provided"}"`,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      headerClassName: "text-center",
      className: "text-center",
      render: (lr) => {
        const statusColors: Record<string, "warning" | "success" | "danger"> = {
          pending: "warning",
          approved: "success",
          rejected: "danger",
        };
        return (
          <Badge variant={statusColors[lr.status] || "warning"}>
            {lr.status}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      render: (lr) => {
        if (lr.status === "pending") {
          return (
            <div className="flex justify-end space-x-2">
              <Button
                variant="success"
                size="sm"
                onClick={async () => {
                  await updateLeaveStatus(lr.id, "approved");
                  await logAuditEvent({
                    action: "Approve Leave Request",
                    details: `Approved ${lr.leaveType} leave for ${
                      lr.agentName
                    } from ${lr.startDate} to ${lr.endDate}`,
                    user: user.username,
                  });
                }}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  await updateLeaveStatus(lr.id, "rejected");
                  await logAuditEvent({
                    action: "Reject Leave Request",
                    details: `Rejected ${lr.leaveType} leave for ${
                      lr.agentName
                    } from ${lr.startDate} to ${lr.endDate}`,
                    user: user.username,
                  });
                }}
              >
                Reject
              </Button>
            </div>
          );
        }
        return <span className="text-xs text-theme-muted italic">Processed</span>;
      },
    },
  ];

  return (
    <div className="bg-theme-card rounded-theme shadow-elevation-sm border border-theme-border overflow-hidden">
      <div className="px-6 py-4 border-b border-theme-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="font-semibold text-theme-text flex items-center">
          <ShieldCheck className="w-5 h-5 mr-2 text-theme-accent" />
          Leave Requests Management
          {pendingLeaves.length > 0 && (
            <Badge variant="danger" className="ml-2">
              {pendingLeaves.length} pending
            </Badge>
          )}
        </h3>
        <div className="flex items-center space-x-2">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setLeaveFilter(f)}
              className={`px-3 py-1 rounded-theme text-[10px] font-semibold uppercase tracking-wider border cursor-pointer transition-colors ${
                leaveFilter === f
                  ? "bg-theme-accent text-theme-accent-fg border-theme-accent"
                  : "bg-theme-card text-theme-muted border-theme-border hover:bg-theme-surface"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <DataTable
          columns={columns}
          data={filteredData}
          pageSize={10}
          defaultSort={{ key: "createdAt", direction: "desc" }}
          emptyMessage="No leave requests found."
        />
      </div>
    </div>
  );
}
