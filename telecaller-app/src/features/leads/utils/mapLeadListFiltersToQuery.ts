/**
 * Maps Wave 10 LeadListFilters → LeadQuerySpec server/client split.
 * Equality filters that are index-safe go server-side; the rest refine the page.
 */

import type { LeadListFilters } from "@/features/leads/config/leadListFilterConfig";
import type {
  LeadClientFilters,
  LeadServerFilters,
} from "@/shared/services/leads/leadQueryTypes";

export function mapLeadListFiltersToQuery(
  filters: LeadListFilters,
  options: {
    activeProjectId?: string | null;
    todayStr: string;
    /** When false, assignedTo stays client-only (agent already scoped by role). */
    pushAssignedToServer?: boolean;
  },
): { server: LeadServerFilters; client: LeadClientFilters } {
  const projectId = filters.projectId || options.activeProjectId || null;

  const server: LeadServerFilters = {
    projectId: projectId || null,
  };

  // Index-safe server filters only (provider applies projectId + manager assignedTo).
  // Status/priority/source refine client-side until composite indexes are deployed.
  if (options.pushAssignedToServer && filters.assignedTo) {
    server.assignedTo = filters.assignedTo;
  }

  const client: LeadClientFilters = {
    todayStr: options.todayStr,
    queueMode: filters.queueMode,
    leadNumber: filters.leadNumber || undefined,
    name: filters.name || undefined,
    phone: filters.phone || undefined,
    email: filters.email || undefined,
    followUpStart: filters.followUpStart || undefined,
    followUpEnd: filters.followUpEnd || undefined,
    createdDateStart: filters.createdDateStart || undefined,
    createdDateEnd: filters.createdDateEnd || undefined,
    statuses: filters.statuses.length > 0 ? [...filters.statuses] : undefined,
    priority: filters.priority || undefined,
    source: filters.source || undefined,
    leadMedium: filters.leadMedium || undefined,
    projectId: filters.projectId || undefined,
    assignedTo: filters.assignedTo || undefined,
  };

  return { server, client };
}
