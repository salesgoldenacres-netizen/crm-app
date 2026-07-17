import Badge from "@/shared/components/ui/Badge";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import EmptyState from "@/shared/components/ui/EmptyState";
import LoadingSpinner from "@/shared/components/ui/LoadingSpinner";
import type { AiResultSource, LeadBriefV1Output } from "@/shared/ai";
import CopilotAlert from "./CopilotAlert";

export type LeadBriefCardStatus =
  | "idle"
  | "loading"
  | "ready"
  | "disabled"
  | "error";

/** Why rules brief is shown instead of live AI (presentation only). */
export type LeadBriefFallbackKind = "ai_off" | "offline" | "error";

export interface LeadBriefCardProps {
  status: LeadBriefCardStatus;
  /** Parsed `lead-brief-v1` output when ready (AI or rules fallback). */
  data?: LeadBriefV1Output | null;
  source?: AiResultSource;
  errorMessage?: string;
  /**
   * True when Wave 6 rules brief is shown because AI is off / unavailable.
   */
  usedRulesFallback?: boolean;
  /** Distinguishes AI-off vs offline vs error fallback copy / badge. */
  fallbackKind?: LeadBriefFallbackKind;
  /** Retry AI brief load (error / after reconnect). */
  onRetry?: () => void;
}

function sourceBadgeLabel(
  source: AiResultSource,
  usedRulesFallback?: boolean,
  fallbackKind?: LeadBriefFallbackKind,
): string {
  // AI path (stub fixture or live llm) — not Wave 6 rules.
  if (source === "stub" || source === "llm") return "AI Generated";
  if (fallbackKind === "offline") return "Rules (offline)";
  if (usedRulesFallback || fallbackKind === "ai_off") return "Rules (AI off)";
  return "Rules";
}

/**
 * Read-only Lead Brief section for Sales Copilot.
 * Owns loading / empty / error / AI-off presentation — no CRM writes.
 * AI payloads are safety-validated + PII-redacted by the drawer before `data`
 * reaches this card; never render raw provider / prompt / stack text.
 */
export default function LeadBriefCard({
  status,
  data,
  source,
  errorMessage,
  usedRulesFallback,
  fallbackKind,
  onRetry,
}: LeadBriefCardProps) {
  return (
    <Card
      className="shadow-none px-3 py-3 space-y-2"
      aria-label="Lead brief"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted">
          Lead brief
        </h3>
        {source && status === "ready" && (
          <Badge
            variant={
              source === "rules"
                ? fallbackKind === "offline"
                  ? "warning"
                  : "default"
                : "primary"
            }
          >
            {sourceBadgeLabel(source, usedRulesFallback, fallbackKind)}
          </Badge>
        )}
        {status === "disabled" && <Badge variant="default">AI off</Badge>}
        {status === "error" && <Badge variant="danger">Error</Badge>}
        {status === "loading" && <Badge variant="primary">Loading</Badge>}
      </div>

      {status === "loading" && (
        <div
          className="flex items-center gap-2.5 py-2"
          role="status"
          aria-live="polite"
        >
          <LoadingSpinner size="sm" />
          <p className="text-xs text-theme-muted">Loading brief…</p>
        </div>
      )}

      {status === "disabled" && (
        <EmptyState
          variant="compact"
          title="AI is off"
          description="No rules brief is available. Use the Intelligence strip on this lead for score, health, and next action."
        />
      )}

      {status === "error" && (
        <div className="space-y-2">
          <CopilotAlert tone="danger" title="Brief unavailable">
            {errorMessage || "AI summary unavailable."}
          </CopilotAlert>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      )}

      {status === "idle" && (
        <EmptyState
          variant="compact"
          hideIcon
          title="Brief not loaded"
          description="Open Copilot to load a lead brief."
        />
      )}

      {status === "ready" && data && (
        <div className="space-y-2">
          {usedRulesFallback && fallbackKind === "offline" && (
            <CopilotAlert tone="warning" title="Offline">
              You&apos;re offline — showing Wave 6 rules brief. AI brief resumes
              when you reconnect.
            </CopilotAlert>
          )}
          {usedRulesFallback && fallbackKind === "error" && errorMessage && (
            <CopilotAlert tone="warning" title="AI unavailable">
              {errorMessage} Showing Wave 6 rules brief instead.
            </CopilotAlert>
          )}
          {usedRulesFallback &&
            (fallbackKind === "ai_off" || !fallbackKind) &&
            !errorMessage && (
              <CopilotAlert tone="muted" title="AI off">
                Showing Wave 6 rules brief. Same cards as AI mode — recommend
                only, no CRM writes.
              </CopilotAlert>
            )}
          {usedRulesFallback &&
            fallbackKind === "ai_off" &&
            errorMessage && (
              <CopilotAlert tone="muted" title="AI off">
                {errorMessage}
              </CopilotAlert>
            )}
          <p className="text-sm text-theme-text leading-relaxed">{data.brief}</p>
          {data.bullets && data.bullets.length > 0 && (
            <ul className="list-disc pl-4 space-y-1">
              {data.bullets.map((bullet, i) => (
                <li
                  key={i}
                  className="text-xs text-theme-muted leading-relaxed"
                >
                  {bullet}
                </li>
              ))}
            </ul>
          )}
          {usedRulesFallback &&
            fallbackKind === "error" &&
            onRetry && (
              <Button variant="ghost" size="sm" onClick={onRetry}>
                Retry AI brief
              </Button>
            )}
        </div>
      )}

      {status === "ready" && !data && (
        <EmptyState
          variant="compact"
          title="No brief"
          description="Brief data is empty for this lead."
        />
      )}
    </Card>
  );
}
