import { useState } from "react";
import { X, Building2, User, DollarSign, Calendar } from "lucide-react";
import { Lead, Project, User as UserType } from "@/shared/types";
import { CreateDealPayload, DealStage, DEAL_STAGES } from "../types";

interface CreateDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  projects: Record<string, Project>;
  currentUser: UserType;
  onCreateDeal: (payload: CreateDealPayload) => Promise<unknown>;
}

export default function CreateDealModal({
  isOpen,
  onClose,
  leads,
  projects,
  currentUser,
  onCreateDeal,
}: CreateDealModalProps) {
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [plotNumber, setPlotNumber] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [stage, setStage] = useState<DealStage>("new_inquiry");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const projectList = Object.values(projects || {});

  const handleLeadChange = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      if (!title) setTitle(`Deal — ${lead.name}`);
      if (lead.projectId && !projectId) setProjectId(lead.projectId);
      if (lead.plotId && !plotNumber) setPlotNumber(lead.plotId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedLeadId || !projectId) return;

    const lead = leads.find((l) => l.id === selectedLeadId);
    const project = projects[projectId];
    const amount = parseFloat(amountStr) || 0;

    setIsSubmitting(true);
    try {
      await onCreateDeal({
        title: title.trim(),
        leadId: selectedLeadId,
        leadName: lead?.name || "Unknown Lead",
        phone: lead?.phone || "",
        email: lead?.email || "",
        projectId,
        projectName: project?.name || "Unknown Project",
        plotNumber: plotNumber.trim() || undefined,
        stage,
        amount,
        expectedCloseDate: expectedCloseDate || undefined,
        assignedTo: currentUser.id,
        assignedToName: currentUser.username || currentUser.email,
        notes: notes.trim() || undefined,
      });

      // Reset form
      setTitle("");
      setSelectedLeadId("");
      setProjectId("");
      setPlotNumber("");
      setAmountStr("");
      setStage("new_inquiry");
      setExpectedCloseDate("");
      setNotes("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop — Full Page Cover with Consistent Blur */}
      <div
        className="fixed inset-0 w-screen h-screen min-h-[100dvh] bg-theme-overlay backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-theme-card border border-theme-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[min(90vh,calc(100dvh-2rem))] pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-theme-accent/10 text-theme-accent">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-theme-text">Create New Deal</h2>
              <p className="text-xs text-theme-muted">Link a Lead to a Plot transaction pipeline</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-theme-muted hover:text-theme-text p-1.5 rounded-lg hover:bg-theme-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Select Lead */}
          <div>
            <label className="block text-xs font-semibold text-theme-text mb-1.5">
              Select Lead <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-theme-muted" />
              <select
                required
                value={selectedLeadId}
                onChange={(e) => handleLeadChange(e.target.value)}
                className="w-full bg-theme-surface border border-theme-border rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent"
              >
                <option value="">Select a Lead...</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deal Title */}
          <div>
            <label className="block text-xs font-semibold text-theme-text mb-1.5">
              Deal Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Plot 42 Purchase — Rahul Sharma"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-xs font-medium text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent"
            />
          </div>

          {/* Project & Plot Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-theme-text mb-1.5">
                Project Site <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-xs font-medium text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent"
              >
                <option value="">Select Site...</option>
                {projectList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-theme-text mb-1.5">Plot No.</label>
              <input
                type="text"
                placeholder="e.g. 104B"
                value={plotNumber}
                onChange={(e) => setPlotNumber(e.target.value)}
                className="w-full bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-xs font-medium text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent"
              />
            </div>
          </div>

          {/* Deal Amount & Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-theme-text mb-1.5">
                Deal Amount (₹)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-theme-muted" />
                <input
                  type="number"
                  placeholder="e.g. 2500000"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full bg-theme-surface border border-theme-border rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-theme-text mb-1.5">Initial Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as DealStage)}
                className="w-full bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-xs font-medium text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent"
              >
                {DEAL_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.probability}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expected Close Date */}
          <div>
            <label className="block text-xs font-semibold text-theme-text mb-1.5">Expected Close Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-theme-muted" />
              <input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="w-full bg-theme-surface border border-theme-border rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-theme-text mb-1.5">Deal Notes</label>
            <textarea
              rows={2}
              placeholder="Add key transaction terms or buyer preferences..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-xs font-medium text-theme-text placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-theme-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-theme-muted hover:text-theme-text hover:bg-theme-surface transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-theme-accent text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-xs"
            >
              {isSubmitting ? "Creating..." : "Save Deal"}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
