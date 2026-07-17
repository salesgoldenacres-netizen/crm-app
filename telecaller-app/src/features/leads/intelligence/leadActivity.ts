/**
 * Lead intelligence — activity / date helpers (pure).
 * Computed-on-read; no Firestore writes.
 */

import {
  addIstDays,
  compareYmd,
  getIstDateString,
} from "@/shared/contracts";

export interface LeadActivitySnapshot {
  status?: string | null;
  priority?: string | null;
  followUpDate?: string | null;
  followUpOn?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  createdTime?: string | null;
  source?: string | null;
  leadSource?: string | null;
  leadMedium?: string | null;
  notes?: string | null;
  siteVisit?: { date?: string; status?: string } | null;
  callLogs?: Array<{
    date?: string;
    disposition?: string;
    status?: string;
    note?: string;
    timestamp?: string;
  }>;
  phone?: string | null;
}

export function resolveFollowUpYmd(lead: LeadActivitySnapshot): string {
  const raw = String(lead.followUpDate || lead.followUpOn || "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

export function ymdDiffDays(a: string, b: string): number {
  if (!a || !b) return 0;
  const am = a.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const bm = b.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!am || !bm) return 0;
  const aUtc = Date.UTC(Number(am[1]), Number(am[2]) - 1, Number(am[3]));
  const bUtc = Date.UTC(Number(bm[1]), Number(bm[2]) - 1, Number(bm[3]));
  return Math.round((aUtc - bUtc) / 86_400_000);
}

/** Calendar days overdue (0 if not overdue). */
export function getOverdueDays(
  lead: LeadActivitySnapshot,
  todayYmd: string = getIstDateString(),
): number {
  const fu = resolveFollowUpYmd(lead);
  if (!fu) return 0;
  if (compareYmd(fu, todayYmd) >= 0) return 0;
  return Math.max(0, ymdDiffDays(todayYmd, fu));
}

function toYmd(value?: string | null): string {
  if (!value) return "";
  const s = String(value).trim();
  const direct = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (direct) return direct[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return getIstDateString(d);
  } catch {
    return "";
  }
}

/** Last activity YMD = max(updatedAt, last callLog date/timestamp, createdAt). */
export function getLastActivityYmd(lead: LeadActivitySnapshot): string {
  const candidates: string[] = [];
  const updated = toYmd(lead.updatedAt);
  if (updated) candidates.push(updated);

  const created = toYmd(lead.createdAt || lead.createdTime);
  if (created) candidates.push(created);

  for (const log of lead.callLogs || []) {
    const y = toYmd(log.timestamp || log.date);
    if (y) candidates.push(y);
  }

  if (candidates.length === 0) return "";
  return candidates.reduce((best, cur) =>
    compareYmd(cur, best) > 0 ? cur : best,
  );
}

/** Days since last activity (0 if unknown / today). */
export function getStaleDays(
  lead: LeadActivitySnapshot,
  todayYmd: string = getIstDateString(),
): number {
  const last = getLastActivityYmd(lead);
  if (!last) return 0;
  return Math.max(0, ymdDiffDays(todayYmd, last));
}

export function isFollowUpMissing(lead: LeadActivitySnapshot): boolean {
  return !resolveFollowUpYmd(lead);
}

export function isPaidSource(lead: LeadActivitySnapshot): boolean {
  const blob = [
    lead.source,
    lead.leadSource,
    lead.leadMedium,
    lead.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /google|meta|facebook|instagram|paid|ads?|ppc|cpc/.test(blob);
}

export function hadConnectedCall(lead: LeadActivitySnapshot): boolean {
  return (lead.callLogs || []).some((log) => {
    const d = String(log.disposition || log.status || "").toLowerCase();
    return /connect|answered|picked|talk/.test(d) || log.disposition === "Connected";
  });
}

export function hasRecentConnect(
  lead: LeadActivitySnapshot,
  nowMs: number,
  withinHours: number,
): boolean {
  const cutoff = nowMs - withinHours * 3_600_000;
  return (lead.callLogs || []).some((log) => {
    const d = String(log.disposition || log.status || "").toLowerCase();
    const connected =
      /connect|answered|picked|talk/.test(d) || log.disposition === "Connected";
    if (!connected) return false;
    const raw = log.timestamp || log.date;
    if (!raw) return false;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
}

export function countTrailingRnrOrUnanswered(
  lead: LeadActivitySnapshot,
): number {
  const logs = [...(lead.callLogs || [])].reverse();
  let count = 0;
  for (const log of logs) {
    const d = String(log.disposition || log.status || "").toLowerCase();
    const isRnr =
      /\brnr\b|no.?answer|unanswered|not.?reachable|ring.?no/.test(d) ||
      d === "rnr";
    if (isRnr) count += 1;
    else break;
  }
  return count;
}

/** Hours ago helper for tests — IST date string N days before today. */
export function daysAgoYmd(days: number, todayYmd?: string): string {
  return addIstDays(todayYmd ?? getIstDateString(), -days);
}
