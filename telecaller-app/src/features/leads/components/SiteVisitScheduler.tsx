import { useState } from "react";
import { Calendar } from "lucide-react";
import { User, Lead } from "@/shared/types";
import {
  planSiteVisitConfirmedTransition,
  publishSiteVisitCancelled,
  publishSiteVisitScheduled,
} from "@/shared/contracts";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";
import Button from "@/shared/components/ui/Button";
import FormActions from "@/shared/components/ui/FormActions";
import Dialog from "@/shared/components/ui/Dialog";

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

interface SiteVisitSchedulerProps {
  activeLead: Lead;
  user: User;
  users: User[];
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>;
  addNotification: (data: Record<string, unknown>) => Promise<void>;
  isManagerial: (role: string) => boolean;
}

export default function SiteVisitScheduler({
  activeLead,
  user,
  users,
  updateLead,
  addNotification,
  isManagerial,
}: SiteVisitSchedulerProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [siteVisitForm, setSiteVisitForm] = useState({
    date: "",
    time: "10:00 AM",
    coordinator: "",
  });
  const [fieldErrors, setFieldErrors] = useState<{
    date?: string;
    coordinator?: string;
  }>({});
  const [feedback, setFeedback] = useState<FeedbackDialog | null>(null);

  const handleScheduleVisit = async () => {
    const nextErrors: { date?: string; coordinator?: string } = {};
    if (!siteVisitForm.date) {
      nextErrors.date = "Select a visit date";
    }
    if (!siteVisitForm.coordinator.trim()) {
      nextErrors.coordinator = "Enter a coordinator name";
    }
    if (nextErrors.date || nextErrors.coordinator) {
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});

    const plan = planSiteVisitConfirmedTransition(activeLead.status);
    if (!plan.ok && plan.error !== "Status unchanged") {
      setFeedback({
        mode: "alert",
        title: "Cannot schedule site visit",
        description: plan.error || "Status transition not allowed.",
      });
      return;
    }

    const visitData = {
      date: siteVisitForm.date,
      time: siteVisitForm.time,
      coordinator: siteVisitForm.coordinator,
    };

    const leadPatch: Partial<Lead> = {
      siteVisit: visitData,
      followUpDate: siteVisitForm.date,
    };
    if (plan.ok) {
      Object.assign(leadPatch, plan.leadPatch);
    }

    await updateLead(activeLead.id, leadPatch);

    const visitSourceId = `sv:${activeLead.id}:${visitData.date}:${visitData.time}`;
    await publishSiteVisitScheduled({
      leadId: activeLead.id,
      date: visitData.date,
      time: visitData.time,
      actorName: user.username,
      sourceId: visitSourceId,
      idempotencyKey: `site_visit_scheduled_${activeLead.id}_${visitData.date}_${visitData.time}`,
      metadata: { coordinator: visitData.coordinator },
    });

    const admins = users.filter((u) => isManagerial(u.role));
    for (const admin of admins) {
      await addNotification({
        userId: admin.id,
        message: `Site Visit Scheduled: ${user.username} scheduled a visit for lead "${activeLead.name}" on ${visitData.date}.`,
        type: "site_visit",
        leadId: activeLead.id,
      });
    }

    setSiteVisitForm({
      date: "",
      time: "10:00 AM",
      coordinator: "",
    });
    setFeedback({
      mode: "alert",
      title: "Site visit scheduled",
      description: "Site visit scheduled successfully!",
    });
  };

  const handleCancelVisit = async () => {
    setFeedback({
      mode: "confirm",
      title: "Cancel site visit?",
      description: "Cancel this scheduled site visit?",
      confirmLabel: "Cancel Visit",
      confirmVariant: "danger",
      onConfirm: async () => {
        const scheduledDate = activeLead.siteVisit?.date || "";
        await updateLead(activeLead.id, {
          siteVisit: null,
        });
        await publishSiteVisitCancelled({
          leadId: activeLead.id,
          actorName: user.username,
          sourceId: `sv-cancel:${activeLead.id}:${scheduledDate || "none"}`,
          idempotencyKey: `site_visit_cancelled_${activeLead.id}_${scheduledDate || "none"}`,
          summary: scheduledDate
            ? `Site visit cancelled (was ${scheduledDate})`
            : "Site visit cancelled",
          metadata: { previousDate: scheduledDate || null },
        });
        setFeedback(null);
      },
    });
  };

  return (
    <div className="space-y-4 text-xs animate-fadeIn">
      <h4 className="type-label font-semibold text-theme-muted uppercase tracking-wider flex items-center mb-1">
        <Calendar className="w-4 h-4 mr-1.5 text-theme-accent" aria-hidden="true" />
        Site Visit Coordinator & Scheduler
      </h4>

      <div>
        {activeLead.siteVisit ? (
          <div
            className="bg-theme-accent-muted border border-theme-border p-4 rounded-theme text-xs space-y-2 text-theme-text relative overflow-hidden"
            role="status"
            aria-live="polite"
          >
            <div>
              <span className="type-label font-semibold text-theme-muted">Date & Time</span>
              <div className="text-theme-text font-semibold mt-0.5">
                {activeLead.siteVisit.date} at {activeLead.siteVisit.time}
              </div>
            </div>
            <div>
              <span className="type-label font-semibold text-theme-muted">
                Site Coordinator Exec
              </span>
              <div className="text-theme-text font-semibold mt-0.5">
                {activeLead.siteVisit.coordinator}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelVisit}
              aria-label="Cancel scheduled site visit"
              className="text-theme-danger hover:underline font-semibold mt-2 text-[10px] block cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
            >
              Cancel Site Visit
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Visit Date"
                type="date"
                required
                min={todayStr}
                value={siteVisitForm.date}
                error={fieldErrors.date}
                onChange={(e) => {
                  setFieldErrors((prev) => ({ ...prev, date: undefined }));
                  setSiteVisitForm({
                    ...siteVisitForm,
                    date: e.target.value,
                  });
                }}
              />
              <Select
                label="Time Slot"
                value={siteVisitForm.time}
                onChange={(e) =>
                  setSiteVisitForm({
                    ...siteVisitForm,
                    time: e.target.value,
                  })
                }
                options={[
                  { value: "10:00 AM", label: "10:00 AM" },
                  { value: "12:00 PM", label: "12:00 PM" },
                  { value: "02:00 PM", label: "02:00 PM" },
                  { value: "04:00 PM", label: "04:00 PM" },
                ]}
              />
            </div>
            <Input
              label="Coordinator Exec Name"
              type="text"
              required
              value={siteVisitForm.coordinator}
              error={fieldErrors.coordinator}
              onChange={(e) => {
                setFieldErrors((prev) => ({ ...prev, coordinator: undefined }));
                setSiteVisitForm({
                  ...siteVisitForm,
                  coordinator: e.target.value,
                });
              }}
              placeholder="e.g. Site Executive Coordinator"
            />
            <FormActions>
              <Button
                type="button"
                variant="primary"
                onClick={handleScheduleVisit}
                className="w-full"
              >
                Schedule Site Visit
              </Button>
            </FormActions>
          </div>
        )}
      </div>

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
    </div>
  );
}
