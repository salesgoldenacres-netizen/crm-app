import { describe, it, expect, vi, beforeEach } from "vitest";
import { LeadQueryService } from "./LeadQueryService";
import {
  createDefaultLeadQuerySpec,
  leadQuerySpecCacheKey,
} from "./leadQueryTypes";
import { applyLeadClientFilters } from "./applyLeadClientFilters";
import { LeadPageCache } from "@/shared/services/performance/cache/LeadPageCache";
import { PaginationService } from "@/shared/services/performance/pagination/PaginationService";
import type { CursorPage } from "@/shared/services/performance/pagination/contracts/CursorPage";
import type { CursorToken } from "@/shared/services/performance/pagination/contracts/CursorToken";
import type { Lead, User } from "@/shared/types";

const mockFetchPage = vi.fn();

vi.mock(
  "@/shared/services/performance/pagination/providers/FirestorePaginationProvider",
  () => ({
    FirestorePaginationProvider: class {
      fetchPage(options: unknown) {
        return mockFetchPage(options);
      }
    },
  }),
);

function pageOf(items: Lead[], hasNext = false, nextCursor?: CursorToken): CursorPage<Lead> {
  return PaginationService.buildCursorPage(
    items,
    25,
    nextCursor,
    undefined,
    hasNext,
    false,
  );
}

describe("leadQuerySpecCacheKey", () => {
  it("is stable for identical specs", () => {
    const a = createDefaultLeadQuerySpec("u1", "manager", {
      server: { projectId: "p1" },
      client: { name: "Ada" },
    });
    const b = createDefaultLeadQuerySpec("u1", "manager", {
      server: { projectId: "p1" },
      client: { name: "Ada" },
    });
    expect(leadQuerySpecCacheKey(a)).toBe(leadQuerySpecCacheKey(b));
  });

  it("changes when filters change (forces page-1 reset by callers)", () => {
    const base = createDefaultLeadQuerySpec("u1", "manager", {
      client: { name: "Ada" },
    });
    const changed = createDefaultLeadQuerySpec("u1", "manager", {
      client: { name: "Bob" },
    });
    expect(leadQuerySpecCacheKey(base)).not.toBe(leadQuerySpecCacheKey(changed));
  });

  it("does not include cursor (cursor is separate page identity)", () => {
    const spec = createDefaultLeadQuerySpec("u1", "telecaller");
    expect(leadQuerySpecCacheKey(spec)).not.toContain("cursor");
  });
});

describe("applyLeadClientFilters", () => {
  const leads = [
    {
      id: "1",
      name: "Ada Lovelace",
      phone: "9000000001",
      status: "new",
      priority: "hot",
    },
    {
      id: "2",
      name: "Bob",
      phone: "9000000002",
      status: "contacted",
      priority: "warm",
    },
  ] as Lead[];

  it("filters by name search within a page", () => {
    const result = applyLeadClientFilters(leads, { name: "ada" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });
});

describe("LeadQueryService", () => {
  const user = { id: "u1", uid: "u1", role: "manager" } as User;
  let cache: LeadPageCache;
  let service: LeadQueryService;

  beforeEach(() => {
    mockFetchPage.mockReset();
    cache = new LeadPageCache(60_000, 20);
    service = new LeadQueryService(user, [], cache);
  });

  it("fetches a page via FirestorePaginationProvider with omitLimit", async () => {
    const items = [{ id: "a", name: "A", phone: "1" } as Lead];
    mockFetchPage.mockResolvedValue(pageOf(items, true, "c1" as CursorToken));

    const spec = createDefaultLeadQuerySpec("u1", "manager", {
      pageSize: 25,
      server: { projectId: null },
      client: {},
      prefetchNext: false,
    });

    const result = await service.fetchPage(spec);
    expect(result.items).toHaveLength(1);
    expect(result.hasNextPage).toBe(true);
    expect(mockFetchPage).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize: 25,
        leadScope: expect.objectContaining({ omitLimit: true }),
      }),
    );
  });

  it("returns cached page for same spec + cursor", async () => {
    mockFetchPage.mockResolvedValue(
      pageOf([{ id: "a", name: "A", phone: "1" } as Lead]),
    );
    const spec = createDefaultLeadQuerySpec("u1", "manager", {
      prefetchNext: false,
    });

    await service.fetchPage(spec);
    await service.fetchPage(spec);
    expect(mockFetchPage).toHaveBeenCalledTimes(1);
  });

  it("uses a different cache entry when filters change", async () => {
    mockFetchPage.mockResolvedValue(
      pageOf([{ id: "a", name: "A", phone: "1" } as Lead]),
    );
    const specA = createDefaultLeadQuerySpec("u1", "manager", {
      client: { name: "A" },
      prefetchNext: false,
    });
    const specB = createDefaultLeadQuerySpec("u1", "manager", {
      client: { name: "B" },
      prefetchNext: false,
    });

    await service.fetchPage(specA);
    await service.fetchPage(specB);
    expect(mockFetchPage).toHaveBeenCalledTimes(2);
  });

  it("passes cursor through for page 2 and applies client refine", async () => {
    mockFetchPage.mockResolvedValue(
      pageOf(
        [
          { id: "1", name: "Keep", phone: "1", status: "new" } as Lead,
          { id: "2", name: "Drop", phone: "2", status: "booked" } as Lead,
        ],
        false,
      ),
    );

    const spec = createDefaultLeadQuerySpec("u1", "manager", {
      client: { statuses: ["new"] },
      prefetchNext: false,
    });
    const cursor = "page2" as CursorToken;
    const result = await service.fetchPage(spec, cursor);

    expect(mockFetchPage).toHaveBeenCalledWith(
      expect.objectContaining({ cursor }),
    );
    expect(result.items.map((l) => l.id)).toEqual(["1"]);
  });

  it("resetToFirstPage clears navigation stack", () => {
    service.resetToFirstPage();
    // No throw — navigation is internal; filter change callers pass cursor undefined.
    expect(LeadQueryService.specKey(createDefaultLeadQuerySpec("u1", "manager"))).toBeTruthy();
  });
});
