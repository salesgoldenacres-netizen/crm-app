import { useState, FormEvent } from "react";
import {
  CheckCircle,
  PlusCircle,
  FileText,
  User as UserIcon,
  Briefcase,
  Activity,
} from "lucide-react";
import { User, Project } from "@/shared/types";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";
import Textarea from "@/shared/components/ui/Textarea";
import Button from "@/shared/components/ui/Button";
import FormActions from "@/shared/components/ui/FormActions";

interface LeadSubmissionFormProps {
  user: User;
  projects: Record<string, Project>;
  isManagerial: (role?: string) => boolean;
  addLead: (leadData: any) => Promise<{ isDuplicate?: boolean; name?: string } | null | undefined>;
  toast: (msg: string, type: "success" | "warning" | "error" | "info") => void;
  setLeadsSubTab: (tab: string) => void;
}

interface AddLeadFormState {
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
  followUpDate?: string;
  leadNumber: string;
  createdBy: string;
}

const SECTION_TITLE_CLASS =
  "type-label font-semibold text-theme-accent uppercase tracking-widest border-b border-theme-border pb-1.5 flex items-center";

export default function LeadSubmissionForm({
  user,
  projects,
  isManagerial,
  addLead,
  toast,
  setLeadsSubTab,
}: LeadSubmissionFormProps) {
  const [formSuccess, setFormSuccess] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState<AddLeadFormState>({
    name: "",
    phone: "",
    email: "",
    projectId: "",
    plotId: "",
    notes: "",
    status: "new",
    assignedTo: !isManagerial(user.role) ? user.id : "",
    priority: "warm",
    createdTime: "",
    leadSource: "Direct Call",
    leadMedium: "Direct",
    followUpOn: "",
    leadNumber: "",
    createdBy: user.username,
  });

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let assignedName = "Unassigned";
    if (addLeadForm.assignedTo === user.id) {
      assignedName = user.username;
    }

    try {
      const result = await addLead({
        ...addLeadForm,
        createdTime: addLeadForm.createdTime || new Date().toISOString(),
        assignedToName: assignedName,
      });
      if (result?.isDuplicate) {
        toast(
          `Duplicate detected — merged into existing lead for ${result.name}`,
          "warning"
        );
      } else {
        toast(
          `Lead "${addLeadForm.name || "New Lead"}" added successfully!`,
          "success"
        );
      }
    } catch (err: any) {
      toast(`Failed to add lead: ${err.message || err}`, "error");
      return;
    }

    // Reset form
    setAddLeadForm({
      name: "",
      phone: "",
      email: "",
      projectId: "",
      plotId: "",
      notes: "",
      status: "new",
      assignedTo: !isManagerial(user.role) ? user.id : "",
      priority: "warm",
      createdTime: "",
      leadSource: "Direct Call",
      leadMedium: "Direct",
      followUpOn: "",
      leadNumber: "",
      createdBy: user.username,
    });
    setFormSuccess(true);
  };

  if (formSuccess) {
    return (
      <div className="max-w-4xl mx-auto my-4">
        <div className="card-premium p-8 text-center space-y-6 transform animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-theme bg-theme-success/10 text-theme-success mb-2">
            <CheckCircle className="w-8 h-8" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-semibold text-theme-text tracking-tight">
            Lead Created Successfully
          </h2>
          <p className="text-sm text-theme-muted max-w-md mx-auto">
            The new lead profile has been successfully committed to the database and automatically assigned.
          </p>
          <FormActions className="justify-center pt-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => setFormSuccess(false)}
              className="w-full sm:w-auto"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Create Another Lead
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormSuccess(false);
                setLeadsSubTab("list");
              }}
              className="w-full sm:w-auto"
            >
              <FileText className="w-4 h-4 mr-1.5" aria-hidden="true" />
              View Leads List
            </Button>
          </FormActions>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-4">
      <div className="card-premium overflow-hidden">
        {/* Header Banner */}
        <div className="bg-theme-accent p-6 text-theme-accent-fg relative">
          <div className="relative z-10 flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-theme">
              <PlusCircle className="w-6 h-6 text-theme-accent-fg/80" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                New Customer Submission Form
              </h2>
              <p className="text-[11px] text-theme-accent-fg/80 font-medium uppercase tracking-wider mt-0.5">
                Quickly seed leads directly into the CRM
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="p-8 space-y-6">
          {/* Section 1: Customer Profile */}
          <div className="space-y-4">
            <h3 className={SECTION_TITLE_CLASS}>
              <UserIcon className="w-3.5 h-3.5 mr-1.5 text-theme-accent" aria-hidden="true" />
              Customer Profile
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Customer Name"
                type="text"
                required
                value={addLeadForm.name}
                onChange={(e) =>
                  setAddLeadForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="e.g. Ramesh Babu"
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
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              value={addLeadForm.email}
              onChange={(e) =>
                setAddLeadForm((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
              placeholder="e.g. customer@gmail.com"
            />
          </div>

          {/* Section 2: Requirement Details */}
          <div className="space-y-4 pt-2">
            <h3 className={SECTION_TITLE_CLASS}>
              <Briefcase className="w-3.5 h-3.5 mr-1.5 text-theme-accent" aria-hidden="true" />
              Requirement Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Project Interest"
                value={addLeadForm.projectId}
                onChange={(e) =>
                  setAddLeadForm((prev) => ({
                    ...prev,
                    projectId: e.target.value,
                    plotId: "",
                  }))
                }
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
                value={addLeadForm.plotId}
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
              >
                <option value="">Select Plot...</option>
                {addLeadForm.projectId &&
                  projects[addLeadForm.projectId]?.plots
                    .filter((p) => !["road", "market", "park"].includes(p.status))
                    .map((plot) => (
                      <option key={plot.id} value={plot.number}>
                        {plot.number} ({plot.status})
                      </option>
                    ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              />
              <Select
                label="Initial Status"
                value={addLeadForm.status}
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
              />
            </div>
          </div>

          {/* Section 3: Logistics & Meta */}
          <div className="space-y-4 pt-2">
            <h3 className={SECTION_TITLE_CLASS}>
              <Activity className="w-3.5 h-3.5 mr-1.5 text-theme-accent" aria-hidden="true" />
              Source & Meta Logistics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Follow Up On"
                type="date"
                value={addLeadForm.followUpOn || addLeadForm.followUpDate || ""}
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
                value={addLeadForm.createdBy || user.username}
                className="opacity-75"
                helperText="Set automatically from your account"
              />
            </div>
          </div>

          <Textarea
            label="Overall Initial Notes"
            rows={3}
            value={addLeadForm.notes}
            onChange={(e) =>
              setAddLeadForm((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Enter initial background details about the customer's request..."
          />

          <div className="pt-4">
            <FormActions
              primaryLabel="Commit & Create Lead"
              primaryType="submit"
              secondaryLabel=""
            />
          </div>
        </form>
      </div>
    </div>
  );
}
