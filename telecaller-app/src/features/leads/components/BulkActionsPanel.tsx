import { useState } from "react";
import { Trash2 } from "lucide-react";
import { User, Lead } from "@/shared/types";
import Dialog from "@/shared/components/ui/Dialog";
import {
  normalizeLeadStatus,
  planStatusTransition,
} from "@/shared/contracts";
import { useLeadsStore } from "@/features/leads/hooks/useLeadsStore";

interface BulkActionsPanelProps {
  selectedLeadIds: string[];
  setSelectedLeadIds: (ids: string[]) => void;
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
  const { leads } = useLeadsStore();
  const [binConfirmOpen, setBinConfirmOpen] = useState(false);
  const [pendingBinCount, setPendingBinCount] = useState(0);

  if (selectedLeadIds.length === 0 && !binConfirmOpen) return null;

  return (
    <>
    {selectedLeadIds.length > 0 && (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl bg-white border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-indigo-100/40 animate-sheetSlideUp text-slate-800">
      <div className="text-xs font-bold text-gray-900">
        ⚡{" "}
        <span className="text-theme-accent">
          {selectedLeadIds.length}
        </span>{" "}
        leads selected
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={bulkAssignee}
          onChange={async (e) => {
            const agentId = e.target.value;
            if (!agentId) return;
            const agentObj = users.find((u) => u.id === agentId);
            await bulkUpdateLeads(selectedLeadIds, {
              assignedTo: agentId,
              assignedToName: agentObj ? agentObj.username : "Unassigned",
            });
            setSelectedLeadIds([]);
            setBulkAssignee("");
            toast(
              `Reassigned ${selectedLeadIds.length} leads successfully.`,
              "success"
            );
          }}
          className="text-xs bg-white border border-gray-300 rounded-lg p-2 focus:ring-theme-ring text-gray-900"
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
              const lead = leads.find((l) => l.id === id);
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

            await bulkUpdateLeads(allowedIds, { status: to });
            setSelectedLeadIds([]);
            setBulkStatus("");
            toast(
              blocked > 0
                ? `Updated status for ${allowedIds.length} leads (${blocked} blocked).`
                : `Updated status for ${allowedIds.length} leads.`,
              "success",
            );
          }}
          className="text-xs bg-white border border-gray-300 rounded-lg p-2 focus:ring-theme-ring text-gray-900"
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
            onClick={() => {
              setPendingBinCount(selectedLeadIds.length);
              setBinConfirmOpen(true);
            }}
            className="px-3 py-1.5 bg-theme-danger hover:opacity-90 text-white text-xs rounded-lg font-bold flex items-center space-x-1 transition-colors cursor-pointer border-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Move to Bin</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setSelectedLeadIds([])}
          className="px-3 py-1.5 border border-gray-300 text-xs rounded-lg hover:bg-gray-50 font-semibold cursor-pointer text-gray-700 bg-white"
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
