import React from "react";
import Select from "@/shared/components/ui/Select";

export interface FieldMappings {
  name: string;
  phone: string;
  email: string;
  projectId: string;
  plotId: string;
  status: string;
  notes: string;
  createdTime: string;
  leadSource: string;
  leadMedium: string;
  followUpOn: string;
  assignedTo: string;
  leadNumber: string;
  createdBy: string;
}

interface MappingSelectorPanelProps {
  fieldMappings: FieldMappings;
  setFieldMappings: React.Dispatch<React.SetStateAction<FieldMappings>>;
  csvHeaders: string[];
}

export default function MappingSelectorPanel({
  fieldMappings,
  setFieldMappings,
  csvHeaders,
}: MappingSelectorPanelProps) {
  const fieldsConfig: {
    key: keyof FieldMappings;
    label: string;
    required?: boolean;
    isFullWidth?: boolean;
  }[] = [
    { key: "name", label: "Customer Name" },
    { key: "phone", label: "Phone Number", required: true },
    { key: "email", label: "Email" },
    { key: "projectId", label: "Project ID" },
    { key: "plotId", label: "Plot Number" },
    { key: "status", label: "Lead Status" },
    { key: "createdTime", label: "Created Time" },
    { key: "leadSource", label: "Lead Source" },
    { key: "leadMedium", label: "Lead Medium" },
    { key: "followUpOn", label: "Follow Up On" },
    { key: "assignedTo", label: "Assigned To" },
    { key: "leadNumber", label: "Lead Number" },
    { key: "createdBy", label: "Created By" },
    { key: "notes", label: "Description / Notes", isFullWidth: true },
  ];

  const handleSelectChange = (key: keyof FieldMappings, value: string) => {
    setFieldMappings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-3">
      <span className="type-label font-semibold text-theme-muted uppercase tracking-wider block">
        Map CSV Columns to System Fields
      </span>

      <div className="grid grid-cols-2 gap-3">
        {fieldsConfig.map((field) => (
          <div key={field.key} className={field.isFullWidth ? "col-span-2" : ""}>
            <Select
              label={field.label}
              required={field.required}
              value={fieldMappings[field.key]}
              onChange={(e) => handleSelectChange(field.key, e.target.value)}
              helperText={field.required ? "Required for import" : undefined}
            >
              <option value="">— Select Column —</option>
              {csvHeaders.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
