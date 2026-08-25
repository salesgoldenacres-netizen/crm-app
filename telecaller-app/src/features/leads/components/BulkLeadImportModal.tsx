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

      // Smart column auto-detection based on header name AND first 5 data rows
      let autoPhone = headers.find((h) => /phone|mobile|contact|tel|number/i.test(h)) || "";
      const autoName = headers.find((h) => /name|customer|client/i.test(h)) || "";

      const sampleRows = parsed.slice(1, 6);
      if (!autoPhone && sampleRows.length > 0) {
        // Find column index containing numeric digits resembling phone numbers
        for (let colIdx = 0; colIdx < headers.length; colIdx++) {
          const hasPhoneLikeCell = sampleRows.some((r) => {
            const val = r[colIdx] || "";
            const digits = val.replace(/\D/g, "");
            return digits.length >= 7 && digits.length <= 13;
          });
          if (hasPhoneLikeCell) {
            autoPhone = headers[colIdx];
            break;
          }
        }
      }

      const mappings: FieldMappings = {
        name: autoName || headers[0] || "",
        phone: autoPhone,
        email: headers.find((h) => /email|mail/i.test(h)) || "",
        projectId: headers.find((h) => /project|location/i.test(h)) || "",
        plotId: headers.find((h) => /plot/i.test(h)) || "",
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
            /assigned to|assigned_to|agent|assignee|telecaller|s\.m/i.test(h)
          ) || "",
        leadNumber:
          headers.find((h) => /lead number|lead_number|lead id|lead_id/i.test(h)) ||
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
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      setFeedback({
        title: "Excel File Upload",
        message:
          "Please save your Excel workbook as CSV (.csv format) before uploading, or copy and paste the rows directly into the text area.",
      });
      return;
    }
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

      lines.forEach((line, rowIdx) => {
        if (!line.trim()) return;
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 1) {
          const name = parts[0] || `Lead ${rowIdx + 1}`;
          const rawPhone = parts[1] || "";
          const cleanPhone = rawPhone.replace(/[^\d+]/g, "").trim();
          const phone = cleanPhone.length >= 7 ? cleanPhone : `+91000${String(1000000 + rowIdx)}`;

          leadsToUpload.push({
            name,
            phone,
            email: parts[2] || "",
            projectId: parts[3] || "",
            plotId: parts[4] || "",
            status: parts[6] || "new",
            notes: parts[7] || "Bulk imported lead.",
            assignedTo: "",
            assignedToName: "Unassigned",
            createdTime: new Date().toISOString(),
          });
        }
      });

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

    csvRows.forEach((row, rowIdx) => {
      if (row.length === 0 || (row.length === 1 && !row[0].trim())) return;

      const name =
        nameIdx !== -1 && row[nameIdx]
          ? row[nameIdx].trim()
          : `Customer ${rowIdx + 1}`;

      const rawPhone = phoneIdx !== -1 ? row[phoneIdx] || "" : "";
      const digitsOnly = rawPhone.replace(/[^\d+]/g, "").trim();
      // If phone is missing or incomplete, auto-generate fallback ID so lead row is NOT discarded
      const phone =
        digitsOnly.length >= 7
          ? digitsOnly
          : `+91000${String(1000000 + (rowIdx % 900000))}`;

      const email = emailIdx !== -1 ? row[emailIdx] || "" : "";
      const projectId = projectIdx !== -1 ? row[projectIdx] || "" : "";
      const plotId = plotIdx !== -1 ? row[plotIdx] || "" : "";
      const status = statusIdx !== -1 ? row[statusIdx] || "new" : "new";
      const notes =
        notesIdx !== -1
          ? row[notesIdx] || "CSV Imported Lead"
          : "CSV Imported Lead";
      const createdTime =
        createdTimeIdx !== -1 && row[createdTimeIdx]
          ? row[createdTimeIdx]
          : new Date().toISOString();
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
    });

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
        variant="sheet"
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

              {/* Sample Row Preview */}
              {csvRows.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-theme-border">
                  <span className="type-label font-semibold text-theme-muted uppercase tracking-wider block">
                    Sample Mapped Preview (First 3 Rows out of {csvRows.length})
                  </span>
                  <div className="overflow-x-auto rounded-theme border border-theme-border">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-theme-surface text-theme-muted border-b border-theme-border font-medium">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">Phone</th>
                          <th className="p-2">Plot Number</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border text-theme-text">
                        {csvRows.slice(0, 3).map((r, i) => {
                          const nIdx = csvHeaders.indexOf(fieldMappings.name);
                          const pIdx = csvHeaders.indexOf(fieldMappings.phone);
                          const plIdx = csvHeaders.indexOf(fieldMappings.plotId);
                          const stIdx = csvHeaders.indexOf(fieldMappings.status);

                          const nameVal = nIdx !== -1 && r[nIdx] ? r[nIdx] : `Customer ${i + 1}`;
                          const rawP = pIdx !== -1 ? r[pIdx] || "" : "";
                          const cleanP = rawP.replace(/[^\d+]/g, "").trim();
                          const phoneVal = cleanP.length >= 7 ? cleanP : `Auto-ID (+91000...)`;
                          const plotVal = plIdx !== -1 && r[plIdx] ? r[plIdx] : "—";
                          const statusVal = stIdx !== -1 && r[stIdx] ? r[stIdx] : "new";

                          return (
                            <tr key={i} className="hover:bg-theme-surface/50">
                              <td className="p-2 font-medium">{nameVal}</td>
                              <td className="p-2 font-mono text-theme-muted">{phoneVal}</td>
                              <td className="p-2">{plotVal}</td>
                              <td className="p-2 uppercase text-[10px] tracking-wider font-semibold">{statusVal}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
