import { useState, useEffect } from "react";

import { useLeadsStore } from "@/features/leads/hooks/useLeadsStore";
import { useAttendanceStore } from "@/features/attendance/hooks/useAttendanceStore";
import { useLeaveRequestsStore } from "@/features/attendance/hooks/useLeaveRequestsStore";
import { useUsersStore } from "@/features/employees/hooks/useUsersStore";
import { useAgentStatusStore } from "@/features/employees/hooks/useAgentStatusStore";
import {
  useGoalsStore,
  useCustomRolesStore,
  useAgentProductivityStore,
} from "@/features/admin/hooks/adminStores";
import { isManagerial as isManagerialUtil } from "@/shared/utils/roleUtils";
import { parseSafeDate } from "@/shared/utils/dateUtils";
import { useToast } from "@/shared/components/Toast";
import Dialog from "@/shared/components/ui/Dialog";
import {
  publishDiscountApproved,
  publishDiscountRejected,
} from "@/shared/contracts";

import LiveTelecallersTracker from "../components/LiveTelecallersTracker";
import ApprovalsCenter from "../components/ApprovalsCenter";
import ProductivityTelemetry from "../components/ProductivityTelemetry";
import AdminDashboardHeader from "../components/AdminDashboardHeader";
import AdminDashboardKPICards from "../components/AdminDashboardKPICards";
import AggregateUnavailable from "../components/AggregateUnavailable";

type ConfirmDialog = {
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger" | "success";
  onConfirm: () => void | Promise<void>;
};

export default function AdminDashboard({ user }: { user: import("@/shared/types").User }) {
  const { roles: customRoles } = useCustomRolesStore();
  const isManagerial = (roleCode: string) => isManagerialUtil(roleCode, customRoles);
  const { toast } = useToast();

  const { users } = useUsersStore();
  const { updateLead } = useLeadsStore();
  const { allAttendance, forceClockOut } = useAttendanceStore();
  const { leaveRequests, updateLeaveStatus } = useLeaveRequestsStore();
  const { goals } = useGoalsStore();
  const { agentStatuses } = useAgentStatusStore();
  const { productivity } = useAgentProductivityStore();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getLocalDateStr = (dateVal: Date) => {
    const offset = 5.5 * 60 * 60 * 1000; // IST
    return new Date(dateVal.getTime() + offset).toISOString().split("T")[0];
  };

  const todayStr = getLocalDateStr(currentTime);

  // Tier 2 lead aggregates — never compute from empty global store.
  // Use agentProductivity rollups for call activity; lead KPIs → See Reports.
  const productivityToday = Object.values(productivity).filter((p) => p.date === todayStr);
  const totalCallsTodayCount = productivityToday.reduce(
    (acc, p) => acc + (p.totalCalls || 0),
    0,
  );
  const totalTalkTime = productivityToday.reduce(
    (acc, p) => acc + (p.totalTalkTimeSeconds || 0),
    0,
  );
  const avgCallDurationSecs =
    totalCallsTodayCount > 0 ? Math.round(totalTalkTime / totalCallsTodayCount) : 0;
  const formattedAvgDuration = `${Math.floor(avgCallDurationSecs / 60)}m ${avgCallDurationSecs % 60}s`;

  const formatRevenue = (value: number): string => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return `₹${value.toLocaleString("en-IN")}`;
  };

  const totalRevenue = 0;
  const totalLeadsCount = 0;
  const bookedLeadsCount = 0;
  const conversionRate = "—";
  const hotLeadsCount = 0;
  const targetRevenue = goals.targetRevenue || 5000000;
  const targetPercent = 0;

  const pendingLeaves = leaveRequests.filter((r) => r.status === "pending");
  const pendingDiscounts: import("@/shared/types").Lead[] = [];
  const pendingCount = pendingLeaves.length;

  const handleForceClockOut = async (targetUserId: string, targetUsername: string) => {
    setConfirmDialog({
      title: "Force clock out?",
      description: `Force clock out ${targetUsername} for today?`,
      confirmLabel: "Clock Out",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          await forceClockOut(targetUserId, targetUsername);
          toast(`${targetUsername} has been clocked out.`, "success");
          setConfirmDialog(null);
        } catch (err: any) {
          setConfirmDialog(null);
          toast(err?.message || "Failed to force clock out.", "error");
        }
      },
    });
  };

  const handleApproveDiscount = async (
    leadId: string,
    leadName: string,
    request: NonNullable<import("@/shared/types").Lead["discountRequest"]>
  ) => {
    setConfirmDialog({
      title: "Approve discount?",
      description: `Approve discount of ${request.requestedAmt} for ${leadName}?`,
      confirmLabel: "Approve",
      confirmVariant: "success",
      onConfirm: async () => {
        try {
          const updatedRequest = { ...request, status: "approved" as const };
          await updateLead(leadId, { discountRequest: updatedRequest });
          void publishDiscountApproved({
            leadId,
            amount: request.requestedAmt,
            actorName: `${user.username} (Admin)`,
            sourceId: `discount:${leadId}:approved`,
            idempotencyKey: `discount_approved_${leadId}_${request.requestedAmt}`,
          });
          toast("Discount approved.", "success");
          setConfirmDialog(null);
        } catch (err: any) {
          setConfirmDialog(null);
          toast(err?.message || "Failed to approve discount.", "error");
        }
      },
    });
  };

  const handleRejectDiscount = async (
    leadId: string,
    leadName: string,
    request: NonNullable<import("@/shared/types").Lead["discountRequest"]>
  ) => {
    setConfirmDialog({
      title: "Reject discount?",
      description: `Reject discount request for ${leadName}?`,
      confirmLabel: "Reject",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          const updatedRequest = { ...request, status: "rejected" as const };
          await updateLead(leadId, { discountRequest: updatedRequest });
          void publishDiscountRejected({
            leadId,
            summary: `Discount rejected: ${request.requestedAmt}`,
            actorName: `${user.username} (Admin)`,
            sourceId: `discount:${leadId}:rejected`,
            idempotencyKey: `discount_rejected_${leadId}_${request.requestedAmt}`,
          });
          toast("Discount request rejected.", "info");
          setConfirmDialog(null);
        } catch (err: any) {
          setConfirmDialog(null);
          toast(err?.message || "Failed to reject discount.", "error");
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-3 text-theme-text">
      <AdminDashboardHeader
        currentTime={currentTime}
        pendingCount={pendingCount}
      />

      <AdminDashboardKPICards
        totalRevenue={totalRevenue}
        targetPercent={targetPercent}
        targetRevenue={targetRevenue}
        conversionRate={conversionRate}
        bookedLeadsCount={bookedLeadsCount}
        totalLeadsCount={totalLeadsCount}
        totalCallsTodayCount={totalCallsTodayCount}
        formattedAvgDuration={formattedAvgDuration}
        hotLeadsCount={hotLeadsCount}
        pendingLeavesCount={pendingLeaves.length}
        pendingDiscountsCount={pendingDiscounts.length}
        formatRevenue={formatRevenue}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <LiveTelecallersTracker
          users={users}
          isManagerial={isManagerial}
          agentStatuses={agentStatuses}
          allAttendance={allAttendance}
          todayStr={todayStr}
          currentTime={currentTime}
          parseSafeDate={parseSafeDate}
          handleForceClockOut={handleForceClockOut}
        />

        <ApprovalsCenter
          pendingDiscounts={pendingDiscounts}
          pendingLeaves={pendingLeaves}
          handleApproveDiscount={handleApproveDiscount}
          handleRejectDiscount={handleRejectDiscount}
          updateLeaveStatus={updateLeaveStatus}
        />
      </div>

      <ProductivityTelemetry
        users={users}
        isManagerial={isManagerial}
        agentStatuses={agentStatuses}
        productivity={productivity}
        todayStr={todayStr}
        currentTime={currentTime}
        parseSafeDate={parseSafeDate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <AggregateUnavailable
          title="Acquisition channel mix unavailable"
          detail="Channel rollups need summary counters — not an empty leads store."
        />
        <AggregateUnavailable
          title="Pipeline funnel unavailable"
          detail="Funnel stages require bounded LeadQueryService windows or Reports."
        />
        <AggregateUnavailable
          title="Team booking goals unavailable"
          detail="Team booking counts from global leads are retired. See Reports."
        />
      </div>

      <Dialog
        isOpen={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        title={confirmDialog?.title ?? ""}
        description={confirmDialog?.description}
        confirmLabel={confirmDialog?.confirmLabel ?? "Confirm"}
        confirmVariant={confirmDialog?.confirmVariant ?? "primary"}
        onConfirm={confirmDialog?.onConfirm}
      />
    </div>
  );
}
