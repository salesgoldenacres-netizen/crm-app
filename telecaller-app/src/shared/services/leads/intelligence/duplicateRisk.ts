/**
 * Duplicate phone risk — client-side, no new collections.
 */

import type { DuplicateRisk } from "@/shared/contracts";

export interface DuplicatePeer {
  id: string;
  phone?: string | null;
}

function digitsOnly(phone: string): string {
  return String(phone || "").replace(/\D/g, "");
}

function last10(phone: string): string {
  const d = digitsOnly(phone);
  return d.length >= 10 ? d.slice(-10) : d;
}

export function assessDuplicateRisk(
  lead: { id: string; phone?: string | null },
  peers: DuplicatePeer[],
): { duplicateRisk: DuplicateRisk; duplicateCandidateIds: string[] } {
  const selfDigits = digitsOnly(lead.phone || "");
  const selfLast10 = last10(lead.phone || "");
  if (!selfLast10) {
    return { duplicateRisk: "none", duplicateCandidateIds: [] };
  }

  const confirmed: string[] = [];
  const possible: string[] = [];

  for (const peer of peers) {
    if (!peer.id || peer.id === lead.id) continue;
    const peerDigits = digitsOnly(peer.phone || "");
    const peerLast10 = last10(peer.phone || "");
    if (!peerLast10) continue;

    if (selfDigits && peerDigits && selfDigits === peerDigits) {
      confirmed.push(peer.id);
    } else if (selfLast10 === peerLast10) {
      possible.push(peer.id);
    }
  }

  if (confirmed.length > 0) {
    return {
      duplicateRisk: "confirmed",
      duplicateCandidateIds: [...new Set([...confirmed, ...possible])],
    };
  }
  if (possible.length > 0) {
    return {
      duplicateRisk: "possible",
      duplicateCandidateIds: [...new Set(possible)],
    };
  }
  return { duplicateRisk: "none", duplicateCandidateIds: [] };
}
