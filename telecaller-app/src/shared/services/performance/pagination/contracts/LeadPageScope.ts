/**
 * Provider-specific scope for lead list pagination.
 * Only index-safe equality filters are applied server-side today:
 * projectId, assignedTo (manager filter). Status/priority/search refine client-side
 * until matching composite indexes are deployed.
 */

export type LeadPageOrderField = "updatedAt" | "createdAt" | "followUpDate";

export interface LeadPageScope {
  orderField?: LeadPageOrderField;
  orderDirection?: "asc" | "desc";
  projectId?: string | null;
  /** Manager filter: further narrow by assignee (agents already role-scoped). */
  assignedTo?: string;
  /**
   * Reserved for future index-backed filters. Ignored by FirestorePaginationProvider
   * until composite indexes exist (see firestore.indexes.json notes).
   */
  status?: string;
  statuses?: string[];
  priority?: string;
  leadSource?: string;
  leadMedium?: string;
  /** When true, queryScopes omits fsLimit — provider applies pageSize+1. */
  omitLimit?: boolean;
}
