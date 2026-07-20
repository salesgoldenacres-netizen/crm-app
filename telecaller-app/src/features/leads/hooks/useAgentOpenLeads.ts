/**
 * Agent-only convenience: bounded realtime assigned leads from DatabaseContext.
 * NOT the lead-list source of truth (that is LeadQueryService).
 * Managers receive an empty array by design (Phase B).
 */

import { useDatabase } from "@/shared/services/DatabaseContext";
import type { Lead } from "@/shared/types";

export function useAgentOpenLeads(): {
  openLeads: Lead[];
  isLoaded: boolean;
} {
  const { leads, isLeadsLoaded } = useDatabase();
  return { openLeads: leads, isLoaded: isLeadsLoaded };
}
