import React, { FormEvent, useState } from "react";
import { PhoneCall } from "lucide-react";
import { QUICK_CALL_TEMPLATES } from "../constants/leadTemplates";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";
import Textarea from "@/shared/components/ui/Textarea";
import FormActions from "@/shared/components/ui/FormActions";

export interface CallLogFormState {
  note: string;
  disposition?: string;
  priority?: string;
  status?: string;
  followUpDate?: string;
}

interface CallLoggingFormProps {
  callLogForm: CallLogFormState;
  setCallLogForm: React.Dispatch<React.SetStateAction<CallLogFormState>> | ((updater: (prev: CallLogFormState) => CallLogFormState) => void);
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export default function CallLoggingForm({
  callLogForm,
  setCallLogForm,
  onSubmit,
}: CallLoggingFormProps) {
  const [noteError, setNoteError] = useState<string | undefined>();

  return (
    <div className="card-premium p-6 space-y-5">
      <h4 className="type-label font-semibold text-theme-muted uppercase tracking-wider flex items-center border-b border-theme-border pb-2.5">
        <PhoneCall className="w-4 h-4 mr-2 text-theme-accent" aria-hidden="true" />
        Log Call Outcomes
      </h4>

      <form onSubmit={onSubmit} className="space-y-4">
        <fieldset className="border-0 p-0 m-0 min-w-0">
          <legend className="type-label font-semibold text-theme-muted block mb-2 px-0">
            Quick Note Templates
          </legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Quick note templates">
            {QUICK_CALL_TEMPLATES.map((temp) => (
              <button
                type="button"
                key={temp.label}
                aria-label={`Append note template: ${temp.label}`}
                onClick={() => {
                  setNoteError(undefined);
                  setCallLogForm((prev) => ({
                    ...prev,
                    note:
                      (prev.note ? prev.note + "\n" : "") + temp.text,
                  }));
                }}
                className="px-2.5 py-1 rounded-theme bg-theme-accent-muted hover:bg-[color-mix(in_srgb,var(--primary-color)_18%,transparent)] border border-theme-accent/25 text-[10px] font-semibold text-theme-accent cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              >
                {temp.label}
              </button>
            ))}
          </div>
        </fieldset>

        <Textarea
          label="Call Conversation Summary"
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
          placeholder="Enter detailed summary of conversation..."
          helperText="Summarize what was discussed; templates above append to this field"
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Call Disposition"
            value={callLogForm.disposition || "Connected"}
            onChange={(e) =>
              setCallLogForm((prev) => ({
                ...prev,
                disposition: e.target.value,
              }))
            }
            options={[
              { value: "Connected", label: "Connected" },
              { value: "Ringing/Unanswered", label: "Ringing / No Answer" },
              { value: "Busy", label: "Busy / Callback" },
              { value: "Switched Off", label: "Switched Off" },
            ]}
          />
          <Select
            label="Priority Classification"
            value={callLogForm.priority || "warm"}
            onChange={(e) =>
              setCallLogForm((prev) => ({
                ...prev,
                priority: e.target.value,
              }))
            }
            options={[
              { value: "hot", label: "Hot" },
              { value: "warm", label: "Warm" },
              { value: "cold", label: "Cold" },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Update Status Stage"
            value={callLogForm.status || "new"}
            onChange={(e) =>
              setCallLogForm((prev) => ({ ...prev, status: e.target.value }))
            }
            options={[
              { value: "new", label: "New Inbox" },
              { value: "contacted", label: "Contacted / Ringing" },
              { value: "interested", label: "Interested Prospect" },
              { value: "reserved", label: "Reserved Unit" },
              { value: "booked", label: "Booked Sale" },
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
          />
        </div>

        <FormActions
          primaryLabel="Save Call Log & Update Status"
          primaryType="submit"
          secondaryLabel=""
          className="[&>button]:w-full sm:[&>button]:w-auto"
        />
      </form>
    </div>
  );
}
