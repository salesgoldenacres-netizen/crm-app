import { FormEvent } from "react";
import EmptyState from "@/shared/components/ui/EmptyState";
import { User, LeaveRequest } from "@/shared/types";
import { useToast } from "@/shared/components/Toast";
import { logger } from "@/shared/utils/logger";
import { leaveSchema } from "@/shared/validation/leaveSchema";

interface LeaveRequestsWidgetProps {
  user: User;
  users: User[];
  isManagerial: (role?: string) => boolean;
  submitLeaveRequest: (req: Omit<LeaveRequest, "id">) => Promise<void>;
  addNotification: (notif: {
    userId: string;
    message: string;
    type: "info" | "success" | "error";
  }) => Promise<void>;
  leaveRequests: LeaveRequest[];
}

function statusBadge(status: string): string {
  if (status === "approved") {
    return "bg-theme-success/15 text-theme-success border-theme-success/25";
  }
  if (status === "rejected") {
    return "bg-theme-danger/15 text-theme-danger border-theme-danger/25";
  }
  return "bg-theme-warning/15 text-theme-warning border-theme-warning/25";
}

export default function LeaveRequestsWidget({
  user,
  users,
  isManagerial,
  submitLeaveRequest,
  addNotification,
  leaveRequests,
}: LeaveRequestsWidgetProps) {
  const { toast } = useToast();
  const managerial = isManagerial(user.role);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const leaveType = (form.elements.namedItem("leaveType") as HTMLSelectElement).value;
    const startDate = (form.elements.namedItem("startDate") as HTMLInputElement).value;
    const endDate = (form.elements.namedItem("endDate") as HTMLInputElement).value;
    const reason = (form.elements.namedItem("reason") as HTMLInputElement).value;

    const parseResult = leaveSchema.safeParse({ leaveType, startDate, endDate, reason });
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join("\n");
      toast(errorMsg, "error");
      return;
    }

    try {
      await submitLeaveRequest({
        userId: user.id,
        username: user.username,
        leaveType,
        startDate,
        endDate,
        reason,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      const admins = users.filter((u) => isManagerial(u.role));
      for (const admin of admins) {
        await addNotification({
          userId: admin.id,
          message: `Leave Request: ${user.username} applied for ${leaveType} leave from ${startDate} to ${endDate}.`,
          type: "info",
        });
      }
      form.reset();
      toast("Leave request submitted for admin approval!", "success");
    } catch (err) {
      logger.error("LeaveRequestsWidget", "Failed to submit leave request", err);
      toast("Failed to submit leave request. Please try again.", "error");
    }
  };

  // Managers see pending team requests (read-only summary)
  if (managerial) {
    const pending = leaveRequests
      .filter((lr) => lr.status === "pending")
      .sort(
        (a, b) =>
          new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime()
      )
      .slice(0, 6);

    return (
      <div className="flex h-full w-full flex-col gap-widget-tight">
        <p className="type-label text-[10px] uppercase tracking-wider text-theme-muted">
          Pending approvals ({pending.length})
        </p>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {pending.map((lr) => {
            const agent =
              users.find((u) => u.id === lr.userId)?.username || lr.username || "Agent";
            return (
              <div
                key={lr.id}
                className="flex items-center justify-between gap-2 border-b border-theme-border pb-1.5 text-[10px] last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-theme-text">{agent}</p>
                  <p className="truncate capitalize text-theme-muted">
                    {lr.leaveType} · {lr.startDate} → {lr.endDate}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-theme border px-1.5 py-0.5 font-bold uppercase ${statusBadge(
                    lr.status
                  )}`}
                >
                  {lr.status}
                </span>
              </div>
            );
          })}
          {pending.length === 0 && (
            <EmptyState
              variant="compact"
              hideIcon
              title="No pending requests"
              description="Team leave applications will show here."
              className="border-0 bg-transparent py-2"
            />
          )}
        </div>
        <p className="type-secondary text-[9px] text-theme-muted">
          Manage approvals in Operations Desk → Attendance.
        </p>
      </div>
    );
  }

  const myRequests = leaveRequests
    .filter((lr) => lr.userId === user.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime()
    )
    .slice(0, 5);

  // Agents see submit form + their recent requests
  return (
    <div className="flex h-full w-full flex-col justify-between gap-widget">
      <form onSubmit={handleSubmit} className="space-y-2">
        <select
          name="leaveType"
          className="w-full rounded-theme border border-theme-border bg-theme-card p-1.5 text-[10px] font-semibold text-theme-text"
        >
          <option value="casual">Casual Leave</option>
          <option value="sick">Sick Leave</option>
          <option value="earned">Earned Leave</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            name="startDate"
            required
            className="rounded-theme border border-theme-border bg-theme-card p-1.5 text-[10px] text-theme-text"
          />
          <input
            type="date"
            name="endDate"
            required
            className="rounded-theme border border-theme-border bg-theme-card p-1.5 text-[10px] text-theme-text"
          />
        </div>
        <input
          type="text"
          name="reason"
          placeholder="Reason for leave..."
          required
          className="w-full rounded-theme border border-theme-border bg-theme-card p-1.5 text-[10px] text-theme-text"
        />
        <button
          type="submit"
          className="w-full cursor-pointer rounded-theme border-0 bg-theme-accent py-1.5 text-[10px] font-bold text-theme-accent-fg transition-colors hover:opacity-90"
        >
          Submit Leave Request
        </button>
      </form>

      <div className="max-h-[80px] space-y-1.5 overflow-y-auto">
        {myRequests.map((lr) => (
          <div
            key={lr.id}
            className="flex items-center justify-between border-b border-theme-border pb-1 text-[10px] last:border-0"
          >
            <span className="max-w-[120px] truncate text-theme-muted">
              {lr.startDate} → {lr.endDate}
            </span>
            <span
              className={`rounded-theme border px-1.5 py-0.5 font-bold uppercase ${statusBadge(
                lr.status
              )}`}
            >
              {lr.status}
            </span>
          </div>
        ))}
        {myRequests.length === 0 && (
          <EmptyState
            variant="compact"
            hideIcon
            title="No leave requests yet"
            description="Submitted requests will list here."
            className="border-0 bg-transparent py-1"
          />
        )}
      </div>
    </div>
  );
}
