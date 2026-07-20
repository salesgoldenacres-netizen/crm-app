import { useId, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { Lead, Project, User } from "@/shared/types";
import { LeadRepository } from "@/shared/services/firebase/repositories";
import { normalizePhone } from "@/shared/utils/formatUtils";
import Modal from "@/shared/components/ui/Modal";
import Dialog from "@/shared/components/ui/Dialog";
import Button from "@/shared/components/ui/Button";
import FormActions from "@/shared/components/ui/FormActions";

interface MergeSettingsTabProps {
  projects: Record<string, Project>;
  mergeLeads: (
    targetId: string,
    sourceId: string,
    customSelections?: Partial<Lead> | null,
  ) => Promise<void>;
  logAuditEvent: (event: {
    action: string;
    details: string;
    user: string;
  }) => Promise<void>;
  user: User;
}

type FeedbackDialog = {
  title: string;
  description: string;
  confirmVariant: "success" | "danger";
};

export default function MergeSettingsTab({
  projects,
  mergeLeads,
  logAuditEvent,
  user,
}: MergeSettingsTabProps) {
  const mergeDescriptionId = useId();
  const [phoneQuery, setPhoneQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [matches, setMatches] = useState<Lead[]>([]);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeSourceLead, setMergeSourceLead] = useState<Lead | null>(null);
  const [mergeTargetLead, setMergeTargetLead] = useState<Lead | null>(null);
  const [mergeFieldSelections, setMergeFieldSelections] = useState<Record<string, unknown>>({});
  const [feedbackDialog, setFeedbackDialog] = useState<FeedbackDialog | null>(null);

  const closeMergeModal = () => {
    setIsMergeModalOpen(false);
    setMergeSourceLead(null);
    setMergeTargetLead(null);
  };

  const handleSearchPhone = async () => {
    setIsSearching(true);
    try {
      const phone = normalizePhone(phoneQuery);
      const found = await LeadRepository.findByPhone(phone, 10);
      setMatches(found);
      if (found.length < 2) {
        setFeedbackDialog({
          title: "No duplicate pair",
          description:
            found.length === 0
              ? "No leads found for that phone."
              : "Only one lead matches — need at least two to merge.",
          confirmVariant: "danger",
        });
      }
    } catch (err) {
      console.error("Phone dedup search failed", err);
      setFeedbackDialog({
        title: "Search failed",
        description: "Could not query leads by phone. Check the number format.",
        confirmVariant: "danger",
      });
      setMatches([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExecuteMerge = async () => {
    if (!mergeSourceLead || !mergeTargetLead) return;

    try {
      await mergeLeads(mergeTargetLead.id, mergeSourceLead.id, mergeFieldSelections as Partial<Lead>);

      await logAuditEvent({
        action: "Merge Leads Assistant",
        details: `Merged duplicate lead '${mergeSourceLead.name}' (ID: ${mergeSourceLead.id}) into '${mergeTargetLead.name}' (ID: ${mergeTargetLead.id}). Selected fields: ${JSON.stringify(mergeFieldSelections)}`,
        user: user.username,
      });

      closeMergeModal();
      setMergeFieldSelections({});
      setMatches((prev) =>
        prev.filter((l) => l.id !== mergeSourceLead.id),
      );
      setFeedbackDialog({
        title: "Merge complete",
        description: "Leads merged successfully via LeadRepository!",
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

  return (
    <div className="space-y-6 animate-fadeIn text-sm">
      <div className="rounded-theme border border-theme-border bg-theme-card p-4 space-y-3">
        <p className="text-xs text-theme-muted">
          Dedup uses indexed <code className="text-theme-text">findByPhone</code> — no global leads scan.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="tel"
            value={phoneQuery}
            onChange={(e) => setPhoneQuery(e.target.value)}
            placeholder="Enter phone to find duplicates"
            className="flex-1 min-h-11 px-3 rounded-theme border border-theme-border bg-theme-surface text-theme-text text-sm"
          />
          <Button
            type="button"
            size="sm"
            disabled={!phoneQuery.trim() || isSearching}
            onClick={() => void handleSearchPhone()}
          >
            <Search className="w-3.5 h-3.5 mr-1.5" />
            {isSearching ? "Searching…" : "Find duplicates"}
          </Button>
        </div>
      </div>

      {matches.length >= 2 && (
        <div className="bg-theme-card rounded-theme p-5 border border-theme-border shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-theme-border pb-2">
            <div>
              <span className="font-semibold text-sm text-theme-text">
                Phone matches: {matches[0].phone}
              </span>
              <span className="block text-[11px] text-theme-muted mt-0.5">
                Found {matches.length} lead documents.
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setMergeTargetLead(matches[0]);
                setMergeSourceLead(matches[1]);
                const defaultSelections: Record<string, unknown> = {};
                const fields = [
                  "name",
                  "phone",
                  "email",
                  "projectId",
                  "plotId",
                  "status",
                  "notes",
                ] as const;
                fields.forEach((f) => {
                  defaultSelections[f] =
                    matches[0][f] || matches[1][f] || "";
                });
                setMergeFieldSelections(defaultSelections);
                setIsMergeModalOpen(true);
              }}
            >
              Open Merge Assistant
            </Button>
          </div>
          <ul className="space-y-2 text-xs text-theme-text">
            {matches.map((l) => (
              <li key={l.id} className="flex justify-between gap-2 border-b border-theme-border/60 pb-1">
                <span className="font-semibold">{l.name}</span>
                <span className="text-theme-muted truncate">
                  {l.status} · {projects[l.projectId || ""]?.name || "No project"} · {l.id}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isMergeModalOpen && mergeSourceLead && mergeTargetLead && (
        <Modal
          isOpen={isMergeModalOpen}
          onClose={closeMergeModal}
          title="Merge Assistant"
          descriptionId={mergeDescriptionId}
        >
          <p id={mergeDescriptionId} className="text-xs text-theme-muted mb-4">
            Choose field values to keep on the target lead. Source lead will be deleted.
          </p>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {Object.keys(mergeFieldSelections).map((field) => (
              <div key={field} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center text-xs">
                <span className="font-semibold text-theme-text uppercase tracking-wide">
                  {field}
                </span>
                <button
                  type="button"
                  className={`text-left p-2 rounded-theme border ${
                    mergeFieldSelections[field] === (mergeTargetLead as Lead)[field as keyof Lead]
                      ? "border-theme-accent bg-theme-accent-muted"
                      : "border-theme-border bg-theme-surface"
                  }`}
                  onClick={() =>
                    setMergeFieldSelections((prev) => ({
                      ...prev,
                      [field]: (mergeTargetLead as Lead)[field as keyof Lead] || "",
                    }))
                  }
                >
                  Target: {String((mergeTargetLead as Lead)[field as keyof Lead] ?? "—")}
                </button>
                <button
                  type="button"
                  className={`text-left p-2 rounded-theme border ${
                    mergeFieldSelections[field] === (mergeSourceLead as Lead)[field as keyof Lead]
                      ? "border-theme-accent bg-theme-accent-muted"
                      : "border-theme-border bg-theme-surface"
                  }`}
                  onClick={() =>
                    setMergeFieldSelections((prev) => ({
                      ...prev,
                      [field]: (mergeSourceLead as Lead)[field as keyof Lead] || "",
                    }))
                  }
                >
                  Source: {String((mergeSourceLead as Lead)[field as keyof Lead] ?? "—")}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs text-theme-warning">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Merge is identity-based via LeadRepository transaction.
          </div>
          <FormActions className="mt-4">
            <Button type="button" variant="ghost" onClick={closeMergeModal}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleExecuteMerge()}>
              Confirm Merge
            </Button>
          </FormActions>
        </Modal>
      )}

      <Dialog
        isOpen={!!feedbackDialog}
        onClose={() => setFeedbackDialog(null)}
        title={feedbackDialog?.title || ""}
        description={feedbackDialog?.description || ""}
        confirmVariant={feedbackDialog?.confirmVariant || "success"}
        cancelLabel="OK"
      />
    </div>
  );
}
