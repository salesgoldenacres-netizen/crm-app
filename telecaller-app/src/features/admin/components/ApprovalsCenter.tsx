import { Inbox, Check, X } from "lucide-react";
import { Lead, LeaveRequest } from "@/shared/types";

interface ApprovalsCenterProps {
  pendingDiscounts: Lead[];
  pendingLeaves: LeaveRequest[];
  handleApproveDiscount: (id: string, name: string, discountRequest: any) => void;
  handleRejectDiscount: (id: string, name: string, discountRequest: any) => void;
  updateLeaveStatus: (id: string, status: "approved" | "rejected") => void;
}

export default function ApprovalsCenter({
  pendingDiscounts,
  pendingLeaves,
  handleApproveDiscount,
  handleRejectDiscount,
  updateLeaveStatus,
}: ApprovalsCenterProps) {
  const pendingTotal = pendingLeaves.length + pendingDiscounts.length;

  return (
    <div className="rounded-xl border border-theme-border bg-theme-card p-3 flex flex-col gap-2.5">
      <div className="border-b border-theme-border pb-2 flex justify-between items-center">
        <h2 className="text-xs font-bold text-theme-text flex items-center gap-1.5">
          <Inbox className="w-3.5 h-3.5 text-theme-accent" />
          Approvals
        </h2>
        <span className="text-[9px] font-bold text-theme-muted tabular-nums">
          {pendingTotal} pending
        </span>
      </div>

      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-0.5 scrollbar-thin">
        {pendingDiscounts.map((l) => (
          <div
            key={l.id}
            className="p-2.5 bg-theme-warning/10 border border-theme-warning/25 rounded-lg space-y-1.5 text-[11px]"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <span className="font-bold text-theme-warning text-[9px] uppercase tracking-wide">
                  Discount
                </span>
                <h4 className="font-bold text-theme-text truncate">{l.name}</h4>
              </div>
              <span className="font-bold text-theme-accent text-xs shrink-0">
                {l.discountRequest?.requestedAmt}
              </span>
            </div>
            <p className="text-theme-muted italic line-clamp-2">
              &ldquo;{l.discountRequest?.justification}&rdquo;
            </p>
            <div className="flex gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() =>
                  handleApproveDiscount(l.id, l.name, l.discountRequest)
                }
                className="flex-1 h-7 bg-theme-success text-white text-[10px] font-bold rounded-md inline-flex items-center justify-center gap-1 cursor-pointer border-0"
              >
                <Check className="w-3 h-3" /> Approve
              </button>
              <button
                type="button"
                onClick={() =>
                  handleRejectDiscount(l.id, l.name, l.discountRequest)
                }
                className="flex-1 h-7 bg-theme-danger text-white text-[10px] font-bold rounded-md inline-flex items-center justify-center gap-1 cursor-pointer border-0"
              >
                <X className="w-3 h-3" /> Reject
              </button>
            </div>
          </div>
        ))}

        {pendingLeaves.map((r) => (
          <div
            key={r.id}
            className="p-2.5 bg-theme-accent-muted border border-theme-accent/25 rounded-lg space-y-1.5 text-[11px]"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <span className="font-bold text-theme-accent text-[9px] uppercase tracking-wide">
                  Leave
                </span>
                <h4 className="font-bold text-theme-text truncate">{r.username}</h4>
              </div>
              <span className="font-bold bg-theme-surface text-theme-text border border-theme-border px-1.5 py-0.5 rounded text-[9px] capitalize shrink-0">
                {r.leaveType || "Leave"}
              </span>
            </div>
            <div className="text-[10px] text-theme-muted font-semibold">
              {r.startDate} → {r.endDate}
            </div>
            <p className="text-theme-muted italic line-clamp-2">
              &ldquo;{r.reason}&rdquo;
            </p>
            <div className="flex gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => updateLeaveStatus(r.id, "approved")}
                className="flex-1 h-7 bg-theme-success text-white text-[10px] font-bold rounded-md inline-flex items-center justify-center gap-1 cursor-pointer border-0"
              >
                <Check className="w-3 h-3" /> Approve
              </button>
              <button
                type="button"
                onClick={() => updateLeaveStatus(r.id, "rejected")}
                className="flex-1 h-7 bg-theme-danger text-white text-[10px] font-bold rounded-md inline-flex items-center justify-center gap-1 cursor-pointer border-0"
              >
                <X className="w-3 h-3" /> Reject
              </button>
            </div>
          </div>
        ))}

        {pendingTotal === 0 && (
          <div className="py-10 text-center text-theme-muted text-[11px]">
            No pending approval requests.
          </div>
        )}
      </div>
    </div>
  );
}
