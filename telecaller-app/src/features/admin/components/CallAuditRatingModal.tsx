import React, { useState } from "react";
import Modal from "@/shared/components/ui/Modal";
import Dialog from "@/shared/components/ui/Dialog";
import Button from "@/shared/components/ui/Button";
import FormActions from "@/shared/components/ui/FormActions";
import Textarea from "@/shared/components/ui/Textarea";

interface CallAuditRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  logIndex: number;
  rateCallLog: (leadId: string, logIndex: number, score: number, feedback: string) => Promise<void>;
}

type FeedbackDialog = {
  title: string;
  description: string;
  confirmVariant: "success" | "danger";
};

export default function CallAuditRatingModal({
  isOpen,
  onClose,
  leadId,
  logIndex,
  rateCallLog,
}: CallAuditRatingModalProps) {
  const [ratingForm, setRatingForm] = useState({ score: 5, feedback: "" });
  const [feedbackDialog, setFeedbackDialog] = useState<FeedbackDialog | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rateCallLog(leadId, logIndex, ratingForm.score, ratingForm.feedback);
      onClose();
      setFeedbackDialog({
        title: "Rating saved",
        description: "Call log rated successfully!",
        confirmVariant: "success",
      });
    } catch (err: any) {
      setFeedbackDialog({
        title: "Rating failed",
        description: "Failed to rate call: " + err.message,
        confirmVariant: "danger",
      });
    }
  };

  if (!isOpen && !feedbackDialog) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Evaluate Call Quality"
        variant="sheet"
        size="md"
        closeOnBackdrop={false}
        footer={
          <FormActions>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="call-audit-rating-form" variant="primary">
              Submit Rating
            </Button>
          </FormActions>
        }
      >
        <form id="call-audit-rating-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-theme-muted uppercase mb-2">
              Quality Score (1-5 Stars)
            </label>
            <div className="flex space-x-2" role="group" aria-label="Quality score">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingForm({ ...ratingForm, score: star })}
                  aria-label={`${star} star${star === 1 ? "" : "s"}`}
                  aria-pressed={ratingForm.score >= star}
                  className={
                    "text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring " +
                    "rounded-theme cursor-pointer bg-transparent border-0 p-0.5"
                  }
                >
                  <span
                    className={
                      ratingForm.score >= star
                        ? "text-amber-500"
                        : "text-theme-muted/40"
                    }
                    aria-hidden="true"
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label="Feedback / Coaching Note"
            rows={3}
            value={ratingForm.feedback}
            onChange={(e) =>
              setRatingForm({ ...ratingForm, feedback: e.target.value })
            }
            placeholder="Provide coaching advice for this call..."
          />
        </form>
      </Modal>

      <Dialog
        isOpen={!!feedbackDialog}
        onClose={() => setFeedbackDialog(null)}
        title={feedbackDialog?.title ?? ""}
        description={feedbackDialog?.description}
        confirmLabel="OK"
        cancelLabel="Close"
        onConfirm={() => setFeedbackDialog(null)}
        confirmVariant={feedbackDialog?.confirmVariant ?? "primary"}
        closeOnBackdrop={false}
      />
    </>
  );
}
