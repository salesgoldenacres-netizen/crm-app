/**
 * Canonical lead-list read path (Production Hardening Phase B):
 *
 *   Lead List UI → LeadQueryService → FirestorePaginationProvider → Firestore
 *
 * Mutations stay on LeadRepository / useLeadsStore — queries vs writes stay separate.
 */

import type { CustomRole, Lead, User } from "@/shared/types";
import { leadPageCache } from "@/shared/services/performance/cache/LeadPageCache";
import { PaginationService } from "@/shared/services/performance/pagination/PaginationService";
import { FirestorePaginationProvider } from "@/shared/services/performance/pagination/providers/FirestorePaginationProvider";
import type { CursorPage } from "@/shared/services/performance/pagination/contracts/CursorPage";
import type { CursorToken } from "@/shared/services/performance/pagination/contracts/CursorToken";
import { applyLeadClientFilters } from "./applyLeadClientFilters";
import {
  leadQuerySpecCacheKey,
  type LeadQuerySpec,
} from "./leadQueryTypes";

export class LeadQueryService {
  private readonly navigation = new PaginationService();
  private prefetchInFlight = new Set<string>();

  constructor(
    private readonly user: User | null,
    private readonly customRoles: CustomRole[] = [],
    private readonly cache = leadPageCache,
  ) {}

  /** Spec identity for cache / filter-change detection (no cursor). */
  static specKey(spec: LeadQuerySpec): string {
    return leadQuerySpecCacheKey(spec);
  }

  /**
   * Fetch one cursor page for the given query spec.
   * Changing filters/search → new spec key → pass `cursor: undefined` (page 1).
   */
  async fetchPage(
    spec: LeadQuerySpec,
    cursor?: CursorToken,
  ): Promise<CursorPage<Lead>> {
    PaginationService.validatePageSize(spec.pageSize);

    const projectSegment = spec.server.projectId || "all";
    const cacheKey = PaginationService.generateCacheKey(
      projectSegment,
      spec.pageSize,
      cursor,
      [LeadQueryService.specKey(spec)],
      `${spec.orderField}:${spec.orderDirection}`,
    );

    const cached = this.cache.get(projectSegment, cacheKey);
    if (cached) {
      return cached;
    }

    const provider = new FirestorePaginationProvider(
      this.user,
      this.customRoles,
      spec.server.projectId ?? undefined,
    );

    const serverPage = await provider.fetchPage({
      pageSize: spec.pageSize,
      cursor,
      leadScope: {
        orderField: spec.orderField,
        orderDirection: spec.orderDirection,
        projectId: spec.server.projectId,
        assignedTo: spec.server.assignedTo,
        status: spec.server.status,
        statuses: spec.server.statuses,
        priority: spec.server.priority,
        leadSource: spec.server.leadSource,
        leadMedium: spec.server.leadMedium,
        omitLimit: true,
      },
    });

    const refinedItems = applyLeadClientFilters(serverPage.items, spec.client);

    const page = PaginationService.buildCursorPage(
      refinedItems,
      spec.pageSize,
      serverPage.nextCursor,
      cursor,
      serverPage.hasNextPage,
      !!cursor,
    );

    this.cache.set(projectSegment, cacheKey, page);
    this.navigation.registerPageNavigation(serverPage.nextCursor, cursor);

    if (spec.prefetchNext && page.hasNextPage && page.nextCursor) {
      void this.prefetchNextPage(spec, page.nextCursor);
    }

    return page;
  }

  /** Drop navigation stack; caller should also treat cursor as undefined (page 1). */
  resetToFirstPage(): void {
    this.navigation.resetNavigation();
  }

  /** Invalidate cached pages for a project segment (e.g. after bulk mutation). */
  invalidateProject(projectId?: string | null): void {
    this.cache.clearProject(projectId || "all");
  }

  clearAllCache(): void {
    this.cache.clearAll();
  }

  private async prefetchNextPage(
    spec: LeadQuerySpec,
    nextCursor: CursorToken,
  ): Promise<void> {
    const key = `${LeadQueryService.specKey(spec)}::${String(nextCursor)}`;
    if (this.prefetchInFlight.has(key)) return;
    this.prefetchInFlight.add(key);
    try {
      await this.fetchPage({ ...spec, prefetchNext: false }, nextCursor);
    } catch {
      // Prefetch is best-effort — UI will fetch on demand.
    } finally {
      this.prefetchInFlight.delete(key);
    }
  }
}
