/**
 * Allowlisted lead facts for AI prompts — PII redacted by default.
 * Pure / read-only. No Firestore.
 */

import { getLeadStatusLabel } from "@/shared/contracts";
import { phoneLast4, scrubPiiFromText } from "./redact";
import type {
  BuildLeadContextOptions,
  LeadContextPack,
  LeadContextSource,
} from "./types";

function firstNonEmpty(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return undefined;
}

export function buildLeadContext(
  lead: LeadContextSource,
  options: BuildLeadContextOptions = {},
): LeadContextPack {
  const notesMax =
    options.notesMaxChars === undefined ? 120 : options.notesMaxChars;
  const status = String(lead.status ?? "").trim();
  const followUpDate = firstNonEmpty(lead.followUpDate, lead.followUpOn);
  const source = firstNonEmpty(lead.source, lead.leadSource);
  const siteVisit = lead.siteVisit ?? null;
  const hasSiteVisit = Boolean(
    siteVisit &&
      (siteVisit.date || siteVisit.status || siteVisit.time),
  );

  const pack: LeadContextPack = {
    leadId: String(lead.id ?? "").trim(),
    status: status || "—",
    statusLabel: getLeadStatusLabel(status || null),
    hasSiteVisit,
  };

  const priority = firstNonEmpty(lead.priority);
  if (priority) pack.priority = priority;

  if (source) pack.source = source;
  if (followUpDate) pack.followUpDate = followUpDate;

  if (hasSiteVisit && siteVisit) {
    if (siteVisit.date) pack.siteVisitDate = String(siteVisit.date).trim();
    if (siteVisit.status) {
      pack.siteVisitStatus = String(siteVisit.status).trim();
    }
  }

  const budget = firstNonEmpty(lead.budget);
  if (budget) pack.budget = budget;

  if (Array.isArray(lead.tags) && lead.tags.length > 0) {
    pack.tags = lead.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 8);
  }

  const projectId = firstNonEmpty(lead.projectId);
  if (projectId) pack.projectId = projectId;

  const leadNumber = firstNonEmpty(lead.leadNumber);
  if (leadNumber) pack.leadNumber = leadNumber;

  if (notesMax > 0 && lead.notes) {
    const snippet = scrubPiiFromText(String(lead.notes), notesMax);
    if (snippet) pack.notesSnippet = snippet;
  }

  if (options.includePhoneLast4) {
    const last = phoneLast4(lead.phone);
    if (last) pack.phoneLast4 = last;
  }

  // Explicitly never copy email / address / full phone / full name into the pack.
  return pack;
}
