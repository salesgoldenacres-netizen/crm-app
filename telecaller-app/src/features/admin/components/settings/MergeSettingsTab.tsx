import { useId, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Lead, Project, User } from "@/shared/types";
import { publishLeadMerged } from "@/shared/contracts";
import Modal from "@/shared/components/ui/Modal";
import Dialog from "@/shared/components/ui/Dialog";
import Button from "@/shared/components/ui/Button";
import FormActions from "@/shared/components/ui/FormActions";

interface MergeSettingsTabProps {
  leads: Lead[];
  projects: Record<string, Project>;
  updateLeadInStore: (
    id: string,
    updates: Partial<Lead>,
    options?: { suppressTimeline?: boolean },
  ) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  logAuditEvent: (event: any) => Promise<void>;
  user: User;
}

type FeedbackDialog = {
  title: string;
  description: string;
  confirmVariant: "success" | "danger";
};

export default function MergeSettingsTab({
  leads,
  projects,
  updateLeadInStore,
  deleteLead,
  logAuditEvent,
  user,
}: MergeSettingsTabProps) {
  const mergeDescriptionId = useId();
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeSourceLead, setMergeSourceLead] = useState<Lead | null>(null);
  const [mergeTargetLead, setMergeTargetLead] = useState<Lead | null>(null);
  const [mergeFieldSelections, setMergeFieldSelections] = useState<Record<string, any>>({});
  const [feedbackDialog, setFeedbackDialog] = useState<FeedbackDialog | null>(null);

  const closeMergeModal = () => {
    setIsMergeModalOpen(false);
    setMergeSourceLead(null);
    setMergeTargetLead(null);
  };

  const handleExecuteMerge = async () => {
    if (!mergeSourceLead || !mergeTargetLead) return;

    try {
      const selectedNotes = mergeFieldSelections.notes || "";
      let mergedNotes = selectedNotes;
      if (
        mergeSourceLead.notes &&
        mergeSourceLead.notes !== mergeTargetLead.notes &&
        !selectedNotes.includes(mergeSourceLead.notes)
      ) {
        mergedNotes = `${selectedNotes}\n[Merged Notes from ${mergeSourceLead.name}]: ${mergeSourceLead.notes}`;
      }

      const mergedLogs = [
        ...(mergeTargetLead.callLogs || []),
        ...(mergeSourceLead.callLogs || []),
      ];
      // Sort in ascending order by date
      mergedLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      await updateLeadInStore(
        mergeTargetLead.id,
        {
          ...mergeFieldSelections,
          notes: mergedNotes,
          callLogs: mergedLogs,
        },
        { suppressTimeline: true },
      );

      await deleteLead(mergeSourceLead.id);

      void publishLeadMerged({
        leadId: mergeTargetLead.id,
        sourceLeadId: mergeSourceLead.id,
        sourceLeadName: mergeSourceLead.name,
        sourceId: mergeSourceLead.id,
        actorName: user.username,
        idempotencyKey: `lead_merged_${mergeTargetLead.id}_${mergeSourceLead.id}`,
      });

      await logAuditEvent({
        action: "Merge Leads Assistant",
        details: `Merged duplicate lead '${mergeSourceLead.name}' (ID: ${mergeSourceLead.id}) into '${mergeTargetLead.name}' (ID: ${mergeTargetLead.id}). Selected fields: ${JSON.stringify(mergeFieldSelections)}`,
        user: user.username,
      });

      closeMergeModal();
      setMergeFieldSelections({});
      setFeedbackDialog({
        title: "Merge complete",
        description: "Leads merged successfully!",
        confirmVariant: "success",
      });
    } catch (err) {
      console.error("Error during merge: ", err);
      setFeedbackDialog({
        title: "Merge failed",
        description: "Failed to merge leads. Please try again.",
        confirmVariant: "danger",
      });
    }
  };

  const duplicates: { lead: Lead; matches: Lead[] }[] = [];
  const checkedPhones = new Set<string>();
  leads.forEach((l) => {
    const phone = l.phone.replace(/[^0-9]/g, "");
    if (phone && phone.length >= 10) {
      const matches = leads.filter(
        (other) =>
          other.id !== l.id &&
          other.phone.replace(/[^0-9]/g, "") === phone
      );
      if (matches.length > 0 && !checkedPhones.has(phone)) {
        checkedPhones.add(phone);
        duplicates.push({ lead: l, matches });
      }
    }
  });

  return (
    <div className="space-y-6 animate-fadeIn text-sm">
      {/* List duplicate candidates */}
      <div className="grid grid-cols-1 gap-6">
        {duplicates.length === 0 ? (
          <div className="bg-theme-card rounded-xl p-8 text-center text-theme-muted italic border border-theme-border">
            No duplicates detected in the leads database based on phone numbers!
          </div>
        ) : (
          duplicates.map((dupGroup) => (
            <div
              key={dupGroup.lead.id}
              className="bg-theme-card rounded-xl p-5 border border-theme-border shadow-sm space-y-4"
            >
              <div className="flex justify-between items-center border-b border-theme-border pb-2">
                <div>
                  <span className="font-semibold text-sm text-theme-text">
                    Duplicate Phone Match: {dupGroup.lead.phone}
                  </span>
                  <span className="block text-[11px] text-theme-muted mt-0.5">
                    Found {dupGroup.matches.length + 1} matching lead documents.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setMergeTargetLead(dupGroup.lead);
                    setMergeSourceLead(dupGroup.matches[0]);
                    const defaultSelections: Record<string, any> = {};
                    const fields = [
                      "name",
                      "phone",
                      "email",
                      "projectId",
                      "plotId",
                      "status",
                      "notes",
                    ];
                    fields.forEach((f) => {
                      defaultSelections[f] =
                        dupGroup.lead[f as keyof Lead] || dupGroup.matches[0][f as keyof Lead] || "";
                    });
                    setMergeFieldSelections(defaultSelections);
                    setIsMergeModalOpen(true);
                  }}
                >
                  Open Merge Assistant
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[dupGroup.lead, ...dupGroup.matches].map((l) => (
                  <div
                    key={l.id}
                    className="bg-theme-surface/40 p-3 rounded-theme border border-theme-border text-xs"
                  >
                    <div className="font-semibold text-theme-text mb-1.5">
                      {l.name}
                    </div>
                    <div>
                      ID:{" "}
                      <span className="font-mono text-[10px] text-theme-muted">
                        {l.id}
                      </span>
                    </div>
                    <div>
                      Email:{" "}
                      <span className="text-theme-muted">
                        {l.email || "—"}
                      </span>
                    </div>
                    <div>
                      Project:{" "}
                      <span className="text-theme-muted">
                        {projects[l.projectId || ""]?.name || "—"}
                      </span>
                    </div>
                    <div>
                      Plot:{" "}
                      <span className="text-theme-muted font-semibold">
                        Plot {l.plotId || "—"}
                      </span>
                    </div>
                    <div>
                      Status:{" "}
                      <span className="font-semibold uppercase text-[9px] bg-theme-surface text-theme-muted px-1 py-0.5 rounded-theme">
                        {l.status}
                      </span>
                    </div>
                    <div className="mt-2 text-theme-muted italic truncate border-t border-theme-border pt-1.5">
                      "{l.notes || "No description notes."}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lead Merge Assistant Modal */}
      <Modal
        isOpen={isMergeModalOpen && !!mergeTargetLead && !!mergeSourceLead}
        onClose={closeMergeModal}
        title="Duplicate Merge Assistant"
        size="2xl"
        closeOnBackdrop={false}
        descriptionId={mergeDescriptionId}
        footer={
          <FormActions>
            <Button type="button" variant="outline" onClick={closeMergeModal}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleExecuteMerge}>
              Confirm & Merge Leads
            </Button>
          </FormActions>
        }
      >
        {mergeTargetLead && mergeSourceLead && (
          <div className="space-y-5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
              <p
                id={mergeDescriptionId}
                className="text-theme-muted leading-relaxed text-xs sm:text-sm"
              >
                Choose which details to keep for the merged contact document. All notes and history logs from both leads will be automatically combined into the target lead.{" "}
                <strong className="text-theme-text">{mergeSourceLead.name} (Source)</strong> will be deleted.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { field: "name", label: "Customer Name" },
                { field: "phone", label: "Phone Number" },
                { field: "email", label: "Email Address" },
                {
                  field: "projectId",
                  label: "Project Interest",
                  isProject: true,
                },
                { field: "plotId", label: "Plot Number", isPlot: true },
                { field: "status", label: "Lead Status" },
                {
                  field: "notes",
                  label: "Notes / Description",
                  isTextArea: true,
                },
              ].map(({ field, label, isProject, isTextArea }) => {
                const targetVal = mergeTargetLead[field as keyof Lead] || "";
                const sourceVal = mergeSourceLead[field as keyof Lead] || "";

                const getDisplayValue = (val: any) => {
                  if (!val) return "—";
                  if (isProject) return projects[val]?.name || val;
                  return val;
                };

                return (
                  <div
                    key={field}
                    className="border-b border-theme-border/50 pb-4 last:border-0 last:pb-0"
                  >
                    <label className="block text-[11px] font-semibold text-theme-muted uppercase tracking-wider mb-2">
                      {label}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                      <button
                        type="button"
                        onClick={() =>
                          setMergeFieldSelections((prev) => ({
                            ...prev,
                            [field]: targetVal,
                          }))
                        }
                        className={`p-3 rounded-theme border text-xs cursor-pointer transition-all flex flex-col justify-between text-left ${
                          mergeFieldSelections[field] === targetVal
                            ? "border-theme-accent bg-theme-accent/10"
                            : "border-theme-border hover:bg-theme-surface/60 bg-theme-card"
                        }`}
                      >
                        <div className="font-semibold text-theme-muted mb-1">
                          Target Lead (A)
                        </div>
                        <div className="font-semibold text-theme-text break-words">
                          {getDisplayValue(targetVal)}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setMergeFieldSelections((prev) => ({
                            ...prev,
                            [field]: sourceVal,
                          }))
                        }
                        className={`p-3 rounded-theme border text-xs cursor-pointer transition-all flex flex-col justify-between text-left ${
                          mergeFieldSelections[field] === sourceVal
                            ? "border-theme-accent bg-theme-accent/10"
                            : "border-theme-border hover:bg-theme-surface/60 bg-theme-card"
                        }`}
                      >
                        <div className="font-semibold text-theme-muted mb-1">
                          Source Lead (B)
                        </div>
                        <div className="font-semibold text-theme-text break-words">
                          {getDisplayValue(sourceVal)}
                        </div>
                      </button>
                    </div>

                    <div className="mt-1 flex items-center space-x-2">
                      <span className="text-[10px] font-semibold text-theme-muted shrink-0">
                        Final Value:
                      </span>
                      {isTextArea ? (
                        <textarea
                          value={mergeFieldSelections[field] || ""}
                          onChange={(e) =>
                            setMergeFieldSelections((prev) => ({
                              ...prev,
                              [field]: e.target.value,
                            }))
                          }
                          className="w-full text-xs border border-theme-border bg-theme-card text-theme-text rounded-theme px-2 py-1.5 focus:ring-1 focus:ring-theme-ring outline-none"
                          rows={2}
                        />
                      ) : (
                        <input
                          type="text"
                          value={mergeFieldSelections[field] || ""}
                          onChange={(e) =>
                            setMergeFieldSelections((prev) => ({
                              ...prev,
                              [field]: e.target.value,
                            }))
                          }
                          className="w-full text-xs border border-theme-border bg-theme-card text-theme-text rounded-theme px-2 py-1.5 focus:ring-1 focus:ring-theme-ring outline-none"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      <Dialog
        isOpen={!!feedbackDialog}
        onClose={() => setFeedbackDialog(null)}
        title={feedbackDialog?.title ?? ""}
        description={feedbackDialog?.description}
        confirmLabel="OK"
        cancelLabel="Close"
        onConfirm={() => setFeedbackDialog(null)}
        confirmVariant={feedbackDialog?.confirmVariant ?? "primary"}
        closeOnBackdrop={false}
      />
    </div>
  );
}
