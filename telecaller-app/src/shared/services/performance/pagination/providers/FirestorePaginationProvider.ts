// src/shared/services/performance/pagination/providers/FirestorePaginationProvider.ts
import {
  Query,
  getDocs,
  limit,
  query,
  DocumentSnapshot,
  getDoc,
  doc,
} from "firebase/firestore";
import { PaginationOptions, PaginationProvider } from "../contracts/PaginationProvider";
import { CursorPage } from "../contracts/CursorPage";
import { PaginationService } from "../PaginationService";
import { FirestoreCursorAdapter } from "../adapters/FirestoreCursorAdapter";
import { buildRoleScopedLeadsQuery, LeadScopeOptions } from "@/shared/contracts/queryScopes";
import { CustomRole, Lead, User } from "@/shared/types";
import { db } from "@/shared/services/firebase";

export class FirestorePaginationProvider implements PaginationProvider<Lead> {
  constructor(
    private readonly user: User | null,
    private readonly customRoles: CustomRole[],
    private readonly activeProjectId?: string
  ) {}

  /**
   * Fetches a page of leads with scoping, authorization and pagination offsets applied.
   */
  public async fetchPage(options: PaginationOptions): Promise<CursorPage<Lead>> {
    PaginationService.validatePageSize(options.pageSize);

    // Build the query scoping options
    const scopeOptions: LeadScopeOptions = {
      projectId: this.activeProjectId,
      pageSize: options.pageSize,
    };

    // Resolve user ID string safely
    const uid = this.user ? this.user.uid || this.user.id || "" : "";
    const roleCode = this.user ? this.user.role || "" : "";

    // Build scoped query
    let baseQuery = buildRoleScopedLeadsQuery(uid, roleCode, this.customRoles, scopeOptions);

    if (options.cursor) {
      const decoded = FirestoreCursorAdapter.decode(options.cursor);
      const snap = await getDocumentSnapshotById(decoded.path);
      if (snap.exists()) {
        const { startAfter } = await import("firebase/firestore");
        baseQuery = query(baseQuery, startAfter(snap));
      }
    }

    // Request pageSize + 1 to check if hasNextPage is true
    const fetchLimit = options.pageSize + 1;
    const paginatedQuery = query(baseQuery as Query<Lead>, limit(fetchLimit));

    // Execute lookup
    const querySnap = await getDocs(paginatedQuery);
    const docs = querySnap.docs;

    const hasNextPage = docs.length > options.pageSize;
    const pageDocs = hasNextPage ? docs.slice(0, options.pageSize) : docs;

    const items = pageDocs.map((d) => d.data());

    // Generate cursors using the adapter
    const lastDoc = pageDocs[pageDocs.length - 1];
    const nextCursor = hasNextPage && lastDoc
      ? FirestoreCursorAdapter.encode(lastDoc as DocumentSnapshot, "next")
      : undefined;

    // Previous cursor is determined by the service stack (stateless query ignores this)
    const hasPreviousPage = !!options.cursor;

    return PaginationService.buildCursorPage(
      items,
      options.pageSize,
      nextCursor,
      options.cursor, // Current cursor acts as back reference point
      hasNextPage,
      hasPreviousPage
    );
  }
}

export async function getDocumentSnapshotById(path: string): Promise<DocumentSnapshot> {
  const fullRef = doc(db, path);
  return await getDoc(fullRef);
}
