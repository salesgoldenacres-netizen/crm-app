import { useState } from "react";
import { Briefcase } from "lucide-react";
import { Lead, Project, User } from "@/shared/types";
import {
  publishDiscountApproved,
  publishDiscountRejected,
} from "@/shared/contracts";
import Dialog from "@/shared/components/ui/Dialog";

interface PendingDiscountsApprovalsProps {
  leads: Lead[];
  projects: Record<string, Project>;
  updateLead: (id: string, values: any) => Promise<any>;
  logAuditEvent: (event: any) => Promise<any>;
  user: User;
}

type FeedbackDialog =
  | { mode: "alert"; title: string; description: string }
  | {
      mode: "confirm";
      title: string;
      description: string;
      confirmLabel?: string;
      confirmVariant?: "primary" | "danger" | "success";
      onConfirm: () => void | Promise<void>;
    };

export default function PendingDiscountsApprovals({
  leads,
  projects,
  updateLead,
  logAuditEvent,
  user,
}: PendingDiscountsApprovalsProps) {
  const [feedback, setFeedback] = useState<FeedbackDialog | null>(null);
  const pendingDiscounts = leads.filter(
    (l) => l.discountRequest && l.discountRequest.status === "pending"
  );

  if (pendingDiscounts.length === 0 && !feedback) return null;

  return (
    <>
      {pendingDiscounts.length > 0 && (
        <div className="bg-theme-card rounded-theme shadow-sm border border-yellow-200 dark:border-yellow-900 p-5 mb-6 text-sm">
          <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-400 uppercase tracking-wider mb-3 flex items-center">
            <Briefcase className="w-4 h-4 mr-2 text-yellow-500" />
            Pending Discount Approvals ({pendingDiscounts.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-theme-border text-xs">
              <thead className="bg-theme-surface">
                <tr>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-bold uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-bold uppercase tracking-wider">
                    Project / Plot
                  </th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-bold uppercase tracking-wider">
                    Requested Amt
                  </th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-bold uppercase tracking-wider">
                    Reason/Justification
                  </th>
                  <th className="px-4 py-2.5 text-right text-gray-500 font-bold uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {pendingDiscounts.map((l) => (
                  <tr key={l.id} className="hover:bg-theme-surface/60">
                    <td className="px-4 py-3 font-semibold text-theme-text">
                      {l.name} ({l.phone})
                    </td>
                    <td className="px-4 py-3 font-medium text-theme-text">
                      {projects[l.projectId || ""]?.name || "—"} / Plot{" "}
                      {l.plotId || "—"}
                    </td>
                    <td className="px-4 py-3 font-bold text-theme-accent">
                      {l.discountRequest?.requestedAmt}
                    </td>
                    <td className="px-4 py-3 text-gray-500 italic">
                      "{l.discountRequest?.justification}"
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!l.discountRequest) return;
                          const request = l.discountRequest;
                          setFeedback({
                            mode: "confirm",
                            title: "Approve discount?",
                            description: `Approve discount of ${request.requestedAmt} for ${l.name}?`,
                            confirmLabel: "Approve",
                            confirmVariant: "success",
                            onConfirm: async () => {
                              const updatedRequest = {
                                ...request,
                                status: "approved",
                              };
                              await updateLead(l.id, {
                                discountRequest: updatedRequest,
                              });
                              void publishDiscountApproved({
                                leadId: l.id,
                                amount: request.requestedAmt,
                                actorName: `Admin (${user.username})`,
                                sourceId: `discount:${l.id}:approved`,
                                idempotencyKey: `discount_approved_${l.id}_${request.requestedAmt}`,
                              });
                              await logAuditEvent({
                                action: "Approve Discount",
                                details: `Approved ${request.requestedAmt} discount for lead ID: ${l.id}`,
                                user: user.username,
                              });
                              setFeedback({
                                mode: "alert",
                                title: "Discount approved",
                                description: "Discount approved successfully!",
                              });
                            },
                          });
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-2 py-1 rounded text-[10px] cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!l.discountRequest) return;
                          const request = l.discountRequest;
                          setFeedback({
                            mode: "confirm",
                            title: "Reject discount?",
                            description: `Reject discount request for ${l.name}?`,
                            confirmLabel: "Reject",
                            confirmVariant: "danger",
                            onConfirm: async () => {
                              const updatedRequest = {
                                ...request,
                                status: "rejected",
                              };
                              await updateLead(l.id, {
                                discountRequest: updatedRequest,
                              });
                              void publishDiscountRejected({
                                leadId: l.id,
                                summary: `Discount rejected: ${request.requestedAmt}`,
                                actorName: `Admin (${user.username})`,
                                sourceId: `discount:${l.id}:rejected`,
                                idempotencyKey: `discount_rejected_${l.id}_${request.requestedAmt}`,
                              });
                              await logAuditEvent({
                                action: "Reject Discount",
                                details: `Rejected ${request.requestedAmt} discount for lead ID: ${l.id}`,
                                user: user.username,
                              });
                              setFeedback({
                                mode: "alert",
                                title: "Discount rejected",
                                description: "Discount request rejected.",
                              });
                            },
                          });
                        }}
                        className="bg-red-650 hover:bg-red-700 text-white font-bold px-2 py-1 rounded text-[10px] cursor-pointer"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog
        isOpen={!!feedback}
        onClose={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        description={feedback?.description}
        cancelLabel={feedback?.mode === "alert" ? "OK" : "Cancel"}
        confirmLabel={
          feedback?.mode === "confirm"
            ? feedback.confirmLabel ?? "Confirm"
            : undefined
        }
        confirmVariant={
          feedback?.mode === "confirm"
            ? feedback.confirmVariant ?? "primary"
            : undefined
        }
        onConfirm={
          feedback?.mode === "confirm" ? feedback.onConfirm : undefined
        }
      />
    </>
  );
}
