import { useState, FormEvent } from "react";
import { Lead, User, Project } from "@/shared/types";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";
import Textarea from "@/shared/components/ui/Textarea";
import Button from "@/shared/components/ui/Button";
import Modal from "@/shared/components/ui/Modal";
import FormActions from "@/shared/components/ui/FormActions";

interface AdminLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLead: Lead | null;
  users: User[];
  projects: Record<string, Project>;
  onSave: (formData: LeadFormState) => void;
}

interface LeadFormState {
  name: string;
  phone: string;
  email: string;
  projectId: string;
  plotId: string;
  notes: string;
  status: string;
  assignedTo: string;
  priority: string;
  createdTime: string;
  leadSource: string;
  leadMedium: string;
  followUpOn: string;
  leadNumber: string;
  createdBy: string;
}

const ADMIN_LEAD_FORM_ID = "admin-lead-modal-form";

export default function AdminLeadModal({
  isOpen,
  onClose,
  editingLead,
  users,
  projects,
  onSave,
}: AdminLeadModalProps) {
  const [leadForm, setLeadForm] = useState<LeadFormState>(() => {
    if (editingLead) {
      return {
        name: editingLead.name || "",
        phone: editingLead.phone || "",
        email: editingLead.email || "",
        projectId: editingLead.projectId || "",
        plotId: editingLead.plotId || "",
        notes: editingLead.notes || "",
        status: editingLead.status || "new",
        assignedTo: editingLead.assignedTo || "",
        priority: editingLead.priority || "warm",
        createdTime: editingLead.createdTime || "",
        leadSource: editingLead.leadSource || "",
        leadMedium: editingLead.leadMedium || "",
        followUpOn: editingLead.followUpOn || editingLead.followUpDate || "",
        leadNumber: editingLead.leadNumber || "",
        createdBy: editingLead.createdBy || "",
      };
    }
    return {
      name: "",
      phone: "",
      email: "",
      projectId: "",
      plotId: "",
      notes: "",
      status: "new",
      assignedTo: "",
      priority: "warm",
      createdTime: new Date().toISOString(),
      leadSource: "Direct Call",
      leadMedium: "Direct",
      followUpOn: "",
      leadNumber: "",
      createdBy: "system",
    };
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSave(leadForm);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingLead ? "Edit Lead Details" : "Add New Lead"}
      size="md"
      footer={
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={ADMIN_LEAD_FORM_ID} variant="primary">
            Save Lead
          </Button>
        </FormActions>
      }
    >
      <form id={ADMIN_LEAD_FORM_ID} onSubmit={handleSubmit} className="space-y-4 text-sm">
        <Input
          label="Customer Name"
          type="text"
          required
          value={leadForm.name}
          onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
          autoComplete="name"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Assign Agent"
            value={leadForm.assignedTo}
            onChange={(e) => setLeadForm({ ...leadForm, assignedTo: e.target.value })}
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} ({u.role})
              </option>
            ))}
          </Select>
          <Select
            label="Project Interest"
            value={leadForm.projectId}
            onChange={(e) => setLeadForm({ ...leadForm, projectId: e.target.value })}
          >
            <option value="">No Project Interest</option>
            {Object.values(projects).map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Plot Number (Optional)"
            type="text"
            value={leadForm.plotId}
            onChange={(e) => setLeadForm({ ...leadForm, plotId: e.target.value })}
          />
          <Input
            label="Phone Number"
            type="tel"
            required
            value={leadForm.phone}
            onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
            autoComplete="tel"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Customer Email (Optional)"
            type="email"
            value={leadForm.email}
            onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
            autoComplete="email"
          />
          <Input
            label="Created Time"
            type="datetime-local"
            value={
              leadForm.createdTime
                ? new Date(
                    new Date(leadForm.createdTime).getTime() -
                      new Date().getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16)
                : ""
            }
            onChange={(e) =>
              setLeadForm({
                ...leadForm,
                createdTime: new Date(e.target.value).toISOString(),
              })
            }
            helperText="Stored as ISO timestamp"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Lead Source"
            value={leadForm.leadSource || "Direct Call"}
            onChange={(e) => setLeadForm({ ...leadForm, leadSource: e.target.value })}
            options={[
              { value: "Google Ads", label: "Google Ads" },
              { value: "Meta Ads", label: "Meta Ads" },
              { value: "Bulk Import", label: "Bulk Import" },
              { value: "Direct Call", label: "Direct Call" },
              { value: "Referral", label: "Referral" },
              { value: "Website", label: "Website" },
            ]}
          />
          <Select
            label="Lead Medium"
            value={leadForm.leadMedium || "Direct"}
            onChange={(e) => setLeadForm({ ...leadForm, leadMedium: e.target.value })}
            options={[
              { value: "CPC", label: "CPC" },
              { value: "Organic", label: "Organic" },
              { value: "Referral", label: "Referral" },
              { value: "Social", label: "Social" },
              { value: "Direct", label: "Direct" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Follow Up On"
            type="date"
            value={leadForm.followUpOn || ""}
            onChange={(e) =>
              setLeadForm({
                ...leadForm,
                followUpOn: e.target.value,
              })
            }
          />
          <Input
            label="Created By"
            type="text"
            disabled
            value={leadForm.createdBy || "system"}
            className="opacity-75"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Lead Status"
            wrapperClassName="sm:col-span-2"
            value={leadForm.status}
            onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}
            options={[
              { value: "new", label: "New" },
              { value: "contacted", label: "Contacted" },
              { value: "interested", label: "Interested" },
              { value: "reserved", label: "Reserved" },
              { value: "booked", label: "Booked" },
              { value: "not-interested", label: "Not Interested" },
            ]}
          />
          <Select
            label="Priority"
            value={leadForm.priority || "warm"}
            onChange={(e) => setLeadForm({ ...leadForm, priority: e.target.value })}
            options={[
              { value: "hot", label: "Hot" },
              { value: "warm", label: "Warm" },
              { value: "cold", label: "Cold" },
            ]}
          />
        </div>

        <Textarea
          label="Background Notes"
          rows={3}
          value={leadForm.notes}
          onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
        />
      </form>
    </Modal>
  );
}
