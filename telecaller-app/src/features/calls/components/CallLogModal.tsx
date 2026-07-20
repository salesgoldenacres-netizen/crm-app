import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { useToast } from "@/shared/components/Toast";
import { formatDuration } from "@/shared/utils/dateUtils";
import { Lead, User } from "@/shared/types";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";
import Textarea from "@/shared/components/ui/Textarea";
import Button from "@/shared/components/ui/Button";
import Modal from "@/shared/components/ui/Modal";
import FormActions from "@/shared/components/ui/FormActions";

const DISPOSITIONS = [
  { value: "Connected", label: "Connected" },
  { value: "Busy", label: "Busy" },
  { value: "Ringing/Unanswered", label: "Ringing / No Answer (RNR)" },
  { value: "Switched Off", label: "Switched Off" },
  { value: "Not Reachable", label: "Not Reachable" },
];

interface CallLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  durationSeconds: number;
  logCall: (id: string, logData: any) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  user: User;
}

const CALL_LOG_FORM_ID = "call-log-modal-form";

export default function CallLogModal({
  isOpen,
  onClose,
  lead,
  durationSeconds,
  logCall,
  updateLead,
  user,
}: CallLogModalProps) {
  const [disposition, setDisposition] = useState("Connected");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState("warm");
  const [followUpDate, setFollowUpDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    if (lead) {
      const timer = setTimeout(() => {
        setPriority(lead.priority || "warm");
        setFollowUpDate(lead.followUpDate || "");
        setNote("");
        setDisposition("Connected");
        setNoteError(undefined);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    if (disposition === "Connected" && !note.trim()) {
      setNoteError("Enter call notes for a connected call");
      return;
    }
    setIsSaving(true);

    try {
      const durationStr = formatDuration(durationSeconds);
      const finalNote = `[Call Log - Duration: ${durationStr}] [Disposition: ${disposition}] ${note.trim()}`;

      const customerPicked = ["Connected"].includes(disposition);

      await logCall(lead.id, {
        note: finalNote,
        status: customerPicked ? "contacted" : lead.status,
        followUpDate,
        agent: user.username,
        duration: durationSeconds,
        callType: "outgoing",
        picked: customerPicked,
        timelineActivity: "call",
      });

      // Priority only — status/follow-up already applied via logCall (one emit path).
      await updateLead(lead.id, {
        priority,
      });

      toast("Call log saved successfully!", "success");
      onClose();
    } catch (err: any) {
      toast(`Failed to save call log: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen && !!lead}
      onClose={onClose}
      title={lead ? `Log Call — ${lead.name}` : "Log Call Outcome"}
      variant="sheet"
      size="md"
      footer={
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={CALL_LOG_FORM_ID}
            variant="primary"
            disabled={isSaving}
          >
            <Check className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {isSaving ? "Saving..." : "Save Log"}
          </Button>
        </FormActions>
      }
    >
      {lead && (
        <form id={CALL_LOG_FORM_ID} onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div
            className="bg-theme-accent-muted border border-theme-accent/25 p-3 rounded-theme flex items-center justify-between text-theme-text"
            role="status"
          >
            <span className="type-label font-semibold text-theme-muted">
              Call Duration
            </span>
            <span className="font-mono font-semibold text-theme-accent text-sm">
              {formatDuration(durationSeconds)}
            </span>
          </div>

          <Select
            label="Call Disposition / Outcome"
            value={disposition}
            onChange={(e) => {
              setNoteError(undefined);
              setDisposition(e.target.value);
            }}
            options={DISPOSITIONS}
          />

          <Textarea
            label="Call Notes / Summary"
            required={disposition === "Connected"}
            placeholder={
              disposition === "Connected"
                ? "Type details of the conversation..."
                : "e.g. Number busy, will try later"
            }
            value={note}
            error={noteError}
            onInvalid={(e) => {
              e.preventDefault();
              setNoteError("Enter call notes for a connected call");
            }}
            onChange={(e) => {
              setNoteError(undefined);
              setNote(e.target.value);
            }}
            rows={3}
            helperText={
              disposition === "Connected"
                ? "Required when the call connected"
                : "Optional note for unanswered outcomes"
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Lead Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={[
                { value: "hot", label: "Hot" },
                { value: "warm", label: "Warm" },
                { value: "cold", label: "Cold" },
              ]}
            />
            <Input
              label="Follow-up Date"
              type="date"
              min={new Date().toISOString().split("T")[0]}
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              helperText="Optional next follow-up"
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
