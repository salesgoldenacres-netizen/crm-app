import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { TrendingUp, PhoneCall, Trash2 } from "lucide-react";
import SegmentedStageTracker from "@/shared/components/SegmentedStageTracker";
import Badge from "@/shared/components/ui/Badge";
import Dialog from "@/shared/components/ui/Dialog";
import { User, Lead, Project } from "@/shared/types";
import { leadHealthV1, leadScoreV1 } from "@/features/leads/intelligence";

interface LeadsTableRowProps {
  lead: Lead;
  isSelected: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
  leadsViewMode: "compact" | "normal";
  projects: Record<string, Project>;
  todayStr: string;
  isLeadIdle: (lead: Lead) => boolean;
  shouldHideEmail: boolean;
  shouldHideLeadSource: boolean;
  logCall: (leadId: string, logData: Record<string, unknown>) => Promise<void>;
  setActiveLead: (lead: Lead) => void;
  setCallLogForm: (form: Record<string, unknown>) => void;
  user: User;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
  safeFormatDateTime: (dateStr?: string, showTime?: boolean) => string;
  archiveLeads: (ids: string[], username: string) => Promise<void>;
}

function LeadsTableRow({
  lead,
  isSelected,
  onToggleSelect,
  leadsViewMode,
  projects,
  todayStr,
  isLeadIdle,
  shouldHideEmail,
  shouldHideLeadSource,
  logCall,
  setActiveLead,
  setCallLogForm,
  user,
  toast,
  safeFormatDateTime,
  archiveLeads,
}: LeadsTableRowProps) {
  const [binConfirmOpen, setBinConfirmOpen] = useState(false);
  const projectObj = projects[lead.projectId || ""];
  const isOverdue =
    lead.followUpDate &&
    lead.followUpDate < todayStr &&
    lead.status !== "booked" &&
    lead.status !== "not-interested";
  const isToday = lead.followUpDate === todayStr;
  const intelChip = useMemo(() => {
    const scored = leadScoreV1(lead, { todayYmd: todayStr });
    const health = leadHealthV1(lead, todayStr);
    return {
      score: scored.score,
      band: scored.scoreBand,
      health: health.health,
    };
  }, [lead, todayStr]);
  const healthBadgeVariant =
    intelChip.health === "critical"
      ? "danger"
      : intelChip.health === "watch"
        ? "warning"
        : "success";
  const scoreBadgeVariant =
    intelChip.band === "hot"
      ? "danger"
      : intelChip.band === "warm"
        ? "warning"
        : "default";

  return (
    <>
    <tr
      key={lead.id}
      className={`hover:bg-theme-surface/60 transition-colors ${
        isSelected ? "bg-theme-accent-muted/40" : ""
      }`}
    >
      <td className={`${leadsViewMode === "compact" ? "px-3 py-2" : "px-4 py-4"} whitespace-nowrap`}>
        <input
          type="checkbox"
          className="rounded border-theme-border text-theme-accent focus:ring-theme-ring cursor-pointer"
          checked={isSelected}
          onChange={(e) => {
            onToggleSelect(lead.id, e.target.checked);
          }}
        />
      </td>
      {/* Tertiary: lead number */}
      <td
        className={`${
          leadsViewMode === "compact" ? "px-3 py-2 text-xs" : "px-6 py-4 text-sm"
        } whitespace-nowrap text-theme-muted`}
      >
        {lead.leadReference ? lead.leadReference.substring(0, 10) + "..." : lead.leadNumber || "—"}
      </td>
      {leadsViewMode !== "compact" && (
        <td className="px-6 py-4 whitespace-nowrap text-xs text-theme-muted">
          {safeFormatDateTime(lead.createdTime || lead.createdAt)}
        </td>
      )}
      {/* Primary: name */}
      <td className={`${leadsViewMode === "compact" ? "px-3 py-2" : "px-6 py-4"} whitespace-nowrap`}>
        {leadsViewMode === "compact" ? (
          <div className="space-y-0.5 text-theme-text">
            <div className="text-xs font-semibold flex items-center flex-wrap gap-1">
              <Link
                to={`/lead/${lead.id}`}
                className="font-semibold text-theme-text hover:text-theme-accent hover:underline cursor-pointer"
              >
                {lead.name || "Unnamed"}
              </Link>
              {lead.priority === "hot" && <Badge variant="warning">Hot</Badge>}
              {lead.priority === "cold" && <Badge variant="info">Cold</Badge>}
              {isLeadIdle(lead) && <Badge variant="warning">Idle</Badge>}
              <Badge
                variant={scoreBadgeVariant}
                title={`System score ${intelChip.score}`}
              >
                {intelChip.score}
              </Badge>
              {intelChip.health !== "healthy" && (
                <Badge variant={healthBadgeVariant}>{intelChip.health}</Badge>
              )}
            </div>
            {/* Secondary: phone under name in compact */}
            <div className="text-[10px] text-theme-muted font-medium">{lead.phone}</div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-sm">
            <Link
              to={`/lead/${lead.id}`}
              className="font-semibold text-theme-text hover:text-theme-accent hover:underline cursor-pointer"
            >
              {lead.name || "Unnamed"}
            </Link>
            {isLeadIdle(lead) && <Badge variant="warning">Idle</Badge>}
            <Badge
              variant={scoreBadgeVariant}
              title={`System score ${intelChip.score} (${intelChip.band})`}
            >
              {intelChip.score}
            </Badge>
            {intelChip.health !== "healthy" && (
              <Badge variant={healthBadgeVariant}>{intelChip.health}</Badge>
            )}
          </div>
        )}
      </td>
      {leadsViewMode !== "compact" && (
        <>
          {/* Secondary: phone */}
          <td className="px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-theme-text">
            {lead.phone}
          </td>
          {/* Tertiary */}
          <td className="px-6 py-4 whitespace-nowrap text-xs text-theme-muted">
            {shouldHideEmail ? (
              <span className="text-[10px] text-theme-muted italic">Hidden</span>
            ) : (
              lead.email || "—"
            )}
          </td>
          {/* Secondary: source */}
          <td className="px-6 py-4 whitespace-nowrap text-xs text-theme-muted">
            {shouldHideLeadSource ? (
              <span className="text-[10px] text-theme-muted italic">Hidden</span>
            ) : (
              lead.leadSource || "Direct Call"
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-xs text-theme-muted">
            {shouldHideLeadSource ? (
              <span className="text-[10px] text-theme-muted italic">Hidden</span>
            ) : (
              lead.leadMedium || "Direct"
            )}
          </td>
        </>
      )}
      {leadsViewMode === "compact" && (
        <td className="px-3 py-2 whitespace-nowrap text-xs text-theme-muted">
          {shouldHideLeadSource ? (
            <span className="text-[10px] text-theme-muted italic">Hidden</span>
          ) : (
            lead.leadSource || "Direct"
          )}
        </td>
      )}
      {/* Primary: status */}
      <td className={`${leadsViewMode === "compact" ? "px-3 py-2" : "px-6 py-4"} whitespace-nowrap`}>
        <SegmentedStageTracker status={lead.status || "new"} />
      </td>
      {/* Tertiary: touchpoints */}
      <td
        className={`${
          leadsViewMode === "compact" ? "px-3 py-2 text-center text-xs" : "px-6 py-4 text-center text-sm"
        } whitespace-nowrap text-theme-muted`}
      >
        {lead.callCount ?? lead.callLogs?.length ?? 0}
      </td>
      {/* Primary: follow-up */}
      <td className={`${leadsViewMode === "compact" ? "px-3 py-2" : "px-6 py-4"} whitespace-nowrap`}>
        {lead.followUpDate ? (
          <div className="flex flex-col">
            <span
              className={`text-xs font-semibold ${
                isOverdue
                  ? "text-theme-danger"
                  : isToday
                    ? "text-theme-warning"
                    : "text-theme-text"
              }`}
            >
              {lead.followUpDate}
            </span>
            {isOverdue && (
              <span className="text-[8px] font-semibold text-theme-danger uppercase tracking-wide">
                OVERDUE
              </span>
            )}
            {isToday && (
              <span className="text-[8px] font-semibold text-theme-warning uppercase tracking-wide">
                TODAY
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-theme-muted italic">No Follow Up</span>
        )}
      </td>
      {/* Secondary: assignee */}
      <td
        className={`${
          leadsViewMode === "compact" ? "px-3 py-2 text-xs" : "px-6 py-4 text-sm"
        } whitespace-nowrap text-theme-text`}
      >
        {lead.assignedToName || "Unassigned"}
      </td>
      {leadsViewMode !== "compact" && (
        <td className="px-6 py-4 whitespace-nowrap text-xs text-theme-muted">
          {lead.createdBy || "system"}
        </td>
      )}
      <td
        className={`${
          leadsViewMode === "compact" ? "px-3 py-2" : "px-6 py-4"
        } whitespace-nowrap text-right text-xs font-medium`}
      >
        <div className="flex items-center justify-end space-x-2">
          {projectObj && lead.plotId && (
            <div
              className="inline-flex items-center space-x-0.5 bg-theme-accent-muted text-theme-accent px-2 py-0.5 rounded-theme text-[10px] font-semibold border border-theme-border"
              title={`Plot: ${lead.plotId} of Project: ${projectObj.name}`}
            >
              <TrendingUp className="w-3 h-3 text-theme-accent" />
              <span>
                {projectObj.name.slice(0, 8)}.. #{lead.plotId}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={async () => {
              setActiveLead(lead);
              setCallLogForm({
                note: "",
                status: lead.status || "contacted",
                followUpDate: lead.followUpDate || "",
                priority: lead.priority || "warm",
                disposition: "Connected",
              });
              await logCall(lead.id, {
                note: "Started call via outbound workspace dialer",
                status: lead.status || "contacted",
                agent: user.username,
                timelineActivity: "none",
              });
            }}
            className="inline-flex items-center p-1 border border-theme-border text-theme-accent hover:bg-theme-accent-muted rounded-theme transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
            title="Start Outbound Call"
          >
            <PhoneCall className="w-3.5 h-3.5" />
          </button>

          {user.role === "admin" && (
            <button
              type="button"
              onClick={() => setBinConfirmOpen(true)}
              className="inline-flex items-center p-1 border border-theme-danger/30 text-theme-danger hover:bg-theme-danger/10 rounded-theme transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              title="Move to Lead Bin"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>

    {createPortal(
      <Dialog
        isOpen={binConfirmOpen}
        onClose={() => setBinConfirmOpen(false)}
        title="Move to Lead Bin?"
        description={`Are you sure you want to move ${lead.name} to the Lead Bin?`}
        confirmLabel="Move to Bin"
        confirmVariant="danger"
        onConfirm={async () => {
          try {
            await archiveLeads([lead.id], user.username);
            toast(`Moved ${lead.name} to the bin successfully.`, "success");
            setBinConfirmOpen(false);
          } catch (err: unknown) {
            setBinConfirmOpen(false);
            const msg = err instanceof Error ? err.message : String(err);
            toast(`Failed to move lead: ${msg}`, "error");
          }
        }}
      />,
      document.body
    )}
    </>
  );
}

// Optimization check: memoize rows to prevent re-renders when selection array reference changes
export default React.memo(LeadsTableRow, (prevProps, nextProps) => {
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.leadsViewMode === nextProps.leadsViewMode &&
    prevProps.todayStr === nextProps.todayStr &&
    prevProps.shouldHideEmail === nextProps.shouldHideEmail &&
    prevProps.shouldHideLeadSource === nextProps.shouldHideLeadSource &&
    prevProps.lead.id === nextProps.lead.id &&
    prevProps.lead.status === nextProps.lead.status &&
    prevProps.lead.priority === nextProps.lead.priority &&
    prevProps.lead.followUpDate === nextProps.lead.followUpDate &&
    prevProps.lead.updatedAt === nextProps.lead.updatedAt &&
    prevProps.lead.assignedTo === nextProps.lead.assignedTo &&
    Boolean(prevProps.lead.siteVisit) === Boolean(nextProps.lead.siteVisit) &&
    (prevProps.lead.callCount ?? prevProps.lead.callLogs?.length ?? 0) ===
      (nextProps.lead.callCount ?? nextProps.lead.callLogs?.length ?? 0) &&
    prevProps.projects === nextProps.projects &&
    prevProps.user.id === nextProps.user.id
  );
});
