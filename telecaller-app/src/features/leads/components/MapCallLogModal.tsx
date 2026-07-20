import React, { FormEvent, useState } from "react";
import { PhoneCall } from "lucide-react";
import { Lead } from "@/shared/types";
import { CallLogFormState } from "./CallLoggingForm";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";
import Textarea from "@/shared/components/ui/Textarea";
import Button from "@/shared/components/ui/Button";
import Modal from "@/shared/components/ui/Modal";
import FormActions from "@/shared/components/ui/FormActions";

interface MapCallLogModalProps {
  activeMapLead: Lead;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  callLogForm: CallLogFormState;
  setCallLogForm: React.Dispatch<React.SetStateAction<CallLogFormState>> | ((updater: (prev: CallLogFormState) => CallLogFormState) => void);
}

const MAP_CALL_LOG_FORM_ID = "map-call-log-form";

export default function MapCallLogModal({
  activeMapLead,
  onClose,
  onSubmit,
  callLogForm,
  setCallLogForm,
}: MapCallLogModalProps) {
  const [noteError, setNoteError] = useState<string | undefined>();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!callLogForm.note?.trim()) {
      e.preventDefault();
      setNoteError("Enter a call conversation summary");
      return;
    }
    onSubmit(e);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Call Log for ${activeMapLead.name}`}
      variant="sheet"
      size="md"
      footer={
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={MAP_CALL_LOG_FORM_ID} variant="primary">
            Save Call Log
          </Button>
        </FormActions>
      }
    >
      <form id={MAP_CALL_LOG_FORM_ID} onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div className="flex items-center gap-2 text-theme-muted mb-1">
          <PhoneCall className="w-4 h-4 text-theme-accent" aria-hidden="true" />
          <span className="type-label font-semibold">Map call outcome</span>
        </div>

        <Textarea
          label="Call Notes / Summary"
          required
          rows={3}
          value={callLogForm.note}
          error={noteError}
          onInvalid={(e) => {
            e.preventDefault();
            setNoteError("Enter a call conversation summary");
          }}
          onChange={(e) => {
            setNoteError(undefined);
            setCallLogForm((prev) => ({ ...prev, note: e.target.value }));
          }}
          placeholder="Describe call outcome..."
          helperText="Summarize what was discussed on the map call"
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Update Lead Status"
            value={callLogForm.status || "new"}
            onChange={(e) =>
              setCallLogForm((prev) => ({ ...prev, status: e.target.value }))
            }
            options={[
              { value: "new", label: "New" },
              { value: "contacted", label: "Contacted" },
              { value: "interested", label: "Interested" },
              { value: "reserved", label: "Reserved" },
              { value: "booked", label: "Booked" },
              { value: "not-interested", label: "Not Interested" },
            ]}
          />
          <Input
            label="Next Follow Up Date"
            type="date"
            value={callLogForm.followUpDate || ""}
            onChange={(e) =>
              setCallLogForm((prev) => ({
                ...prev,
                followUpDate: e.target.value,
              }))
            }
            helperText="Optional next follow-up"
          />
        </div>
      </form>
    </Modal>
  );
}
