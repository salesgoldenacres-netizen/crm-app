import React, { FormEvent, useState } from "react";
import { Lead, Plot } from "@/shared/types";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";
import Textarea from "@/shared/components/ui/Textarea";
import Button from "@/shared/components/ui/Button";
import Modal from "@/shared/components/ui/Modal";
import FormActions from "@/shared/components/ui/FormActions";

interface NewLeadFormState {
  name: string;
  phone: string;
  email: string;
  priority: string;
  notes: string;
}

interface LinkLeadModalProps {
  selectedPlot: Plot;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  leadLinkMode: "existing" | "new";
  setLeadLinkMode: (mode: "existing" | "new") => void;
  leads: Lead[];
  selectedExistingLeadId: string;
  setSelectedExistingLeadId: (id: string) => void;
  newLeadForm: NewLeadFormState;
  setNewLeadForm: React.Dispatch<React.SetStateAction<NewLeadFormState>> | ((updater: (prev: NewLeadFormState) => NewLeadFormState) => void);
}

const LINK_LEAD_FORM_ID = "link-lead-modal-form";

export default function LinkLeadModal({
  selectedPlot,
  onClose,
  onSubmit,
  leadLinkMode,
  setLeadLinkMode,
  leads,
  selectedExistingLeadId,
  setSelectedExistingLeadId,
  newLeadForm,
  setNewLeadForm,
}: LinkLeadModalProps) {
  const [leadSelectError, setLeadSelectError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (leadLinkMode === "existing" && !selectedExistingLeadId) {
      e.preventDefault();
      setLeadSelectError("Select a lead to link");
      return;
    }
    if (leadLinkMode === "new") {
      let blocked = false;
      if (!newLeadForm.name.trim()) {
        setNameError("Enter a customer name");
        blocked = true;
      }
      if (!newLeadForm.phone.trim()) {
        setPhoneError("Enter a phone number");
        blocked = true;
      }
      if (blocked) {
        e.preventDefault();
        return;
      }
    }
    onSubmit(e);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Link Lead to Plot ${selectedPlot.number}`}
      variant="sheet"
      size="md"
      footer={
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={LINK_LEAD_FORM_ID} variant="primary">
            {leadLinkMode === "existing" ? "Link Lead" : "Create & Link"}
          </Button>
        </FormActions>
      }
    >
      <p className="type-label font-semibold text-theme-muted mb-4 -mt-1">
        Associate a customer with this plot location
      </p>

      <div
        className="flex border-b border-theme-border bg-theme-surface/50 -mx-6 px-6 mb-4"
        role="tablist"
        aria-label="Lead link mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={leadLinkMode === "existing"}
          id="link-lead-tab-existing"
          aria-controls={LINK_LEAD_FORM_ID}
          onClick={() => {
            setLeadSelectError(undefined);
            setLeadLinkMode("existing");
          }}
          className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 border-x-0 border-t-0 transition-colors cursor-pointer bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
            leadLinkMode === "existing"
              ? "border-theme-accent text-theme-accent"
              : "border-transparent text-theme-muted"
          }`}
        >
          Link Existing Lead
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={leadLinkMode === "new"}
          id="link-lead-tab-new"
          aria-controls={LINK_LEAD_FORM_ID}
          onClick={() => {
            setNameError(undefined);
            setPhoneError(undefined);
            setLeadLinkMode("new");
          }}
          className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 border-x-0 border-t-0 transition-colors cursor-pointer bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
            leadLinkMode === "new"
              ? "border-theme-accent text-theme-accent"
              : "border-transparent text-theme-muted"
          }`}
        >
          Create & Link New Lead
        </button>
      </div>

      <form
        id={LINK_LEAD_FORM_ID}
        onSubmit={handleSubmit}
        className="space-y-4"
        role="tabpanel"
        aria-labelledby={
          leadLinkMode === "existing"
            ? "link-lead-tab-existing"
            : "link-lead-tab-new"
        }
      >
        {leadLinkMode === "existing" ? (
          <Select
            label="Search and Select Lead"
            required
            value={selectedExistingLeadId}
            error={leadSelectError}
            helperText="Only unassigned leads (no plot) are listed"
            onInvalid={(e) => {
              e.preventDefault();
              setLeadSelectError("Select a lead to link");
            }}
            onChange={(e) => {
              setLeadSelectError(undefined);
              setSelectedExistingLeadId(e.target.value);
            }}
          >
            <option value="">Choose a lead...</option>
            {leads
              .filter((l) => !l.plotId)
              .map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name} ({lead.phone}) - {lead.status}
                </option>
              ))}
          </Select>
        ) : (
          <>
            <Input
              label="Customer Name"
              type="text"
              required
              placeholder="John Doe"
              value={newLeadForm.name}
              error={nameError}
              onInvalid={(e) => {
                e.preventDefault();
                setNameError("Enter a customer name");
              }}
              onChange={(e) => {
                setNameError(undefined);
                setNewLeadForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }));
              }}
            />
            <Input
              label="Phone"
              type="tel"
              required
              placeholder="9876543210"
              value={newLeadForm.phone}
              error={phoneError}
              onInvalid={(e) => {
                e.preventDefault();
                setPhoneError("Enter a phone number");
              }}
              onChange={(e) => {
                setPhoneError(undefined);
                setNewLeadForm((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }));
              }}
            />
            <Input
              label="Email"
              type="email"
              placeholder="customer@gmail.com"
              value={newLeadForm.email}
              helperText="Optional"
              onChange={(e) =>
                setNewLeadForm((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
            />
            <Select
              label="Priority"
              value={newLeadForm.priority || "warm"}
              onChange={(e) =>
                setNewLeadForm((prev) => ({
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
            <Textarea
              label="Initial Note"
              rows={3}
              placeholder="Any additional background notes..."
              value={newLeadForm.notes}
              helperText="Optional background for the new lead"
              onChange={(e) =>
                setNewLeadForm((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
            />
          </>
        )}
      </form>
    </Modal>
  );
}
