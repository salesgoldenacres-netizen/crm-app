import { createElement, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Phone,
  MessageCircle,
  CalendarClock,
  Merge,
  ClipboardList,
} from "lucide-react";
import Badge from "@/shared/components/ui/Badge";
import type {
  LeadIntelligence,
  LeadNextActionType,
  LeadScoreFactor,
} from "@/shared/contracts";
import type { Lead } from "@/shared/types";
import { computeLeadIntelligence } from "@/features/leads/intelligence";

interface LeadIntelligenceStripProps {
  lead: Lead;
  allLeads?: Lead[];
  isManagerial?: boolean;
  todayYmd: string;
}

function nextActionIcon(type: LeadNextActionType) {
  switch (type) {
    case "whatsapp":
      return MessageCircle;
    case "schedule_visit":
      return CalendarClock;
    case "merge_review":
      return Merge;
    case "log_outcome":
      return ClipboardList;
    default:
      return Phone;
  }
}

function healthVariant(
  health: LeadIntelligence["health"],
): "success" | "warning" | "danger" {
  if (health === "critical") return "danger";
  if (health === "watch") return "warning";
  return "success";
}

function scoreVariant(
  band: LeadIntelligence["scoreBand"],
): "danger" | "warning" | "default" {
  if (band === "hot") return "danger";
  if (band === "warm") return "warning";
  return "default";
}

export default function LeadIntelligenceStrip({
  lead,
  allLeads = [],
  isManagerial = false,
  todayYmd,
}: LeadIntelligenceStripProps) {
  const intelligence = useMemo(
    () =>
      computeLeadIntelligence(lead, {
        todayYmd,
        isManagerial,
        peers: allLeads.map((l) => ({ id: l.id, phone: l.phone })),
      }),
    [lead, allLeads, isManagerial, todayYmd],
  );

  const actionIconType = nextActionIcon(intelligence.nextAction.type);
  const agentPriority = (lead.priority || "warm").toLowerCase();
  const bandMismatch =
    agentPriority === "hot" ||
    agentPriority === "warm" ||
    agentPriority === "cold"
      ? agentPriority !== intelligence.scoreBand
      : false;

  const topFactors = intelligence.scoreFactors
    .slice()
    .sort((a: LeadScoreFactor, b: LeadScoreFactor) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4);

  return (
    <section
      className="card-premium p-4 sm:p-5 space-y-3"
      aria-label="Lead intelligence"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity
            className="w-4 h-4 text-theme-accent shrink-0"
            aria-hidden
          />
          <h2 className="text-sm font-semibold text-theme-text tracking-tight">
            Intelligence
          </h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
            v1 · deterministic
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={scoreVariant(intelligence.scoreBand)}>
            Score {intelligence.score} · {intelligence.scoreBand}
          </Badge>
          <Badge variant={healthVariant(intelligence.health)}>
            {intelligence.health}
          </Badge>
          {bandMismatch && (
            <Badge variant="primary" title="Agent priority may override system band">
              Agent {agentPriority}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0 rounded-theme border border-theme-border bg-theme-surface/60 px-3 py-2.5">
          <div className="flex items-start gap-2">
            {createElement(actionIconType, {
              className: "w-4 h-4 mt-0.5 text-theme-accent shrink-0",
              "aria-hidden": true,
            })}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted">
                Next action
              </p>
              <p className="text-sm font-semibold text-theme-text capitalize">
                {intelligence.nextAction.type.replace(/_/g, " ")}
                {intelligence.nextAction.channel
                  ? ` · ${intelligence.nextAction.channel}`
                  : ""}
              </p>
              <p className="text-xs text-theme-muted mt-0.5">
                {intelligence.nextAction.reason}
              </p>
            </div>
          </div>
        </div>

        <div className="sm:w-44 shrink-0 rounded-theme border border-theme-border bg-theme-surface/60 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted">
            Booking prior
          </p>
          <p className="text-sm font-semibold text-theme-text tabular-nums">
            {Math.round(intelligence.bookingProbability * 100)}%
          </p>
          <p className="text-[10px] text-theme-muted mt-0.5">
            Stale {intelligence.staleDays}d
          </p>
        </div>
      </div>

      {topFactors.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Score factors">
          {topFactors.map((f) => (
            <li key={f.id}>
              <span
                className={`inline-flex items-center rounded-theme border px-2 py-0.5 text-[10px] font-semibold ${
                  f.delta >= 0
                    ? "border-theme-success/30 bg-theme-success/10 text-theme-success"
                    : "border-theme-danger/30 bg-theme-danger/10 text-theme-danger"
                }`}
              >
                {f.label} {f.delta > 0 ? `+${f.delta}` : f.delta}
              </span>
            </li>
          ))}
        </ul>
      )}

      {intelligence.duplicateRisk !== "none" && (
        <div className="flex items-start gap-2 rounded-theme border border-theme-warning/30 bg-theme-warning/10 px-3 py-2">
          <AlertTriangle
            className="w-4 h-4 text-theme-warning shrink-0 mt-0.5"
            aria-hidden
          />
          <div className="min-w-0 text-xs text-theme-text">
            <p className="font-semibold">
              {intelligence.duplicateCandidateIds?.length || 0} possible
              duplicate
              {(intelligence.duplicateCandidateIds?.length || 0) === 1
                ? ""
                : "s"}{" "}
              ({intelligence.duplicateRisk})
            </p>
            <p className="text-theme-muted mt-0.5">
              Same phone group detected.{" "}
              {isManagerial ? (
                <Link
                  to="/admin"
                  className="text-theme-accent hover:underline font-semibold"
                >
                  Review in Merge Settings
                </Link>
              ) : (
                "Ask a manager to review merge."
              )}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
