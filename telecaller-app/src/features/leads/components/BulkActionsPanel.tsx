import { useState } from "react";
import { Trash2 } from "lucide-react";
import { User, Lead } from "@/shared/types";
import Dialog from "@/shared/components/ui/Dialog";
import {
  normalizeLeadStatus,
  planStatusTransition,
} from "@/shared/contracts";

interface BulkActionsPanelProps {
  selectedLeadIds: string[];
  setSelectedLeadIds: (ids: string[]) => void;
  /** Current page/row models for display + status transition checks (not company SoT). */
  pageLeads: Lead[];
  bulkAssignee: string;
  setBulkAssignee: (assignee: string) => void;
  bulkStatus: string;
  setBulkStatus: (status: string) => void;
  users: User[];
  isManagerial: (role: string) => boolean;
  bulkUpdateLeads: (ids: string[], updates: Partial<Lead>) => Promise<void>;
  archiveLeads: (ids: string[], username: string) => Promise<void>;
  user: User;
  toast: (message: string, type?: "success" | "error" | "info") => void;
}

export default function BulkActionsPanel({
  selectedLeadIds,
  setSelectedLeadIds,
  pageLeads,
  bulkAssignee,
  setBulkAssignee,
  bulkStatus,
  setBulkStatus,
  users,
  isManagerial,
  bulkUpdateLeads,
  archiveLeads,
  user,
  toast,
}: BulkActionsPanelProps) {
  const [binConfirmOpen, setBinConfirmOpen] = useState(false);
  const [pendingBinCount, setPendingBinCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });

  if (selectedLeadIds.length === 0 && !binConfirmOpen && !isProcessing) return null;

  return (
    <>
    {(selectedLeadIds.length > 0 || isProcessing) && (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl max-h-[40vh] overflow-y-auto bg-theme-card border border-theme-border rounded-theme p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-elevation-md animate-sheetSlideUp text-theme-text">
      <div className="text-xs font-semibold text-theme-text shrink-0 flex items-center gap-2">
        {isProcessing ? (
          <span className="flex items-center gap-1.5 text-theme-accent font-bold">
            <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {progress.label}: {progress.current} / {progress.total} processed...
          </span>
        ) : (
          <>
            <span className="text-theme-accent tabular-nums">
              {selectedLeadIds.length}
            </span>{" "}
            leads selected
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
        <select
          value={bulkAssignee}
          disabled={isProcessing}
          onChange={async (e) => {
            const agentId = e.target.value;
            if (!agentId) return;
            const agentObj = users.find((u) => u.id === agentId);
            setIsProcessing(true);
            setProgress({ current: 0, total: selectedLeadIds.length, label: "Reassigning" });
            try {
              await bulkUpdateLeads(selectedLeadIds, {
                assignedTo: agentId,
                assignedToName: agentObj ? agentObj.username : "Unassigned",
              });
              setProgress({ current: selectedLeadIds.length, total: selectedLeadIds.length, label: "Complete" });
              toast(
                `Reassigned ${selectedLeadIds.length} leads successfully.`,
                "success"
              );
              setSelectedLeadIds([]);
              setBulkAssignee("");
            } catch (err: any) {
              toast(`Reassignment failed: ${err.message || err}`, "error");
            } finally {
              setIsProcessing(false);
            }
          }}
          aria-label="Reassign selected leads"
          className="min-h-11 text-xs bg-theme-card border border-theme-border rounded-theme px-2 py-2 focus:ring-theme-ring text-theme-text disabled:opacity-50"
        >
          <option value="">Reassign to...</option>
          {users
            .filter((u) => !isManagerial(u.role))
            .map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.username}
              </option>
            ))}
        </select>

        <select
          value={bulkStatus}
          disabled={isProcessing}
          onChange={async (e) => {
            const statusVal = e.target.value;
            if (!statusVal) return;
            const to = normalizeLeadStatus(statusVal);
            if (!to) {
              toast("Invalid target status.", "error");
              return;
            }

            const allowedIds: string[] = [];
            let blocked = 0;
            for (const id of selectedLeadIds) {
              const lead = pageLeads.find((l) => l.id === id);
              const plan = planStatusTransition({
                from: lead?.status,
                to,
                reason: "bulk",
              });
              if (plan.ok) {
                allowedIds.push(id);
              } else if (plan.error !== "Status unchanged") {
                blocked += 1;
              }
            }

            if (allowedIds.length === 0) {
              toast(
                blocked > 0
                  ? "No leads could be updated (transition blocked)."
                  : "Status unchanged for selected leads.",
                "error",
              );
              setBulkStatus("");
              return;
            }

            setIsProcessing(true);
            setProgress({ current: 0, total: allowedIds.length, label: "Updating Status" });
            try {
              await bulkUpdateLeads(allowedIds, { status: to });
              setProgress({ current: allowedIds.length, total: allowedIds.length, label: "Complete" });
              setSelectedLeadIds([]);
              setBulkStatus("");
              toast(
                blocked > 0
                  ? `Updated status for ${allowedIds.length} leads (${blocked} blocked).`
                  : `Updated status for ${allowedIds.length} leads.`,
                "success",
              );
            } catch (err: any) {
              toast(`Status update failed: ${err.message || err}`, "error");
            } finally {
              setIsProcessing(false);
            }
          }}
          aria-label="Update status for selected leads"
          className="min-h-11 text-xs bg-theme-card border border-theme-border rounded-theme px-2 py-2 focus:ring-theme-ring text-theme-text disabled:opacity-50"
        >
          <option value="">Update Status...</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="interested">Interested</option>
          <option value="site-visit-confirmed">Site Visit Confirmed</option>
          <option value="site-visit-completed">Site Visit Completed</option>
          <option value="reserved">Reserved</option>
          <option value="booked">Booked</option>
          <option value="not-interested">Not Interested</option>
        </select>

        {(user?.role === "admin" || user?.role === "manager") && (
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => {
              setPendingBinCount(selectedLeadIds.length);
              setBinConfirmOpen(true);
            }}
            className="inline-flex items-center gap-1 min-h-11 px-3 py-2 bg-theme-danger hover:opacity-90 text-white text-xs rounded-theme font-bold transition-colors cursor-pointer border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden />
            <span>Move to Bin</span>
          </button>
        )}

        <button
          type="button"
          disabled={isProcessing}
          onClick={() => setSelectedLeadIds([])}
          className="inline-flex items-center min-h-11 px-3 py-2 border border-theme-border text-xs rounded-theme hover:bg-theme-surface font-semibold cursor-pointer text-theme-text bg-theme-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring disabled:opacity-50"
        >
          Deselect
        </button>
      </div>
    </div>
    )}

    <Dialog
      isOpen={binConfirmOpen}
      onClose={() => setBinConfirmOpen(false)}
      title="Move to Lead Bin?"
      description={`Are you sure you want to move these ${pendingBinCount || selectedLeadIds.length} leads to the Lead Bin?`}
      confirmLabel="Move to Bin"
      confirmVariant="danger"
      onConfirm={async () => {
        const ids = selectedLeadIds;
        const count = ids.length || pendingBinCount;
        try {
          await archiveLeads(ids, user.username);
          setSelectedLeadIds([]);
          setBinConfirmOpen(false);
          toast(`Moved ${count} leads to the bin successfully.`, "success");
        } catch (err: any) {
          setBinConfirmOpen(false);
          toast(`Failed to move leads: ${err.message}`, "error");
        }
      }}
    />
    </>
  );
}
