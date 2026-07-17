import { useState, ChangeEvent, FormEvent } from "react";
import { Upload } from "lucide-react";
import { User } from "@/shared/types";
import { parseCSV } from "../utils/csvUtils";
import MappingSelectorPanel, { FieldMappings } from "./MappingSelectorPanel";
import Textarea from "@/shared/components/ui/Textarea";
import Button from "@/shared/components/ui/Button";
import FormActions from "@/shared/components/ui/FormActions";
import Modal from "@/shared/components/ui/Modal";
import Dialog from "@/shared/components/ui/Dialog";

interface BulkLeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  bulkAddLeads: (leads: any[]) => Promise<{ successCount: number; duplicateCount: number }>;
  logAuditEvent: (data: { action: string; details: string; user: string }) => Promise<void> | void;
  user: User;
}

type FeedbackState = {
  title: string;
  message: string;
  /** When true, dismiss also closes the import modal (success path). */
  closeImport?: boolean;
};

const BULK_IMPORT_FORM_ID = "bulk-lead-import-form";

export default function BulkLeadImportModal({
  isOpen,
  onClose,
  users,
  bulkAddLeads,
  logAuditEvent,
  user,
}: BulkLeadImportModalProps) {
  const [bulkInput, setBulkInput] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMappings>({
    name: "",
    phone: "",
    email: "",
    projectId: "",
    plotId: "",
    status: "",
    notes: "",
    createdTime: "",
    leadSource: "",
    leadMedium: "",
    followUpOn: "",
    assignedTo: "",
    leadNumber: "",
    createdBy: "",
  });
  const [isCsvUploaded, setIsCsvUploaded] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const dismissFeedback = () => {
    const shouldCloseImport = feedback?.closeImport;
    setFeedback(null);
    if (shouldCloseImport) {
      onClose();
    }
  };

  const processCsvText = (text: string) => {
    const parsed = parseCSV(text);
    if (parsed.length > 0) {
      const headers = parsed[0];
      setCsvHeaders(headers);
      setCsvRows(parsed.slice(1));
      setIsCsvUploaded(true);

      const mappings: FieldMappings = {
        name: headers.find((h) => /name|customer/i.test(h)) || "",
        phone: headers.find((h) => /phone|mobile/i.test(h)) || "",
        email: headers.find((h) => /email|mail/i.test(h)) || "",
        projectId: headers.find((h) => /project|location/i.test(h)) || "",
        plotId: headers.find((h) => /plot|number/i.test(h)) || "",
        status: headers.find((h) => /status|stage/i.test(h)) || "",
        notes: headers.find((h) => /note|comment|desc/i.test(h)) || "",
        createdTime:
          headers.find((h) =>
            /created time|created_at|createdat|date/i.test(h)
          ) || "",
        leadSource:
          headers.find((h) => /source|lead source|lead_source/i.test(h)) || "",
        leadMedium:
          headers.find((h) => /medium|lead medium|lead_medium/i.test(h)) || "",
        followUpOn:
          headers.find((h) =>
            /follow up on|follow_up_on|followupdate|followup/i.test(h)
          ) || "",
        assignedTo:
          headers.find((h) =>
            /assigned to|assigned_to|agent|assignee/i.test(h)
          ) || "",
        leadNumber:
          headers.find((h) => /lead number|lead_number|id|number/i.test(h)) ||
          "",
        createdBy:
          headers.find((h) => /created by|created_by|creator/i.test(h)) || "",
      };
      setFieldMappings(mappings);
    } else {
      setFeedback({
        title: "Invalid CSV",
        message: "Invalid or empty CSV data.",
      });
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleBulkImportSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isCsvUploaded) {
      const lines = bulkInput.split("\n");
      const leadsToUpload: any[] = [];
      let errorCount = 0;

      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 2) {
          let createdTime = new Date().toISOString();
          let name: string;
          let phone: string;
          let email: string;
          let leadSource: string;
          let leadMedium: string;
          let status: string;
          let followUpOn: string;
          let assignedToUsername: string;
          let leadNumber: string;
          let createdBy: string;
          let projectId: string;
          let plotId: string;
          let notes: string;

          if (parts.length >= 11) {
            createdTime = parts[0] || new Date().toISOString();
            name = parts[1];
            phone = parts[2];
            email = parts[3] || "";
            leadSource = parts[4] || "";
            leadMedium = parts[5] || "";
            status = parts[6] || "new";
            followUpOn = parts[7] || "";
            assignedToUsername = parts[8] || "";
            leadNumber = parts[9] || "";
            createdBy = parts[10] || "system";
            projectId = "";
            plotId = "";
            notes = "Bulk imported lead.";
          } else {
            name = parts[0];
            phone = parts[1];
            email = parts[2] || "";
            leadSource = "";
            leadMedium = "";
            status = parts[6] || "new";
            followUpOn = "";
            leadNumber = "";
            createdBy = "system";
            projectId = parts[3] || "";
            plotId = parts[4] || "";
            assignedToUsername = parts[5] || "";
            notes = parts[7] || "Bulk imported lead.";
          }

          const foundTC = users.find(
            (u) =>
              u.username.toLowerCase() === assignedToUsername.toLowerCase()
          );
          const assignedTo = foundTC ? foundTC.id : "";
          const assignedToName = foundTC ? foundTC.username : "Unassigned";

          leadsToUpload.push({
            name,
            phone,
            email,
            projectId,
            plotId,
            notes,
            status,
            assignedTo,
            assignedToName,
            createdTime,
            leadSource,
            leadMedium,
            followUpOn,
            leadNumber,
            createdBy,
          });
        } else {
          errorCount++;
        }
      }

      let successCount = 0;
      let duplicateCount = 0;
      if (leadsToUpload.length > 0) {
        try {
          const res = await bulkAddLeads(leadsToUpload);
          successCount = res.successCount;
          duplicateCount = res.duplicateCount;
        } catch (err) {
          console.error(err);
          errorCount += leadsToUpload.length;
        }
      }

      await logAuditEvent({
        action: "Bulk Import Leads",
        details: `Imported ${successCount} leads, merged ${duplicateCount} duplicates from CSV text.`,
        user: user.username,
      });

      setBulkInput("");
      setFeedback({
        title: "Bulk Import Complete",
        message: `Bulk Import Complete: ${successCount} new leads added, ${duplicateCount} duplicates merged, ${errorCount} errors.`,
        closeImport: true,
      });
      return;
    }

    let errorCount = 0;
    const leadsToUpload: any[] = [];

    const nameIdx = csvHeaders.indexOf(fieldMappings.name);
    const phoneIdx = csvHeaders.indexOf(fieldMappings.phone);
    const emailIdx = csvHeaders.indexOf(fieldMappings.email);
    const projectIdx = csvHeaders.indexOf(fieldMappings.projectId);
    const plotIdx = csvHeaders.indexOf(fieldMappings.plotId);
    const statusIdx = csvHeaders.indexOf(fieldMappings.status);
    const notesIdx = csvHeaders.indexOf(fieldMappings.notes);
    const createdTimeIdx = csvHeaders.indexOf(fieldMappings.createdTime);
    const leadSourceIdx = csvHeaders.indexOf(fieldMappings.leadSource);
    const leadMediumIdx = csvHeaders.indexOf(fieldMappings.leadMedium);
    const followUpOnIdx = csvHeaders.indexOf(fieldMappings.followUpOn);
    const assignedToIdx = csvHeaders.indexOf(fieldMappings.assignedTo);
    const leadNumberIdx = csvHeaders.indexOf(fieldMappings.leadNumber);
    const createdByIdx = csvHeaders.indexOf(fieldMappings.createdBy);

    if (phoneIdx === -1) {
      setFeedback({
        title: "Mapping Required",
        message: "Phone number field mapping is required.",
      });
      return;
    }

    for (const row of csvRows) {
      if (row.length <= 1 && !row[0]) continue;

      const name =
        nameIdx !== -1
          ? row[nameIdx] || "Imported Customer"
          : "Imported Customer";
      const phone = row[phoneIdx];
      const email = emailIdx !== -1 ? row[emailIdx] || "" : "";
      const projectId = projectIdx !== -1 ? row[projectIdx] || "" : "";
      const plotId = plotIdx !== -1 ? row[plotIdx] || "" : "";
      const status = statusIdx !== -1 ? row[statusIdx] || "new" : "new";
      const notes =
        notesIdx !== -1
          ? row[notesIdx] || "CSV Imported Lead"
          : "CSV Imported Lead";
      const createdTime =
        createdTimeIdx !== -1 ? row[createdTimeIdx] || "" : "";
      const leadSource = leadSourceIdx !== -1 ? row[leadSourceIdx] || "" : "";
      const leadMedium = leadMediumIdx !== -1 ? row[leadMediumIdx] || "" : "";
      const followUpOn = followUpOnIdx !== -1 ? row[followUpOnIdx] || "" : "";
      const assignedToUsername =
        assignedToIdx !== -1 ? row[assignedToIdx] || "" : "";
      const leadNumber = leadNumberIdx !== -1 ? row[leadNumberIdx] || "" : "";
      const createdBy = createdByIdx !== -1 ? row[createdByIdx] || "" : "";

      const foundTC = users.find(
        (u) => u.username.toLowerCase() === assignedToUsername.toLowerCase()
      );
      const assignedTo = foundTC ? foundTC.id : "";
      const assignedToName = foundTC ? foundTC.username : "Unassigned";

      if (!phone) {
        errorCount++;
        continue;
      }

      leadsToUpload.push({
        name,
        phone,
        email,
        projectId,
        plotId,
        notes,
        status,
        assignedTo,
        assignedToName,
        createdTime,
        leadSource,
        leadMedium,
        followUpOn,
        leadNumber,
        createdBy,
      });
    }

    let successCount = 0;
    let duplicateCount = 0;
    if (leadsToUpload.length > 0) {
      try {
        const res = await bulkAddLeads(leadsToUpload);
        successCount = res.successCount;
        duplicateCount = res.duplicateCount;
      } catch (err) {
        console.error(err);
        errorCount += leadsToUpload.length;
      }
    }

    await logAuditEvent({
      action: "Bulk CSV Import Leads",
      details: `Imported ${successCount} leads, merged ${duplicateCount} duplicates from CSV file upload.`,
      user: user.username,
    });

    setFeedback({
      title: "Bulk Import Complete",
      message: `Bulk Import Complete: ${successCount} new leads added, ${duplicateCount} duplicates merged, ${errorCount} errors.`,
      closeImport: true,
    });
  };

  // Swap overlays so Dialog and Modal never stack (avoids double Escape handlers).
  const showImport = isOpen && !feedback;
  const showFeedback = Boolean(feedback);

  return (
    <>
      <Modal
        isOpen={showImport}
        onClose={onClose}
        title="Bulk Import Customer Leads"
        size="lg"
        footer={
          <FormActions>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form={BULK_IMPORT_FORM_ID} variant="primary">
              {isCsvUploaded ? "Map & Ingest Leads" : "Start Import"}
            </Button>
          </FormActions>
        }
      >
        <form
          id={BULK_IMPORT_FORM_ID}
          onSubmit={handleBulkImportSubmit}
          className="space-y-4"
        >
          {!isCsvUploaded && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-theme-border rounded-theme p-6 text-center hover:bg-theme-surface transition-colors relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Upload lead CSV file"
                />
                <Upload className="w-8 h-8 text-theme-accent mx-auto mb-2" aria-hidden="true" />
                <span className="block font-semibold text-theme-text text-xs">
                  Upload Lead CSV File
                </span>
                <span className="block text-[10px] text-theme-muted mt-1">
                  Accepts CSV formats. Max 10MB
                </span>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-theme-border"></div>
                <span className="flex-shrink mx-4 type-label text-theme-muted uppercase">
                  Or Paste Text
                </span>
                <div className="flex-grow border-t border-theme-border"></div>
              </div>

              <div className="bg-theme-accent-muted text-theme-text p-3 rounded-theme border border-theme-accent/25 text-xs leading-relaxed">
                <p className="font-semibold mb-1 text-theme-muted type-label">
                  Standard CSV format
                </p>
                <code className="text-theme-text font-mono text-[11px]">
                  Name, Phone, Email, ProjectId, PlotNumber, AssignedTelecallerUsername, Status, Notes
                </code>
              </div>

              <Textarea
                label="Paste CSV Lines Directly"
                rows={5}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="Name, Phone, Email, ProjectId, PlotNumber..."
                className="font-mono"
                helperText="One lead per line, comma-separated"
              />
            </div>
          )}

          {isCsvUploaded && (
            <div className="space-y-4">
              <div
                className="bg-theme-success/10 text-theme-success p-3 rounded-theme border border-theme-success/25 text-xs flex justify-between items-center"
                role="status"
              >
                <div>
                  <p className="font-semibold">CSV file loaded</p>
                  <p className="mt-0.5 text-theme-muted font-medium">
                    Found{" "}
                    <span className="font-semibold text-theme-text">
                      {csvRows.length}
                    </span>{" "}
                    lead rows and{" "}
                    <span className="font-semibold text-theme-text">
                      {csvHeaders.length}
                    </span>{" "}
                    headers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCsvUploaded(false);
                    setCsvHeaders([]);
                    setCsvRows([]);
                  }}
                  className="text-theme-accent hover:opacity-80 underline font-semibold border-0 bg-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
                >
                  Reset File
                </button>
              </div>

              <MappingSelectorPanel
                fieldMappings={fieldMappings}
                setFieldMappings={setFieldMappings}
                csvHeaders={csvHeaders}
              />
            </div>
          )}
        </form>
      </Modal>

      <Dialog
        isOpen={showFeedback}
        onClose={dismissFeedback}
        title={feedback?.title ?? ""}
        description={feedback?.message}
        cancelLabel="OK"
        size="sm"
      />
    </>
  );
}
