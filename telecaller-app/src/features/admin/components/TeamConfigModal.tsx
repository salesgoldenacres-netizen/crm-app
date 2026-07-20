import { useState } from "react";
import { User, Team } from "@/shared/types";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";
import Checkbox from "@/shared/components/ui/Checkbox";
import Button from "@/shared/components/ui/Button";
import Modal from "@/shared/components/ui/Modal";
import FormActions from "@/shared/components/ui/FormActions";

interface TeamConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTeam: Team | null;
  users: User[];
  onSave: (formData: { name: string; leadId: string; memberIds: string[] }) => void | Promise<void>;
}

const TEAM_FORM_ID = "team-config-modal-form";

export default function TeamConfigModal({
  isOpen,
  onClose,
  editingTeam,
  users,
  onSave,
}: TeamConfigModalProps) {
  const [newTeamName, setNewTeamName] = useState(() =>
    editingTeam ? editingTeam.name || "" : ""
  );
  const [newTeamLeadId, setNewTeamLeadId] = useState(() =>
    editingTeam ? editingTeam.leadId || "" : ""
  );
  const [newTeamMemberIds, setNewTeamMemberIds] = useState<string[]>(() =>
    editingTeam ? editingTeam.memberIds || [] : []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: newTeamName,
      leadId: newTeamLeadId,
      memberIds: newTeamMemberIds,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTeam ? "Edit Team" : "Add New Team"}
      variant="sheet"
      size="md"
      footer={
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={TEAM_FORM_ID} variant="primary">
            Save Team
          </Button>
        </FormActions>
      }
    >
      <form id={TEAM_FORM_ID} onSubmit={handleSubmit} className="space-y-4 text-sm">
        <Input
          label="Team Name"
          type="text"
          required
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          placeholder="e.g. Sales Team Alpha"
        />
        <Select
          label="Team Lead"
          value={newTeamLeadId}
          onChange={(e) => setNewTeamLeadId(e.target.value)}
        >
          <option value="">No Lead Assigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username} ({u.role})
            </option>
          ))}
        </Select>
        <div role="group" aria-labelledby="team-members-heading">
          <span
            id="team-members-heading"
            className="type-label font-semibold text-theme-muted block mb-1.5"
          >
            Team Members
          </span>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-theme-border p-3 rounded-theme bg-theme-surface">
            {users.map((u) => {
              const isChecked = newTeamMemberIds.includes(u.id);
              return (
                <Checkbox
                  key={u.id}
                  label={`${u.username} (${u.role})`}
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setNewTeamMemberIds([...newTeamMemberIds, u.id]);
                    } else {
                      setNewTeamMemberIds(
                        newTeamMemberIds.filter((id) => id !== u.id)
                      );
                    }
                  }}
                />
              );
            })}
            {users.length === 0 && (
              <p className="text-xs text-theme-muted italic">
                No users available.
              </p>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
