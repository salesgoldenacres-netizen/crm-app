import { useState } from "react";
import { User, CustomField } from "@/shared/types";
import Dialog from "@/shared/components/ui/Dialog";

interface CustomFieldsSettingsTabProps {
  customFields: CustomField[];
  saveCustomFields: (fields: CustomField[]) => Promise<void>;
  logAuditEvent: (event: any) => Promise<void>;
  user: User;
}

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

export default function CustomFieldsSettingsTab({
  customFields,
  saveCustomFields,
  logAuditEvent,
  user,
}: CustomFieldsSettingsTabProps) {
  const [customFieldForm, setCustomFieldForm] = useState({
    name: "",
    label: "",
    type: "text",
    options: "",
  });
  const [feedback, setFeedback] = useState<FeedbackDialog | null>(null);

  const handleCreateField = async () => {
    if (!customFieldForm.name || !customFieldForm.label) {
      setFeedback({
        mode: "alert",
        title: "Missing fields",
        description: "Please provide both name and label.",
      });
      return;
    }
    const optionsList =
      customFieldForm.type === "select"
        ? customFieldForm.options
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
        : [];
    const newField: CustomField = {
      name: customFieldForm.name,
      label: customFieldForm.label,
      type: customFieldForm.type,
      options: optionsList,
    };
    const updatedFields = [
      ...customFields.filter((f) => f.name !== newField.name),
      newField,
    ];
    await saveCustomFields(updatedFields);
    await logAuditEvent({
      action: "Add Custom Field",
      details: `Added custom lead field: ${newField.label} (${newField.type})`,
      user: user.username,
    });
    setCustomFieldForm({
      name: "",
      label: "",
      type: "text",
      options: "",
    });
    setFeedback({
      mode: "alert",
      title: "Field added",
      description: "Custom field added successfully!",
    });
  };

  const handleRemoveField = async (f: CustomField) => {
    setFeedback({
      mode: "confirm",
      title: "Remove custom field?",
      description: `Remove custom field "${f.label}"? Existing leads data for this field will not be deleted but won't be editable.`,
      confirmLabel: "Remove",
      confirmVariant: "danger",
      onConfirm: async () => {
        const updated = customFields.filter((field) => field.name !== f.name);
        await saveCustomFields(updated);
        await logAuditEvent({
          action: "Delete Custom Field",
          details: `Deleted custom field: ${f.label}`,
          user: user.username,
        });
        setFeedback(null);
      },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn text-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Field Form */}
        <div className="md:col-span-1 bg-theme-card rounded-theme p-5 border dark:border-gray-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 border-b dark:border-gray-700 pb-2">
            Add New Custom Field
          </h3>
          <div>
            <label className="block text-xs font-semibold text-theme-muted uppercase">
              Field Key (Alphanumeric/slug)
            </label>
            <input
              type="text"
              value={customFieldForm.name}
              onChange={(e) =>
                setCustomFieldForm({
                  ...customFieldForm,
                  name: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""),
                })
              }
              placeholder="e.g. budgetrange"
              className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md text-xs p-2 border"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-theme-muted uppercase">
              Field Label
            </label>
            <input
              type="text"
              value={customFieldForm.label}
              onChange={(e) =>
                setCustomFieldForm({
                  ...customFieldForm,
                  label: e.target.value,
                })
              }
              placeholder="e.g. Budget Range"
              className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md text-xs p-2 border"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-theme-muted uppercase">
              Input Type
            </label>
            <select
              value={customFieldForm.type}
              onChange={(e) =>
                setCustomFieldForm({
                  ...customFieldForm,
                  type: e.target.value,
                })
              }
              className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md text-xs p-2 border"
            >
              <option value="text">Text Input</option>
              <option value="number">Number Input</option>
              <option value="select">Dropdown Options</option>
              <option value="boolean">Checkbox / Toggle</option>
            </select>
          </div>
          {customFieldForm.type === "select" && (
            <div>
              <label className="block text-xs font-semibold text-theme-muted uppercase">
                Dropdown Options (Comma separated)
              </label>
              <input
                type="text"
                value={customFieldForm.options}
                onChange={(e) =>
                  setCustomFieldForm({
                    ...customFieldForm,
                    options: e.target.value,
                  })
                }
                placeholder="e.g. Low, Medium, High"
                className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md text-xs p-2 border"
              />
            </div>
          )}
          <button
            type="button"
            onClick={handleCreateField}
            className="w-full py-2 bg-theme-accent hover:opacity-90 text-white rounded text-xs font-semibold transition-all cursor-pointer font-bold border-0"
          >
            Create Custom Field
          </button>
        </div>

        {/* Active Fields List */}
        <div className="md:col-span-2 bg-theme-card rounded-theme shadow-sm border border-theme-border p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
            Active Custom Fields
          </h3>
          <div className="divide-y divide-theme-border">
            {customFields.length === 0 ? (
              <div className="py-6 text-center text-gray-400 italic">
                No custom fields defined yet.
              </div>
            ) : (
              customFields.map((f) => (
                <div
                  key={f.name}
                  className="py-4 first:pt-0 flex justify-between items-center"
                >
                  {" "}
                  <div>
                    <div className="font-bold text-theme-text text-sm">
                      {f.label}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      Key: {f.name} | Type: {f.type}
                    </div>
                    {f.options && f.options.length > 0 && (
                      <div className="text-[10px] text-gray-500 mt-1">
                        Options: {f.options.join(", ")}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveField(f)}
                    className="text-red-600 hover:text-red-800 font-semibold text-xs cursor-pointer font-bold border-0 bg-transparent"
                  >
                    Remove Field
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
