import { useState, useEffect } from "react";

import { useLeadsStore } from "@/features/leads/hooks/useLeadsStore";
import { useAttendanceStore } from "@/features/attendance/hooks/useAttendanceStore";
import { useLeaveRequestsStore } from "@/features/attendance/hooks/useLeaveRequestsStore";
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useUsersStore } from "@/features/employees/hooks/useUsersStore";
import { useAgentStatusStore } from "@/features/employees/hooks/useAgentStatusStore";
import {
  useTeamsStore,
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
import AcquisitionChannelsWidget from "../components/AcquisitionChannelsWidget";
import TeamsGoalsWidget from "../components/TeamsGoalsWidget";
import AdminPipelineFunnelWidget from "../components/AdminPipelineFunnelWidget";

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

  const { projects } = useProjectsStore();
  const { users } = useUsersStore();
  const { leads, updateLead } = useLeadsStore();
  const { allAttendance, forceClockOut } = useAttendanceStore();
  const { leaveRequests, updateLeaveStatus } = useLeaveRequestsStore();
  const { teams } = useTeamsStore();
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

  const parsePrice = (priceStr: string | number | null | undefined): number => {
    if (!priceStr) return 0;
    const str = priceStr.toString().trim().toLowerCase();

    let multiplier = 1;
    if (str.includes("cr") || str.includes("crore")) {
      multiplier = 10000000;
    } else if (str.includes("l") || str.includes("lakh")) {
      multiplier = 100000;
    }

    const cleaned = str.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleaned) || 0;
    return parsed * multiplier;
  };

  const todayStr = getLocalDateStr(currentTime);

  let totalRevenue = 0;
  leads.forEach((l) => {
    if ((l.status === "booked" || l.status === "reserved") && l.projectId) {
      const project = projects[l.projectId];
      if (project) {
        const plot = project.plots?.find(
          (p: { id?: string; number?: string; price?: string | number; size?: string; rate?: string }) =>
            p.id === l.plotId || p.number === l.plotId
        );
        if (plot) {
          const cleanPrice = parsePrice(plot.price);
          if (cleanPrice > 0) {
            totalRevenue += cleanPrice;
          } else if (plot.size && plot.rate) {
            totalRevenue += parseFloat(plot.size) * parseFloat(plot.rate) || 0;
          }
        }
      }
    }
  });

  const formatRevenue = (value: number): string => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return `₹${value.toLocaleString("en-IN")}`;
  };

  const totalLeadsCount = leads.length;
  const bookedLeadsCount = leads.filter((l) => l.status === "booked").length;
  const conversionRate =
    totalLeadsCount > 0
      ? ((bookedLeadsCount / totalLeadsCount) * 100).toFixed(1)
      : "0";
  const hotLeadsCount = leads.filter((l) => l.priority === "hot").length;

  let totalCallDurationSeconds = 0;
  let totalCallsTodayCount = 0;
  leads.forEach((l) => {
    (l.callLogs || []).forEach((log) => {
      const logDateVal = log.date
        ? new Date(log.date)
        : log.timestamp
          ? new Date(log.timestamp)
          : null;
      if (logDateVal) {
        const logDateStr = getLocalDateStr(logDateVal);
        if (logDateStr === todayStr) {
          const hasCallFields =
            log.duration !== undefined ||
            log.callType !== undefined ||
            log.picked !== undefined;
          const noteText = log.note || "";
          const hasCallNote =
            noteText.includes("[Call Log") || noteText.includes("Duration:");

          if (hasCallFields || hasCallNote) {
            totalCallsTodayCount++;
            if (typeof log.duration === "number") {
              totalCallDurationSeconds += log.duration;
            } else {
              const match = noteText.match(/Duration:\s*(\d+):(\d+)/);
              if (match) {
                const mins = parseInt(match[1]) || 0;
                const secs = parseInt(match[2]) || 0;
                totalCallDurationSeconds += mins * 60 + secs;
              }
            }
          }
        }
      }
    });
  });
  const avgCallDurationSecs =
    totalCallsTodayCount > 0
      ? Math.round(totalCallDurationSeconds / totalCallsTodayCount)
      : 0;
  const formattedAvgDuration = `${Math.floor(avgCallDurationSecs / 60)}m ${avgCallDurationSecs % 60}s`;

  const pendingLeaves = leaveRequests.filter((r) => r.status === "pending");
  const pendingDiscounts = leads.filter(
    (l) => l.discountRequest && l.discountRequest.status === "pending"
  );
  const pendingCount = pendingLeaves.length + pendingDiscounts.length;

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

  const sourceStats: Record<string, number> = {
    google: 0,
    meta: 0,
    bulk: 0,
    direct: 0,
  };
  const sourceBookings: Record<string, number> = {
    google: 0,
    meta: 0,
    bulk: 0,
    direct: 0,
  };
  leads.forEach((l) => {
    const notes = l.notes || "";
    let channel = "direct";
    if (
      notes.includes("Google_Ads_Lead_Form") ||
      notes.includes("google_ads_webhook")
    )
      channel = "google";
    else if (
      notes.includes("Meta_Lead_Ads") ||
      notes.includes("meta_ads_webhook")
    )
      channel = "meta";
    else if (notes.includes("Bulk imported")) channel = "bulk";

    sourceStats[channel]++;
    if (l.status === "booked") {
      sourceBookings[channel]++;
    }
  });

  const getSourceDetails = (source: string) => {
    const count = sourceStats[source];
    const bookings = sourceBookings[source];
    const rate = count > 0 ? ((bookings / count) * 100).toFixed(1) : "0";
    return { count, rate };
  };

  const targetRevenue = goals.targetRevenue || 5000000;
  const targetPercent = Math.min(
    100,
    Math.round((totalRevenue / targetRevenue) * 100)
  );

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
        <AcquisitionChannelsWidget
          totalLeadsCount={totalLeadsCount}
          getSourceDetails={getSourceDetails}
        />

        <AdminPipelineFunnelWidget
          leads={leads}
          totalLeadsCount={totalLeadsCount}
        />

        <TeamsGoalsWidget teams={teams} leads={leads} goals={goals} />
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
