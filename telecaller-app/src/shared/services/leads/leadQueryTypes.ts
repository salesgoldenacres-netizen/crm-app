/**
 * LeadQueryService query specification.
 * Lead list UIs configure queries — they do not own an in-memory company lead collection.
 */

import type { CursorToken } from "@/shared/services/performance/pagination/contracts/CursorToken";
import { DEFAULT_PAGE_SIZE } from "@/shared/services/performance/pagination/contracts/paginationConstants";

export type LeadOrderField = "updatedAt" | "createdAt" | "followUpDate";
export type LeadOrderDirection = "asc" | "desc";

/** Filters that can be pushed to Firestore equality / `in` clauses. */
export interface LeadServerFilters {
  projectId?: string | null;
  assignedTo?: string;
  /** Single status equality (preferred when only one selected). */
  status?: string;
  /** Up to 10 statuses → Firestore `in`. */
  statuses?: string[];
  priority?: string;
  leadSource?: string;
  leadMedium?: string;
}

/**
 * Client-side refine applied after a server page is fetched.
 * Used for text search and predicates that need composite indexes we do not yet deploy.
 */
export interface LeadClientFilters {
  search?: string;
  leadNumber?: string;
  name?: string;
  phone?: string;
  email?: string;
  queueMode?: "" | "overdue";
  followUpStart?: string;
  followUpEnd?: string;
  createdDateStart?: string;
  createdDateEnd?: string;
  /** Extra statuses not applied server-side (when >10 or mixed with client refine). */
  statuses?: string[];
  source?: string;
  priority?: string;
  projectId?: string;
  assignedTo?: string;
  leadMedium?: string;
  todayStr?: string;
}

export interface LeadQuerySpec {
  /** Role uid for agent scoping. */
  uid: string;
  roleCode: string;
  pageSize: number;
  orderField: LeadOrderField;
  orderDirection: LeadOrderDirection;
  server: LeadServerFilters;
  client: LeadClientFilters;
  /** Prefetch the next page into LeadPageCache when current page has a next cursor. */
  prefetchNext?: boolean;
}

export interface LeadQueryPageRequest {
  spec: LeadQuerySpec;
  cursor?: CursorToken;
}

export function createDefaultLeadQuerySpec(
  uid: string,
  roleCode: string,
  overrides: Partial<LeadQuerySpec> = {},
): LeadQuerySpec {
  const { server, client, ...rest } = overrides;
  return {
    uid,
    roleCode,
    pageSize: DEFAULT_PAGE_SIZE,
    orderField: "updatedAt",
    orderDirection: "desc",
    prefetchNext: true,
    ...rest,
    server: { ...(server ?? {}) },
    client: { ...(client ?? {}) },
  };
}

/**
 * Deterministic cache / identity key for a query spec (excludes cursor).
 * Filter or search changes → new key → caller resets cursor to page 1.
 */
export function leadQuerySpecCacheKey(spec: LeadQuerySpec): string {
  const payload = {
    uid: spec.uid,
    role: spec.roleCode,
    pageSize: spec.pageSize,
    orderField: spec.orderField,
    orderDirection: spec.orderDirection,
    server: normalizeServerFilters(spec.server),
    client: normalizeClientFilters(spec.client),
  };
  return JSON.stringify(payload);
}

function normalizeServerFilters(f: LeadServerFilters): LeadServerFilters {
  return {
    projectId: f.projectId ?? null,
    assignedTo: f.assignedTo || undefined,
    status: f.status || undefined,
    statuses: f.statuses?.length ? [...f.statuses].sort() : undefined,
    priority: f.priority || undefined,
    leadSource: f.leadSource || undefined,
    leadMedium: f.leadMedium || undefined,
  };
}

function normalizeClientFilters(f: LeadClientFilters): LeadClientFilters {
  return {
    search: f.search?.trim().toLowerCase() || undefined,
    leadNumber: f.leadNumber?.trim().toLowerCase() || undefined,
    name: f.name?.trim().toLowerCase() || undefined,
    phone: f.phone?.trim() || undefined,
    email: f.email?.trim().toLowerCase() || undefined,
    queueMode: f.queueMode || undefined,
    followUpStart: f.followUpStart || undefined,
    followUpEnd: f.followUpEnd || undefined,
    createdDateStart: f.createdDateStart || undefined,
    createdDateEnd: f.createdDateEnd || undefined,
    statuses: f.statuses?.length ? [...f.statuses].sort() : undefined,
    source: f.source || undefined,
    priority: f.priority || undefined,
    projectId: f.projectId || undefined,
    assignedTo: f.assignedTo || undefined,
    leadMedium: f.leadMedium || undefined,
    todayStr: f.todayStr || undefined,
  };
}
