import React, { FormEvent, useState } from "react";
import { Project } from "@/shared/types";
import { leadSchema } from "@/shared/validation/leadSchema";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";
import Textarea from "@/shared/components/ui/Textarea";
import Button from "@/shared/components/ui/Button";
import Modal from "@/shared/components/ui/Modal";
import FormActions from "@/shared/components/ui/FormActions";

export interface AddLeadFormState {
  name: string;
  phone: string;
  email?: string;
  projectId?: string;
  plotId?: string;
  priority?: string;
  status?: string;
  assignedTo?: string;
  leadNumber?: string;
  createdTime?: string;
  leadSource?: string;
  leadMedium?: string;
  followUpOn?: string;
  followUpDate?: string;
  createdBy?: string;
  notes?: string;
}

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Record<string, Project>;
  addLeadForm: AddLeadFormState;
  setAddLeadForm: React.Dispatch<React.SetStateAction<AddLeadFormState>> | ((updater: (prev: AddLeadFormState) => AddLeadFormState) => void);
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

const ADD_LEAD_FORM_ID = "add-lead-modal-form";

export default function AddLeadModal({
  isOpen,
  onClose,
  projects,
  addLeadForm,
  setAddLeadForm,
  onSubmit,
}: AddLeadModalProps) {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reset errors when modal status changes
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setValidationErrors({});
    }
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate with Zod
    const parseResult = leadSchema.safeParse(addLeadForm);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        if (issue.path.length > 0) {
          errors[String(issue.path[0])] = issue.message;
        }
      });
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    onSubmit(e);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Customer Lead"
      variant="sheet"
      size="lg"
      footer={
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={ADD_LEAD_FORM_ID} variant="primary">
            Create Lead
          </Button>
        </FormActions>
      }
    >
      <form id={ADD_LEAD_FORM_ID} onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Customer Name"
            type="text"
            required
            value={addLeadForm.name}
            onChange={(e) =>
              setAddLeadForm((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="e.g. Ramesh Babu"
            error={validationErrors.name}
          />
          <Input
            label="Phone Number"
            type="tel"
            required
            value={addLeadForm.phone}
            onChange={(e) =>
              setAddLeadForm((prev) => ({
                ...prev,
                phone: e.target.value,
              }))
            }
            placeholder="e.g. 9876543210"
            error={validationErrors.phone}
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          value={addLeadForm.email || ""}
          onChange={(e) =>
            setAddLeadForm((prev) => ({ ...prev, email: e.target.value }))
          }
          placeholder="e.g. customer@gmail.com"
          error={validationErrors.email}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Project Interest"
            value={addLeadForm.projectId || ""}
            onChange={(e) =>
              setAddLeadForm((prev) => ({
                ...prev,
                projectId: e.target.value,
                plotId: "",
              }))
            }
            error={validationErrors.projectId}
          >
            <option value="">Select Project...</option>
            {Object.values(projects).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>

          <Select
            label="Plot Interest"
            value={addLeadForm.plotId || ""}
            onChange={(e) =>
              setAddLeadForm((prev) => ({
                ...prev,
                plotId: e.target.value,
              }))
            }
            disabled={!addLeadForm.projectId}
            helperText={
              !addLeadForm.projectId
                ? "Select a project first"
                : undefined
            }
            error={validationErrors.plotId}
          >
            <option value="">Select Plot...</option>
            {addLeadForm.projectId &&
              projects[addLeadForm.projectId]?.plots
                .filter(
                  (p) =>
                    !["road", "market", "park"].includes(p.status)
                )
                .map((plot) => (
                  <option key={plot.id} value={plot.number}>
                    {plot.number} ({plot.status})
                  </option>
                ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Priority"
            value={addLeadForm.priority || "warm"}
            onChange={(e) =>
              setAddLeadForm((prev) => ({
                ...prev,
                priority: e.target.value,
              }))
            }
            options={[
              { value: "hot", label: "Hot" },
              { value: "warm", label: "Warm" },
              { value: "cold", label: "Cold" },
            ]}
            error={validationErrors.priority}
          />
          <Select
            label="Initial Status"
            value={addLeadForm.status || "new"}
            onChange={(e) =>
              setAddLeadForm((prev) => ({
                ...prev,
                status: e.target.value,
              }))
            }
            options={[
              { value: "new", label: "New" },
              { value: "contacted", label: "Contacted" },
              { value: "interested", label: "Interested" },
              { value: "reserved", label: "Reserved" },
              { value: "booked", label: "Booked" },
              { value: "not-interested", label: "Not Interested" },
            ]}
            error={validationErrors.status}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Lead Number"
            type="text"
            value={addLeadForm.leadNumber || ""}
            onChange={(e) =>
              setAddLeadForm((prev) => ({
                ...prev,
                leadNumber: e.target.value,
              }))
            }
            placeholder="e.g. 1001"
            helperText="Auto-generated if left empty"
          />
          <Input
            label="Created Time"
            type="datetime-local"
            value={
              addLeadForm.createdTime
                ? new Date(
                    new Date(addLeadForm.createdTime).getTime() -
                      new Date().getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16)
                : ""
            }
            onChange={(e) =>
              setAddLeadForm((prev) => ({
                ...prev,
                createdTime: new Date(e.target.value).toISOString(),
              }))
            }
            helperText="Defaults to now if empty"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Lead Source"
            value={addLeadForm.leadSource || "Direct Call"}
            onChange={(e) =>
              setAddLeadForm((prev) => ({
                ...prev,
                leadSource: e.target.value,
              }))
            }
            options={[
              { value: "Google Ads", label: "Google Ads" },
              { value: "Meta Ads", label: "Meta Ads" },
              { value: "Bulk Import", label: "Bulk Import" },
              { value: "Direct Call", label: "Direct Call" },
              { value: "Referral", label: "Referral" },
              { value: "Website", label: "Website" },
            ]}
            error={validationErrors.leadSource}
          />
          <Select
            label="Lead Medium"
            value={addLeadForm.leadMedium || "Direct"}
            onChange={(e) =>
              setAddLeadForm((prev) => ({
                ...prev,
                leadMedium: e.target.value,
              }))
            }
            options={[
              { value: "CPC", label: "CPC" },
              { value: "Organic", label: "Organic" },
              { value: "Referral", label: "Referral" },
              { value: "Social", label: "Social" },
              { value: "Direct", label: "Direct" },
            ]}
            error={validationErrors.leadMedium}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Follow Up On"
            type="date"
            value={
              addLeadForm.followUpOn || addLeadForm.followUpDate || ""
            }
            onChange={(e) =>
              setAddLeadForm((prev) => ({
                ...prev,
                followUpOn: e.target.value,
                followUpDate: e.target.value,
              }))
            }
            helperText="Optional next-touch date"
          />
          <Input
            label="Created By"
            type="text"
            disabled
            value={addLeadForm.createdBy || "system"}
            className="opacity-75"
            helperText="Set automatically"
          />
        </div>

        <Textarea
          label="Overall Initial Notes"
          rows={3}
          value={addLeadForm.notes || ""}
          onChange={(e) =>
            setAddLeadForm((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Enter initial background details..."
          error={validationErrors.notes}
        />
      </form>
    </Modal>
  );
}
