import React, { useState } from "react";
import { User, CustomRole } from "@/shared/types";
import { createUserSchema, updateUserSchema } from "@/shared/validation/userSchema";
import Modal from "@/shared/components/ui/Modal";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";
import Checkbox from "@/shared/components/ui/Checkbox";
import Button from "@/shared/components/ui/Button";
import FormActions from "@/shared/components/ui/FormActions";

interface UserFormState {
  username: string;
  /** Auth-only on create; never persisted to Firestore. */
  password?: string;
  role: string;
  hideFinancials: boolean;
  hideEmail: boolean;
  hideLeadSource: boolean;
  allowExport: boolean;
}

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser: User | null;
  customRoles: CustomRole[];
  isManagerial: (role: string) => boolean;
  onSave: (formData: UserFormState) => void | Promise<void>;
}

export default function UserAccountModal({
  isOpen,
  onClose,
  editingUser,
  customRoles,
  isManagerial,
  onSave,
}: UserAccountModalProps) {
  const [userForm, setUserForm] = useState<UserFormState>({
    username: "",
    password: "",
    role: "telecaller",
    hideFinancials: true,
    hideEmail: false,
    hideLeadSource: false,
    allowExport: true,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [prevEditingUser, setPrevEditingUser] = useState<any>(editingUser);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (editingUser !== prevEditingUser || isOpen !== prevIsOpen) {
    setPrevEditingUser(editingUser);
    setPrevIsOpen(isOpen);
    if (editingUser) {
      setUserForm({
        username: editingUser.username || "",
        password: "",
        role: editingUser.role || "telecaller",
        hideFinancials: !!editingUser.hideFinancials,
        hideEmail: !!editingUser.hideEmail,
        hideLeadSource: !!editingUser.hideLeadSource,
        allowExport: editingUser.allowExport !== false,
      });
    } else {
      setUserForm({
        username: "",
        password: "",
        role: "telecaller",
        hideFinancials: true,
        hideEmail: false,
        hideLeadSource: false,
        allowExport: true,
      });
    }
    setValidationErrors({});
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const schema = editingUser ? updateUserSchema : createUserSchema;
    const parseResult = schema.safeParse(userForm);
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
    onSave(userForm);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingUser ? "Edit User Account" : "Add New User Account"}
      footer={
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="user-account-form" variant="primary">
            Save User
          </Button>
        </FormActions>
      }
    >
      <form id="user-account-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Username"
          type="text"
          required
          value={userForm.username}
          onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
          error={validationErrors.username}
          placeholder="e.g. aditya_s"
        />

        {!editingUser && (
          <Input
            label="Password"
            type="password"
            required
            value={userForm.password || ""}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            error={validationErrors.password}
            placeholder="Used for Firebase Auth only"
            autoComplete="new-password"
          />
        )}

        <Select
          label="Role"
          value={userForm.role}
          onChange={(e) => {
            const role = e.target.value;
            setUserForm({
              ...userForm,
              role,
              hideFinancials: !isManagerial(role)
                ? userForm.hideFinancials !== undefined
                  ? userForm.hideFinancials
                  : true
                : false,
              hideEmail: !isManagerial(role)
                ? userForm.hideEmail !== undefined
                  ? userForm.hideEmail
                  : false
                : false,
              hideLeadSource: !isManagerial(role)
                ? userForm.hideLeadSource !== undefined
                  ? userForm.hideLeadSource
                  : false
                : false,
              allowExport: !isManagerial(role)
                ? userForm.allowExport !== undefined
                  ? userForm.allowExport
                  : true
                : true,
            });
          }}
        >
          {customRoles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>

        {!isManagerial(userForm.role) && (
          <div
            role="group"
            aria-labelledby="user-permissions-heading"
            className="space-y-3 mt-3 border-t border-theme-border pt-3 text-xs"
          >
            <h4
              id="user-permissions-heading"
              className="type-label font-semibold uppercase tracking-wider text-theme-muted"
            >
              Permissions & Privacy
            </h4>
            <Checkbox
              id="hideFinancials"
              label="Hide Rate & Price fields"
              checked={userForm.hideFinancials || false}
              onChange={(e) =>
                setUserForm({
                  ...userForm,
                  hideFinancials: e.target.checked,
                })
              }
            />
            <Checkbox
              id="hideEmail"
              label="Hide Customer Email Address"
              checked={userForm.hideEmail || false}
              onChange={(e) =>
                setUserForm({
                  ...userForm,
                  hideEmail: e.target.checked,
                })
              }
            />
            <Checkbox
              id="hideLeadSource"
              label="Hide Lead Source & Medium"
              checked={userForm.hideLeadSource || false}
              onChange={(e) =>
                setUserForm({
                  ...userForm,
                  hideLeadSource: e.target.checked,
                })
              }
            />
            <Checkbox
              id="allowExport"
              label="Allow Exporting Data to CSV"
              checked={userForm.allowExport !== false}
              onChange={(e) =>
                setUserForm({
                  ...userForm,
                  allowExport: e.target.checked,
                })
              }
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
