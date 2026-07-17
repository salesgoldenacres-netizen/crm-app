import { useRef, useState } from "react";
import { Briefcase } from "lucide-react";
import { Lead, User } from "@/shared/types";
import { publishDiscountRequested } from "@/shared/contracts";
import Input from "@/shared/components/ui/Input";
import Button from "@/shared/components/ui/Button";
import FormActions from "@/shared/components/ui/FormActions";
import Dialog from "@/shared/components/ui/Dialog";

type FeedbackDialog = {
  title: string;
  description: string;
};

interface DiscountRequest {
  requestedAmt: string;
  justification: string;
  status: "pending" | "approved" | "rejected";
}

interface DiscountManagerProps {
  activeLead: Lead;
  isOpen: boolean;
  onToggle: () => void;
  updateLead: (leadId: string, data: Partial<Lead>) => Promise<void> | void;
  user: User;
  users: User[];
  isManagerial: (role?: string) => boolean;
  addNotification: (notif: { userId: string; message: string; type: "info" | "success" | "error" }) => Promise<void> | void;
}

export default function DiscountManager({
  activeLead,
  isOpen,
  onToggle,
  updateLead,
  user,
  users,
  isManagerial,
  addNotification,
}: DiscountManagerProps) {
  const amtRef = useRef<HTMLInputElement>(null);
  const justRef = useRef<HTMLInputElement>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    amt?: string;
    justification?: string;
  }>({});
  const [feedback, setFeedback] = useState<FeedbackDialog | null>(null);

  const handleSubmit = async () => {
    const amt = amtRef.current?.value?.trim() || "";
    const just = justRef.current?.value?.trim() || "";

    const nextErrors: { amt?: string; justification?: string } = {};
    if (!amt) {
      nextErrors.amt = "Enter a discount amount or percent";
    }
    if (!just) {
      nextErrors.justification = "Enter a justification";
    }
    if (nextErrors.amt || nextErrors.justification) {
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});

    const discountData: DiscountRequest = {
      requestedAmt: amt,
      justification: just,
      status: "pending",
    };

    try {
      await updateLead(activeLead.id, {
        discountRequest: discountData,
      });

      void publishDiscountRequested({
        leadId: activeLead.id,
        amount: amt,
        summary: `Discount requested: ${amt} — ${just}`.slice(0, 200),
        actorName: user.username,
        sourceId: `discount:${activeLead.id}:pending`,
        idempotencyKey: `discount_requested_${activeLead.id}_${amt}`,
        metadata: { justification: just },
      });

      const admins = users.filter((u) => isManagerial(u.role));
      for (const admin of admins) {
        await addNotification({
          userId: admin.id,
          message: `Discount Request: ${user.username} requested ${amt} discount for lead "${activeLead.name}".`,
          type: "info",
        });
      }
      setFeedback({
        title: "Request submitted",
        description: "Discount request submitted to Admin panel!",
      });
    } catch (err) {
      console.error("Failed to submit discount request:", err);
      setFeedback({
        title: "Submit failed",
        description: "Failed to submit request. Please try again.",
      });
    }
  };

  return (
    <div className="card-premium p-6">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="discount-request-panel"
        className="w-full flex justify-between items-center text-left cursor-pointer border-b border-theme-border pb-2.5 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
      >
        <h4 className="type-label font-semibold text-theme-muted uppercase tracking-wider flex items-center">
          <Briefcase className="w-4 h-4 mr-1.5 text-theme-accent" aria-hidden="true" />
          Discount Request Manager
        </h4>
        <span className="text-theme-accent font-semibold text-xs">
          {isOpen ? "Hide" : "Expand"}
        </span>
      </button>
      {isOpen && (
        <div
          id="discount-request-panel"
          className="mt-4 space-y-4 animate-fadeIn"
          role="region"
          aria-label="Discount request form"
        >
          {activeLead.discountRequest ? (
            <div
              className="bg-theme-accent-muted border border-theme-border p-4 rounded-theme text-xs space-y-1.5 relative overflow-hidden"
              role="status"
              aria-live="polite"
            >
              <div className="flex justify-between items-center gap-3">
                <span className="font-semibold text-theme-text">
                  Requested Discount:{" "}
                  <span className="text-theme-accent text-sm font-semibold">
                    {activeLead.discountRequest.requestedAmt}
                  </span>
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-theme font-semibold text-[9px] uppercase border ${
                    activeLead.discountRequest.status === "approved"
                      ? "bg-theme-success/10 text-theme-success border-theme-success/20"
                      : activeLead.discountRequest.status === "rejected"
                        ? "bg-theme-danger/10 text-theme-danger border-theme-danger/20"
                        : "bg-theme-warning/10 text-theme-warning border-theme-warning/20"
                  }`}
                >
                  {activeLead.discountRequest.status}
                </span>
              </div>
              <p className="text-theme-muted mt-1 font-medium">
                {activeLead.discountRequest.justification}
              </p>
              {activeLead.discountRequest.status === "pending" && (
                <span className="text-[10px] text-theme-muted font-semibold block mt-1">
                  Pending approval from administrator
                </span>
              )}
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  ref={amtRef}
                  label="Discount Pct/Amt"
                  type="text"
                  required
                  placeholder="e.g. 5% or ₹1 Lakh"
                  error={fieldErrors.amt}
                  onChange={() =>
                    setFieldErrors((prev) => ({ ...prev, amt: undefined }))
                  }
                />
                <Input
                  ref={justRef}
                  label="Justification Reason"
                  type="text"
                  required
                  placeholder="e.g. Closing deal today"
                  error={fieldErrors.justification}
                  onChange={() =>
                    setFieldErrors((prev) => ({
                      ...prev,
                      justification: undefined,
                    }))
                  }
                />
              </div>
              <FormActions>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSubmit}
                  className="w-full"
                >
                  Submit Request to Admin
                </Button>
              </FormActions>
            </div>
          )}
        </div>
      )}

      <Dialog
        isOpen={!!feedback}
        onClose={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        description={feedback?.description}
        cancelLabel="OK"
      />
    </div>
  );
}
