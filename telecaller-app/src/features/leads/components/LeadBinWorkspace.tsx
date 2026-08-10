import { useState, useMemo, useId } from "react";
import {
  Trash2,
  RefreshCw,
  Search,
  Inbox,
  AlertTriangle,
  X,
  RotateCcw,
  Filter,
  ChevronDown,
} from "lucide-react";
import { useArchivedLeadsStore } from "@/features/leads/hooks/useArchivedLeadsStore";
import { useToast } from "@/shared/components/Toast";
import { LEAD_STATUS_OPTIONS } from "@/features/leads/config/leadListFilterConfig";
import {
  LeadBinFilters,
  EMPTY_LEAD_BIN_FILTERS,
  cloneLeadBinFilters,
  isLeadBinFiltersEmpty,
  countActiveLeadBinFilters,
  matchLeadBinFilters,
} from "@/features/leads/config/leadBinFilterConfig";
import { User, Project } from "@/shared/types";
import { buildAssignmentFields } from "@/shared/utils/leadAssignment";
import Modal from "@/shared/components/ui/Modal";
import Dialog from "@/shared/components/ui/Dialog";
import Button from "@/shared/components/ui/Button";
import FormActions from "@/shared/components/ui/FormActions";

interface LeadBinWorkspaceProps {
  users: User[];
  projects: Record<string, Project>;
  isManagerial: (role: string) => boolean;
}

function denseInput(filled: boolean, extra = "") {
  return `w-full min-w-0 h-6 text-[10px] leading-none border rounded px-1.5 outline-none transition-colors ${
    filled
      ? "border-theme-accent/50 bg-theme-accent/10 text-theme-text focus:ring-1 focus:ring-theme-ring"
      : "border-theme-border bg-theme-card text-theme-text placeholder:text-theme-muted/70 focus:ring-1 focus:ring-theme-ring"
  } ${extra}`;
}

export default function LeadBinWorkspace({
  users,
  projects,
  isManagerial,
}: LeadBinWorkspaceProps) {
  const { archivedLeads, isLoaded, restoreLeads, deletePermanently } =
    useArchivedLeadsStore();
  const { toast } = useToast();
  const mobileFilterDescriptionId = useId();

  const [draftFilters, setDraftFilters] = useState<LeadBinFilters>(
    cloneLeadBinFilters(EMPTY_LEAD_BIN_FILTERS)
  );
  const [appliedFilters, setAppliedFilters] = useState<LeadBinFilters>(
    cloneLeadBinFilters(EMPTY_LEAD_BIN_FILTERS)
  );
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [restoreStatus, setRestoreStatus] = useState("new");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const updateDraft = (patch: Partial<LeadBinFilters>) => {
    setDraftFilters((prev) => ({ ...prev, ...patch }));
  };

  const applySearch = () => {
    setAppliedFilters(cloneLeadBinFilters(draftFilters));
    setSelectedLeadIds([]);
    setMobileFiltersOpen(false);
  };

  const resetFilters = () => {
    const empty = cloneLeadBinFilters(EMPTY_LEAD_BIN_FILTERS);
    setDraftFilters(empty);
    setAppliedFilters(empty);
    setSelectedLeadIds([]);
    setMobileFiltersOpen(false);
  };

  const onEnterSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applySearch();
    }
  };

  const filteredLeads = useMemo(
    () =>
      archivedLeads.filter((lead) =>
        matchLeadBinFilters(
          lead,
          appliedFilters,
          projects[lead.projectId || ""]?.name
        )
      ),
    [archivedLeads, appliedFilters, projects]
  );

  const activeCount = countActiveLeadBinFilters(appliedFilters);
  const draftDirty = !isLeadBinFiltersEmpty(draftFilters);

  const handleSelectAll = (checked: boolean) => {
    setSelectedLeadIds(checked ? filteredLeads.map((l) => l.id) : []);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedLeadIds((prev) =>
      checked ? [...prev, id] : prev.filter((item) => item !== id)
    );
  };

  const handleBulkRestore = async () => {
    if (selectedLeadIds.length === 0) return;
    if (!assigneeId) {
      toast("Please select an agent to reassign the leads to.", "error");
      return;
    }

    const agent = users.find((u) => u.id === assigneeId);
    if (!agent) {
      toast("Selected agent not found.", "error");
      return;
    }

    try {
      await restoreLeads(selectedLeadIds, {
        ...buildAssignmentFields(assigneeId, agent.username, agent),
        status: restoreStatus,
      });
      toast(
        `Successfully restored and reassigned ${selectedLeadIds.length} leads.`,
        "success"
      );
      setSelectedLeadIds([]);
      setAssigneeId("");
    } catch (err: any) {
      toast(`Failed to restore leads: ${err.message}`, "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    setDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      await deletePermanently(selectedLeadIds);
      toast(`Permanently deleted ${selectedLeadIds.length} leads.`, "success");
      setSelectedLeadIds([]);
      setDeleteConfirmOpen(false);
    } catch (err: any) {
      setDeleteConfirmOpen(false);
      toast(`Failed to delete leads: ${err.message}`, "error");
    }
  };

  const pad = "px-1 py-1";

  const searchResetButtons = (
    <div className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={applySearch}
        title="Search (Enter)"
        aria-label="Search"
        className="inline-flex items-center justify-center w-6 h-6 rounded bg-theme-accent text-theme-accent-fg cursor-pointer border-0"
      >
        <Search className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={resetFilters}
        title="Reset filters"
        aria-label="Reset filters"
        disabled={!draftDirty && activeCount === 0}
        className="inline-flex items-center justify-center w-6 h-6 rounded border border-theme-border bg-theme-card text-theme-muted hover:text-theme-text disabled:opacity-35 disabled:cursor-default cursor-pointer"
      >
        <RotateCcw className="w-3 h-3" />
      </button>
    </div>
  );

  if (!isLoaded) {
    return (
      <div className="py-12 text-center text-theme-muted">
        <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-theme-border border-t-theme-accent" />
        <p className="mt-2 text-sm">Loading Lead Bin...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-theme-text min-h-0">
      <div className="shrink-0 rounded-theme border border-theme-border bg-theme-card px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-bold text-theme-text tracking-tight flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-theme-danger" />
                Lead Bin
              </h2>
              <span className="text-[11px] font-semibold text-theme-muted tabular-nums">
                {filteredLeads.length.toLocaleString()} shown
                {activeCount > 0
                  ? ` · ${activeCount} filter${activeCount === 1 ? "" : "s"}`
                  : ` · ${archivedLeads.length} total`}
              </span>
            </div>
            <p className="text-[10px] text-theme-muted mt-0.5">
              Restore &amp; reassign, or permanently delete archived leads.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="md:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-theme-border bg-theme-surface text-[11px] font-bold text-theme-text cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-theme-accent" />
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        </div>
      </div>

      <div className="min-h-0 rounded-theme border border-theme-border bg-theme-card overflow-hidden shadow-sm">
        <div className="hidden md:block max-h-[min(78dvh,820px)] overflow-auto scrollbar-thin">
          <table className="w-full min-w-max divide-y divide-theme-border">
            <thead className="bg-theme-surface sticky top-0 z-10 shadow-sm">
              <tr className="border-b border-theme-border">
                <th className="px-3 py-2 text-left w-10 bg-theme-surface">
                  <input
                    type="checkbox"
                    className="rounded border-theme-border text-theme-accent focus:ring-theme-ring cursor-pointer"
                    checked={
                      filteredLeads.length > 0 &&
                      selectedLeadIds.length === filteredLeads.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={filteredLeads.length === 0}
                  />
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-theme-muted uppercase tracking-wider bg-theme-surface">
                  Lead #
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-theme-muted uppercase tracking-wider bg-theme-surface">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-theme-muted uppercase tracking-wider bg-theme-surface">
                  Phone
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-theme-muted uppercase tracking-wider bg-theme-surface">
                  Project / Plot
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-theme-muted uppercase tracking-wider bg-theme-surface">
                  Prior Status
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-theme-muted uppercase tracking-wider bg-theme-surface">
                  Archived
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-theme-muted uppercase tracking-wider bg-theme-surface">
                  By
                </th>
              </tr>
              <tr className="bg-theme-surface/80 border-b border-theme-border">
                <td className={pad}>{searchResetButtons}</td>
                <td className={pad}>
                  <input
                    type="text"
                    value={draftFilters.leadNumber}
                    placeholder="#"
                    onChange={(e) => updateDraft({ leadNumber: e.target.value })}
                    onKeyDown={onEnterSearch}
                    className={denseInput(!!draftFilters.leadNumber)}
                    aria-label="Lead number"
                  />
                </td>
                <td className={pad}>
                  <input
                    type="text"
                    value={draftFilters.name}
                    placeholder="Name / phone"
                    onChange={(e) => updateDraft({ name: e.target.value })}
                    onKeyDown={onEnterSearch}
                    className={denseInput(!!draftFilters.name)}
                    aria-label="Name"
                  />
                </td>
                <td className={pad}>
                  <input
                    type="text"
                    value={draftFilters.phone}
                    placeholder="Phone"
                    onChange={(e) => updateDraft({ phone: e.target.value })}
                    onKeyDown={onEnterSearch}
                    className={denseInput(!!draftFilters.phone)}
                    aria-label="Phone"
                  />
                </td>
                <td className={pad}>
                  <div className="relative min-w-0">
                    <select
                      value={draftFilters.projectId}
                      onChange={(e) => updateDraft({ projectId: e.target.value })}
                      className={`${denseInput(!!draftFilters.projectId, "appearance-none pr-5 cursor-pointer")}`}
                      aria-label="Project"
                    >
                      <option value="">All</option>
                      {Object.values(projects).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-theme-muted" />
                  </div>
                </td>
                <td className={pad}>
                  <div className="relative min-w-0">
                    <select
                      value={draftFilters.status}
                      onChange={(e) => updateDraft({ status: e.target.value })}
                      className={`${denseInput(!!draftFilters.status, "appearance-none pr-5 cursor-pointer")}`}
                      aria-label="Prior status"
                    >
                      <option value="">All</option>
                      {LEAD_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-theme-muted" />
                  </div>
                </td>
                <td className={pad}>
                  <div
                    className={`flex items-center gap-0.5 min-w-[9.5rem] rounded border px-0.5 h-6 ${
                      draftFilters.archivedStart || draftFilters.archivedEnd
                        ? "border-theme-accent/50 bg-theme-accent/10"
                        : "border-theme-border bg-theme-card"
                    }`}
                  >
                    <input
                      type="date"
                      value={draftFilters.archivedStart}
                      title="From"
                      onChange={(e) =>
                        updateDraft({ archivedStart: e.target.value })
                      }
                      onKeyDown={onEnterSearch}
                      className="min-w-0 flex-1 h-full bg-transparent border-0 text-[9px] text-theme-text px-0.5 outline-none cursor-pointer"
                      aria-label="Archived from"
                    />
                    <span className="text-[9px] text-theme-muted shrink-0">–</span>
                    <input
                      type="date"
                      value={draftFilters.archivedEnd}
                      title="To"
                      onChange={(e) =>
                        updateDraft({ archivedEnd: e.target.value })
                      }
                      onKeyDown={onEnterSearch}
                      className="min-w-0 flex-1 h-full bg-transparent border-0 text-[9px] text-theme-text px-0.5 outline-none cursor-pointer"
                      aria-label="Archived to"
                    />
                  </div>
                </td>
                <td className={pad}>
                  <input
                    type="text"
                    value={draftFilters.archivedBy}
                    placeholder="User"
                    onChange={(e) => updateDraft({ archivedBy: e.target.value })}
                    onKeyDown={onEnterSearch}
                    className={denseInput(!!draftFilters.archivedBy)}
                    aria-label="Archived by"
                  />
                </td>
              </tr>
            </thead>
            <tbody className="bg-theme-card divide-y divide-theme-border">
              {filteredLeads.map((lead) => {
                const projectObj = projects[lead.projectId || ""];
                const isSelected = selectedLeadIds.includes(lead.id);
                return (
                  <tr
                    key={lead.id}
                    className={`hover:bg-theme-surface/60 transition-colors ${
                      isSelected ? "bg-theme-danger/5" : ""
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="rounded border-theme-border text-theme-accent focus:ring-theme-ring cursor-pointer"
                        checked={isSelected}
                        onChange={(e) =>
                          handleSelectRow(lead.id, e.target.checked)
                        }
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-[11px] text-theme-muted font-mono tabular-nums">
                      {lead.leadReference ? lead.leadReference.substring(0, 10) + "..." : lead.leadNumber || "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-[12px] font-semibold text-theme-text">
                      {lead.name}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-[11px] text-theme-muted font-mono">
                      {lead.phone || "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-[11px] text-theme-muted">
                      {projectObj?.name || "No Project"}
                      {lead.plotId ? ` · Plot ${lead.plotId}` : ""}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-[10px]">
                      <span className="inline-flex px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-text font-semibold uppercase tracking-wide">
                        {lead.status || "new"}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-[11px] text-theme-muted">
                      {lead.archivedAt
                        ? new Date(lead.archivedAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-[11px] text-theme-muted">
                      {lead.archivedBy || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-theme-border">
          {filteredLeads.map((lead) => {
            const projectObj = projects[lead.projectId || ""];
            const isSelected = selectedLeadIds.includes(lead.id);
            return (
              <div
                key={lead.id}
                className={`p-3 flex flex-col gap-1.5 ${
                  isSelected ? "bg-theme-danger/5" : "bg-theme-card"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      className="rounded border-theme-border text-theme-accent focus:ring-theme-ring cursor-pointer shrink-0"
                      checked={isSelected}
                      onChange={(e) =>
                        handleSelectRow(lead.id, e.target.checked)
                      }
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-theme-text truncate">
                        {lead.name}
                      </h4>
                      <span className="text-[10px] text-theme-muted font-mono">
                        #{lead.leadReference ? lead.leadReference.substring(0, 10) + "..." : lead.leadNumber || "—"} · {lead.phone || "—"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-theme-surface border border-theme-border text-theme-muted shrink-0">
                    {lead.status || "new"}
                  </span>
                </div>
                <div className="flex justify-between items-end text-[10px] text-theme-muted pl-7">
                  <p>
                    {projectObj?.name || "No Project"}
                    {lead.plotId ? ` #${lead.plotId}` : ""}
                  </p>
                  <p className="font-semibold">
                    {lead.archivedAt
                      ? new Date(lead.archivedAt).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {filteredLeads.length === 0 && (
          <div className="py-12 text-center text-theme-muted border-t border-theme-border md:border-0">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-sm text-theme-text">
              {activeCount > 0
                ? "No matching archived leads"
                : archivedLeads.length === 0
                  ? "Lead Bin is empty"
                  : "No matching archived leads"}
            </p>
            <p className="text-[11px] mt-1">
              {activeCount > 0
                ? "Adjust filters and Search, or reset."
                : "Archived leads will appear here."}
            </p>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 text-xs font-bold text-theme-accent cursor-pointer border-0 bg-transparent"
              >
                Reset filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="md:hidden">
        <Modal
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          title="Filters"
          size="lg"
          variant="sheet"
          descriptionId={mobileFilterDescriptionId}
          footer={
            <FormActions className="w-full gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={resetFilters}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                Reset
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-[1.4]"
                onClick={applySearch}
              >
                <Search className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                Search
              </Button>
            </FormActions>
          }
        >
          <p
            id={mobileFilterDescriptionId}
            className="type-label text-[10px] text-theme-muted font-semibold mb-3"
          >
            {activeCount > 0 ? `${activeCount} active` : "Set criteria, then Search"}
          </p>

          <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
            {(
              [
                ["leadNumber", "Lead #"],
                ["name", "Name"],
                ["phone", "Phone"],
                ["projectId", "Project"],
                ["status", "Status"],
                ["archivedBy", "Archived by"],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                className={
                  key === "name" || key === "projectId" ? "col-span-2" : undefined
                }
              >
                <label className="block type-label text-[9px] font-semibold uppercase tracking-wider text-theme-muted mb-0.5">
                  {label}
                </label>
                {key === "projectId" || key === "status" ? (
                  <select
                    value={draftFilters[key]}
                    onChange={(e) => updateDraft({ [key]: e.target.value })}
                    className={denseInput(!!draftFilters[key], "h-8 cursor-pointer")}
                  >
                    <option value="">All</option>
                    {key === "projectId"
                      ? Object.values(projects).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))
                      : LEAD_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={draftFilters[key]}
                    onChange={(e) => updateDraft({ [key]: e.target.value })}
                    onKeyDown={onEnterSearch}
                    className={denseInput(!!draftFilters[key], "h-8")}
                  />
                )}
              </div>
            ))}
            <div className="col-span-2">
              <label className="block type-label text-[9px] font-semibold uppercase tracking-wider text-theme-muted mb-0.5">
                Archived range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={draftFilters.archivedStart}
                  onChange={(e) =>
                    updateDraft({ archivedStart: e.target.value })
                  }
                  className={denseInput(!!draftFilters.archivedStart, "h-8")}
                />
                <input
                  type="date"
                  value={draftFilters.archivedEnd}
                  onChange={(e) =>
                    updateDraft({ archivedEnd: e.target.value })
                  }
                  className={denseInput(!!draftFilters.archivedEnd, "h-8")}
                />
              </div>
            </div>
          </div>
        </Modal>
      </div>

      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl bg-theme-card border border-theme-danger/30 rounded-theme p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl animate-sheetSlideUp">
          <div className="text-[11px] font-bold text-theme-text flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-theme-danger" />
            <span>
              <span className="text-theme-danger">{selectedLeadIds.length}</span>{" "}
              selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedLeadIds([])}
              className="ml-1 text-theme-muted hover:text-theme-text cursor-pointer border-0 bg-transparent p-0.5"
              aria-label="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="text-[11px] h-8 bg-theme-surface border border-theme-border rounded-lg px-2 text-theme-text cursor-pointer w-full sm:w-auto"
            >
              <option value="">Restore to…</option>
              {users
                .filter((u) => !isManagerial(u.role))
                .map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    {tc.username}
                  </option>
                ))}
            </select>

            <select
              value={restoreStatus}
              onChange={(e) => setRestoreStatus(e.target.value)}
              className="text-[11px] h-8 bg-theme-surface border border-theme-border rounded-lg px-2 text-theme-text cursor-pointer w-full sm:w-auto"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="reserved">Reserved</option>
              <option value="booked">Booked</option>
              <option value="not-attempted">Not Attempted</option>
            </select>

            <button
              type="button"
              onClick={handleBulkRestore}
              className="h-8 px-3 bg-theme-accent text-theme-accent-fg text-[11px] rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer border-0 w-full sm:w-auto justify-center"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restore
            </button>

            <button
              type="button"
              onClick={handleBulkDelete}
              className="h-8 px-3 bg-theme-danger text-white text-[11px] rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer border-0 w-full sm:w-auto justify-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}

      <Dialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Permanently delete leads?"
        description={`Permanently delete ${selectedLeadIds.length} lead${selectedLeadIds.length === 1 ? "" : "s"}? This cannot be undone.`}
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
        onConfirm={confirmBulkDelete}
      />
    </div>
  );
}
