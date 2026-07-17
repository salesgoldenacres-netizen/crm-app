import React, { useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { CustomRole } from "@/shared/types";
import Modal from "@/shared/components/ui/Modal";
import Dialog from "@/shared/components/ui/Dialog";
import Input from "@/shared/components/ui/Input";
import Checkbox from "@/shared/components/ui/Checkbox";
import Button from "@/shared/components/ui/Button";
import FormActions from "@/shared/components/ui/FormActions";

type FeedbackDialog =
  | { mode: "alert"; title: string; description: string }
  | {
      mode: "confirm";
      title: string;
      description: string;
      confirmLabel?: string;
      confirmVariant?: "primary" | "danger" | "success";
      onConfirm: () => void | Promise<void>;
    };

const ROLE_FORM_ID = "role-settings-form";
const ROLE_ERROR_ID = "role-settings-error";

const TH =
  "px-6 py-3.5 text-left text-xs font-semibold text-theme-muted uppercase tracking-wider";
const TD = "px-6 py-4 whitespace-nowrap";
const RESTRICTION_CHIP =
  "inline-flex px-1.5 py-0.5 bg-theme-danger/10 text-theme-danger rounded-theme text-[9px] font-semibold border border-theme-danger/25";
const PRIVILEGE_CHIP =
  "px-2 py-0.5 bg-theme-accent-muted text-theme-accent rounded-theme text-[10px] font-semibold uppercase tracking-wider";
const SYSTEM_CHIP =
  "ml-2 px-1.5 py-0.5 text-[8px] bg-theme-surface text-theme-muted border border-theme-border rounded-theme font-semibold uppercase";

interface RolesSettingsTabProps {
  customRoles: CustomRole[];
  addCustomRole: (roleData: {
    code: string;
    name: string;
    isManagerial?: boolean;
    hideFinancials?: boolean;
    hideEmail?: boolean;
    hideLeadSource?: boolean;
    allowExport?: boolean;
  }) => Promise<void>;
  updateCustomRole: (id: string, updates: Partial<CustomRole>) => Promise<void>;
  deleteCustomRole: (id: string) => Promise<void>;
}

export default function RolesSettingsTab({
  customRoles,
  addCustomRole,
  updateCustomRole,
  deleteCustomRole,
}: RolesSettingsTabProps) {
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: "",
    code: "",
    isManagerial: false,
    hideFinancials: false,
    hideEmail: false,
    hideLeadSource: false,
    allowExport: true,
  });
  const [roleError, setRoleError] = useState("");
  const [feedback, setFeedback] = useState<FeedbackDialog | null>(null);

  const handleOpenAddModal = () => {
    setEditingRole(null);
    setRoleForm({
      name: "",
      code: "",
      isManagerial: false,
      hideFinancials: false,
      hideEmail: false,
      hideLeadSource: false,
      allowExport: true,
    });
    setRoleError("");
    setIsRoleModalOpen(true);
  };

  const handleOpenEditModal = (role: CustomRole) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name || "",
      code: role.id || "",
      isManagerial: !!role.isManagerial,
      hideFinancials: !!role.hideFinancials,
      hideEmail: !!role.hideEmail,
      hideLeadSource: !!role.hideLeadSource,
      allowExport: role.allowExport !== false,
    });
    setRoleError("");
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name || !roleForm.code) {
      setRoleError("Role name and code are required.");
      return;
    }

    const cleanCode = roleForm.code.trim().toLowerCase();
    if (cleanCode === "admin" || cleanCode === "telecaller") {
      setRoleError(
        "Cannot override default reserved roles 'admin' or 'telecaller'."
      );
      return;
    }

    try {
      if (editingRole) {
        await updateCustomRole(editingRole.id, {
          name: roleForm.name,
          isManagerial: roleForm.isManagerial,
          hideFinancials: roleForm.hideFinancials,
          hideEmail: roleForm.hideEmail,
          hideLeadSource: roleForm.hideLeadSource,
          allowExport: roleForm.allowExport,
        });
      } else {
        await addCustomRole({
          ...roleForm,
          code: cleanCode,
        });
      }
      setIsRoleModalOpen(false);
    } catch (err: any) {
      setRoleError(err.message || "Failed to save custom role.");
    }
  };

  const handleDeleteRole = async (roleId: string, roleCode: string) => {
    if (roleCode === "admin" || roleCode === "telecaller") {
      setFeedback({
        mode: "alert",
        title: "Cannot delete role",
        description: "Reserved system roles cannot be deleted.",
      });
      return;
    }
    setFeedback({
      mode: "confirm",
      title: "Delete custom role?",
      description:
        "Are you sure you want to delete this custom role? Users assigned to it will be reassigned to the default 'telecaller' role.",
      confirmLabel: "Delete",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          await deleteCustomRole(roleId);
          setFeedback(null);
        } catch (err: any) {
          setFeedback({
            mode: "alert",
            title: "Delete failed",
            description: err.message || "Failed to delete role.",
          });
        }
      },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn text-sm">
      <div className="flex justify-end mb-3">
        <Button type="button" variant="primary" size="sm" onClick={handleOpenAddModal}>
          <Plus className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
          Add Role
        </Button>
      </div>

      <div className="bg-theme-warning/10 border border-theme-warning/30 rounded-xl p-4 flex items-start space-x-3 text-theme-warning">
        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div>
          <h4 className="type-label font-semibold uppercase tracking-wider">
            Role Constraints & Precedents
          </h4>
          <p className="text-xs mt-1 leading-relaxed text-theme-text">
            System preset roles (e.g.{" "}
            <code className="font-mono bg-theme-warning/15 px-1 rounded-theme">
              admin
            </code>
            ,{" "}
            <code className="font-mono bg-theme-warning/15 px-1 rounded-theme">
              telecaller
            </code>
            ) are protected and cannot be deleted. Enabling{" "}
            <strong className="font-semibold">Managerial Privilege</strong>{" "}
            grants full Administrative privileges, including access to this Admin
            panel, and automatically bypasses all data restrictions.
          </p>
        </div>
      </div>

      <div className="bg-theme-card rounded-xl border border-theme-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-theme-border">
            <thead className="bg-theme-surface/40">
              <tr>
                <th className={TH}>Role Name</th>
                <th className={TH}>Role Code</th>
                <th className={TH}>Privileges</th>
                <th className={TH}>Restrictions</th>
                <th className={`${TH} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="bg-theme-card divide-y divide-theme-border text-xs">
              <tr>
                <td className={`${TD} font-semibold text-theme-text`}>
                  <span className="inline-flex items-center">
                    Administrator
                    <span className={SYSTEM_CHIP}>System Default</span>
                  </span>
                </td>
                <td className={`${TD} font-mono font-semibold text-theme-muted`}>
                  admin
                </td>
                <td className={TD}>
                  <span className={PRIVILEGE_CHIP}>Full Admin Access</span>
                </td>
                <td className={`${TD} text-theme-muted`}>None</td>
                <td className={`${TD} text-right text-theme-muted italic`}>
                  Protected
                </td>
              </tr>

              <tr>
                <td className={`${TD} font-semibold text-theme-text`}>
                  <span className="inline-flex items-center">
                    Standard Telecaller
                    <span className={SYSTEM_CHIP}>System Default</span>
                  </span>
                </td>
                <td className={`${TD} font-mono font-semibold text-theme-muted`}>
                  telecaller
                </td>
                <td className={`${TD} text-theme-muted font-medium`}>
                  Standard Telecaller Workspace
                </td>
                <td className={`${TD} text-theme-muted`}>
                  Depends on Project Assignments
                </td>
                <td className={`${TD} text-right text-theme-muted italic`}>
                  Protected
                </td>
              </tr>

              {customRoles.map((role) => (
                <tr key={role.id}>
                  <td className={`${TD} font-semibold text-theme-text`}>
                    {role.name}
                  </td>
                  <td className={`${TD} font-mono font-semibold text-theme-muted`}>
                    {role.id}
                  </td>
                  <td className={TD}>
                    {role.isManagerial ? (
                      <span className={PRIVILEGE_CHIP}>Admin Privileges</span>
                    ) : (
                      <span className="text-theme-muted">Workspace Member</span>
                    )}
                  </td>
                  <td className={`${TD} space-x-1`}>
                    {role.hideFinancials && (
                      <span className={RESTRICTION_CHIP}>Financials Hidden</span>
                    )}
                    {role.hideEmail && (
                      <span className={RESTRICTION_CHIP}>Emails Hidden</span>
                    )}
                    {role.hideLeadSource && (
                      <span className={RESTRICTION_CHIP}>
                        Lead Source Hidden
                      </span>
                    )}
                    {!role.allowExport && (
                      <span className={RESTRICTION_CHIP}>Export Disabled</span>
                    )}
                    {!role.hideFinancials &&
                      !role.hideEmail &&
                      !role.hideLeadSource &&
                      role.allowExport && (
                        <span className="text-theme-muted">None</span>
                      )}
                  </td>
                  <td className={`${TD} text-right space-x-2 font-semibold`}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(role)}
                      className="text-theme-accent hover:underline border-0 bg-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRole(role.id, role.id)}
                      className="text-theme-danger hover:underline border-0 bg-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={
          editingRole ? `Edit Role: ${editingRole.name}` : "Create Custom Role"
        }
        footer={
          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRoleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form={ROLE_FORM_ID} variant="primary">
              Save Role
            </Button>
          </FormActions>
        }
      >
        <form id={ROLE_FORM_ID} onSubmit={handleSaveRole} className="space-y-4">
          {roleError && (
            <p
              id={ROLE_ERROR_ID}
              role="alert"
              className="text-xs font-medium text-theme-danger bg-theme-danger/10 border border-theme-danger/25 p-2.5 rounded-theme"
            >
              {roleError}
            </p>
          )}

          <Input
            label="Role Display Name"
            type="text"
            required
            placeholder="e.g. Sales Manager"
            value={roleForm.name}
            onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
            aria-describedby={roleError ? ROLE_ERROR_ID : undefined}
          />

          <Input
            label="Role System Code"
            type="text"
            required
            disabled={!!editingRole}
            placeholder="e.g. sales_manager"
            value={roleForm.code}
            onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value })}
            helperText="Alphabetic key, no spaces"
            className={editingRole ? "opacity-50" : undefined}
            aria-describedby={roleError ? ROLE_ERROR_ID : undefined}
          />

          <div
            role="group"
            aria-labelledby="role-permissions-heading"
            className="border-t border-theme-border pt-3 space-y-3"
          >
            <span
              id="role-permissions-heading"
              className="type-label font-semibold text-theme-muted uppercase tracking-wider block"
            >
              Permissions & Access Control
            </span>

            <Checkbox
              label="Managerial Privilege"
              checked={roleForm.isManagerial}
              onChange={(e) =>
                setRoleForm({ ...roleForm, isManagerial: e.target.checked })
              }
              helperText="Grants administrative panel capabilities. Automatically ignores restrictions."
            />

            <Checkbox
              label="Hide Financial Columns"
              checked={roleForm.hideFinancials}
              disabled={roleForm.isManagerial}
              onChange={(e) =>
                setRoleForm({ ...roleForm, hideFinancials: e.target.checked })
              }
              helperText="Hides rate, plot cost, discount, and pricing calculators."
            />

            <Checkbox
              label="Hide Email Addresses"
              checked={roleForm.hideEmail}
              disabled={roleForm.isManagerial}
              onChange={(e) =>
                setRoleForm({ ...roleForm, hideEmail: e.target.checked })
              }
              helperText="Hides email info in tables and lead details drawer."
            />

            <Checkbox
              label="Hide Lead Acquisition Source"
              checked={roleForm.hideLeadSource}
              disabled={roleForm.isManagerial}
              onChange={(e) =>
                setRoleForm({ ...roleForm, hideLeadSource: e.target.checked })
              }
              helperText="Masks UTM campaign parameters, Google/Facebook referrer names."
            />

            <Checkbox
              label="Allow Excel / CSV Export"
              checked={roleForm.allowExport}
              disabled={roleForm.isManagerial}
              onChange={(e) =>
                setRoleForm({ ...roleForm, allowExport: e.target.checked })
              }
              helperText="Enables downloading tables or lists of assigned client logs."
            />
          </div>
        </form>
      </Modal>

      <Dialog
        isOpen={!!feedback}
        onClose={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        description={feedback?.description}
        cancelLabel={feedback?.mode === "alert" ? "OK" : "Cancel"}
        confirmLabel={
          feedback?.mode === "confirm"
            ? feedback.confirmLabel ?? "Confirm"
            : undefined
        }
        confirmVariant={
          feedback?.mode === "confirm"
            ? feedback.confirmVariant ?? "primary"
            : undefined
        }
        onConfirm={
          feedback?.mode === "confirm" ? feedback.onConfirm : undefined
        }
      />
    </div>
  );
}
