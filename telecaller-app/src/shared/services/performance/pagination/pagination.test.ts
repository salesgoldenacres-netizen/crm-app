import { describe, it, expect, beforeEach } from "vitest";
import { CursorToken } from "./contracts/CursorToken";
import { PaginationService } from "./PaginationService";
import { FirestoreCursorAdapter } from "./adapters/FirestoreCursorAdapter";
import {
  PaginationError,
  InvalidCursorError,
  PageSizeExceededError,
} from "./contracts/PaginationErrors";
import { buildRoleScopedLeadsQuery, LeadScopeOptions } from "@/shared/contracts/queryScopes";
import { DocumentSnapshot, DocumentReference } from "firebase/firestore";

// ─── Branded CursorToken & Adapter Tests ─────────────────────────────────────

describe("FirestoreCursorAdapter & CursorToken", () => {
  it("encodes a snapshot into an opaque branded CursorToken", () => {
    const mockRef = { path: "leads/123" } as DocumentReference;
    const mockSnap = { id: "123", ref: mockRef } as DocumentSnapshot;

    const token = FirestoreCursorAdapter.encode(mockSnap, "next");
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    // Verify base64 signature
    expect(() => atob(token)).not.toThrow();
  });

  it("decodes a valid CursorToken correctly", () => {
    const mockRef = { path: "leads/123" } as DocumentReference;
    const mockSnap = { id: "123", ref: mockRef } as DocumentSnapshot;

    const token = FirestoreCursorAdapter.encode(mockSnap, "next");
    const decoded = FirestoreCursorAdapter.decode(token);

    expect(decoded.id).toBe("123");
    expect(decoded.path).toBe("leads/123");
    expect(decoded.direction).toBe("next");
  });

  it("rejects invalid cursor formats or corrupted values", () => {
    const badToken = "not-a-valid-base-64-payload" as CursorToken;
    expect(() => FirestoreCursorAdapter.decode(badToken)).toThrow(InvalidCursorError);
  });

  it("rejects incompatible cursor versions", () => {
    // Manually build payload with incorrect version (ver = 99)
    const badPayload = {
      id: "abc",
      path: "leads/abc",
      ver: 99,
      dir: "next",
    };
    const badToken = btoa(JSON.stringify(badPayload)) as CursorToken;
    expect(() => FirestoreCursorAdapter.decode(badToken)).toThrow(InvalidCursorError);
  });

  it("rejects malformed payload values missing id or path", () => {
    const badPayload = {
      ver: 1,
      dir: "next",
    };
    const badToken = btoa(JSON.stringify(badPayload)) as CursorToken;
    expect(() => FirestoreCursorAdapter.decode(badToken)).toThrow(InvalidCursorError);
  });
});

// ─── Immutable CursorPage Tests ──────────────────────────────────────────────

describe("CursorPage Contract", () => {
  it("builds an immutable read-only page representation", () => {
    const items = [{ name: "Lead 1" }, { name: "Lead 2" }];
    const nextCursor = "next-token" as CursorToken;
    
    const page = PaginationService.buildCursorPage(
      items,
      2,
      nextCursor,
      undefined,
      true,
      false
    );

    expect(page.items).toEqual(items);
    expect(page.pageSize).toBe(2);
    expect(page.hasNextPage).toBe(true);
    expect(page.hasPreviousPage).toBe(false);

    // Verify immutability
    expect(Object.isFrozen(page)).toBe(true);
    expect(Object.isFrozen(page.items)).toBe(true);
  });

  it("handles empty result sets with correct page flags", () => {
    const page = PaginationService.buildCursorPage([], 25, undefined, undefined, false, false);
    expect(page.items).toHaveLength(0);
    expect(page.hasNextPage).toBe(false);
    expect(page.hasPreviousPage).toBe(false);
  });
});

// ─── PaginationService Tests ──────────────────────────────────────────────────

describe("PaginationService & Navigation stack", () => {
  let service: PaginationService;
  beforeEach(() => {
    service = new PaginationService();
  });

  it("enforces page size limits correctly", () => {
    expect(() => PaginationService.validatePageSize(51)).toThrow(PageSizeExceededError);
    expect(() => PaginationService.validatePageSize(0)).toThrow(PaginationError);
    expect(() => PaginationService.validatePageSize(1)).not.toThrow();
    expect(() => PaginationService.validatePageSize(50)).not.toThrow();
  });

  it("stores navigation history stack for back-traversal", () => {
    const t1 = "token-page-1" as CursorToken;
    const t2 = "token-page-2" as CursorToken;

    // Navigate to page 2 (with cursor for page 1)
    service.registerPageNavigation(t2, t1);
    expect(service.getPreviousCursor()).toBe(t1);

    // Navigate to page 3 (with cursor for page 2)
    service.registerPageNavigation(undefined, t2);
    expect(service.getPreviousCursor()).toBe(t2);

    // Pop back to page 2
    const popped = service.popPreviousCursor();
    expect(popped).toBe(t2);

    // Pop back to page 1
    const popped2 = service.popPreviousCursor();
    expect(popped2).toBe(t1);
  });

  it("clears stack on reset", () => {
    service.registerPageNavigation("t2" as CursorToken, "t1" as CursorToken);
    service.resetNavigation();
    expect(service.getPreviousCursor()).toBeUndefined();
  });
});

// ─── Query Scopes Integration Tests ──────────────────────────────────────────

describe("Query Scopes & Prohibitions", () => {
  it("rejects offset parameter validation check", () => {
    const options = {
      offset: 10,
    } as unknown as LeadScopeOptions;

    expect(() => buildRoleScopedLeadsQuery("user123", "agent", [], options)).toThrow();
  });

  it("enforces project filters first before pagination queries", () => {
    const options: LeadScopeOptions = {
      projectId: "project-123",
      pageSize: 25,
      omitLimit: true,
    };
    const q = buildRoleScopedLeadsQuery("user123", "agent", [], options);
    expect(q).toBeDefined();
  });

  it("requires explicit limit or omitLimit for managerial realtime queries", () => {
    expect(() =>
      buildRoleScopedLeadsQuery("user123", "admin", [], {
        projectId: "p1",
      }),
    ).toThrow(/explicit limit|omitLimit/);

    expect(() =>
      buildRoleScopedLeadsQuery("user123", "admin", [], {
        omitLimit: true,
      }),
    ).not.toThrow();
  });
});
