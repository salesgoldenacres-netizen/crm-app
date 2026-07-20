import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { planStatusTransition } from "@/shared/contracts";
import { User, Lead } from "@/shared/types";
import { CallLogFormState } from "@/features/leads/components/CallLoggingForm";
import type { LogCallPayload } from "@/features/leads/hooks/useLeadsStore";

export type FeedbackDialog =
  | {
      mode: "alert";
      title: string;
      description: string;
      onDismiss?: () => void;
    }
  | {
      mode: "confirm";
      title: string;
      description: string;
      confirmLabel?: string;
      confirmVariant?: "primary" | "danger" | "success";
      onConfirm: () => void | Promise<void>;
    };

export function useLeadCallLog(
  activeLead: Lead | undefined,
  user: User,
  projects: Record<string, { name?: string }> | undefined,
  isDialerActive: boolean,
  setIsDialerActive: (active: boolean) => void,
  dialerSeconds: number,
  logCall: (leadId: string, log: LogCallPayload) => Promise<void>,
  updateLead: (leadId: string, data: Partial<Lead>) => Promise<void>,
  handleBackNavigation: () => void
) {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<FeedbackDialog | null>(null);

  const [callLogForm, setCallLogForm] = useState<CallLogFormState>({
    note: "",
    status: "new",
    disposition: "Connected",
    priority: "warm",
    followUpDate: "",
  });

  // Sync states on load or lead switch
  const [prevLeadId, setPrevLeadId] = useState<string | undefined>(
    activeLead?.id
  );
  if (activeLead && activeLead.id !== prevLeadId) {
    setPrevLeadId(activeLead.id);
    setCallLogForm((prev) => ({
      ...prev,
      status: activeLead.status || "new",
      priority: activeLead.priority || "warm",
      followUpDate: activeLead.followUpDate || "",
    }));
  }

  const handleCallLogSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeLead) return;

      const disposition = callLogForm.disposition || "Connected";
      const customerPicked = [
        "Connected",
        "Interested",
        "Site Visit Scheduled",
        "Booked",
      ].includes(disposition);

      const finalNote =
        callLogForm.note.trim() || "Logged a call disposition: " + disposition;
      const targetStatus = callLogForm.status || "new";
      const statusPlan = planStatusTransition({
        from: activeLead.status,
        to: targetStatus,
        reason: "call",
      });
      if (!statusPlan.ok && statusPlan.error !== "Status unchanged") {
        setFeedback({
          mode: "alert",
          title: "Status change blocked",
          description:
            statusPlan.error || "Cannot apply call disposition status.",
        });
        return;
      }

      await logCall(activeLead.id, {
        note: finalNote,
        status: statusPlan.to,
        followUpDate: callLogForm.followUpDate,
        agent: user.username,
        duration: dialerSeconds || 0,
        callType: "outgoing",
        picked: customerPicked,
        timelineActivity: "call",
      });

      // Priority only — status/follow-up already applied via logCall (one emit path).
      await updateLead(activeLead.id, {
        priority: callLogForm.priority,
      });

      // Deep-link only — do NOT write callLogs / [WhatsApp Sent] (messaging SoR).
      const autoSendCheckbox = document.getElementById(
        "autoWhatsAppCheck"
      ) as HTMLInputElement;
      if (
        autoSendCheckbox &&
        autoSendCheckbox.checked &&
        disposition === "Connected"
      ) {
        const projectName =
          (activeLead.projectId &&
            projects &&
            projects[activeLead.projectId]?.name) ||
          "Golden Acres";
        const cleanPhone = activeLead.phone.replace(/[^0-9]/g, "");
        const defaultText = `Hello ${activeLead.name}, thank you for taking the time to speak with us today regarding ${projectName}. Regards, Golden Acres.`;
        const waUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(
          defaultText
        )}`;
        window.open(waUrl, "_blank");
      }

      setCallLogForm((prev) => ({ ...prev, note: "" }));

      if (isDialerActive) {
        const queueStr = sessionStorage.getItem("powerDialerQueue");
        const queue = queueStr ? JSON.parse(queueStr) : [];
        const currentIndex = queue.indexOf(activeLead.id);
        const nextLeadId = queue[currentIndex + 1];
        if (nextLeadId) {
          setFeedback({
            mode: "alert",
            title: "Call log saved",
            description:
              "Call log saved successfully! Proceeding to next lead in queue...",
            onDismiss: () => navigate(`/lead/${nextLeadId}`),
          });
        } else {
          sessionStorage.removeItem("isPowerDialerActive");
          setIsDialerActive(false);
          setFeedback({
            mode: "alert",
            title: "Queue complete",
            description:
              "Auto-dialer queue complete! No more leads in this queue.",
            onDismiss: () => handleBackNavigation(),
          });
        }
      } else {
        setFeedback({
          mode: "alert",
          title: "Call log saved",
          description: "Call log and status saved successfully!",
        });
      }
    },
    [
      activeLead,
      callLogForm,
      projects,
      user,
      dialerSeconds,
      isDialerActive,
      logCall,
      updateLead,
      setIsDialerActive,
      navigate,
      handleBackNavigation,
    ]
  );

  return {
    callLogForm,
    setCallLogForm,
    feedback,
    setFeedback,
    handleCallLogSubmit,
  };
}
