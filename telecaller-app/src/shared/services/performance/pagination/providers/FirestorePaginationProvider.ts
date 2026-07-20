// src/shared/services/performance/pagination/providers/FirestorePaginationProvider.ts
import {
  Query,
  getDocs,
  limit,
  query,
  where,
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
import { isManagerial } from "@/shared/utils/roleUtils";

export class FirestorePaginationProvider implements PaginationProvider<Lead> {
  constructor(
    private readonly user: User | null,
    private readonly customRoles: CustomRole[],
    private readonly activeProjectId?: string | null
  ) {}

  /**
   * Fetches a page of leads with scoping, authorization and pagination offsets applied.
   */
  public async fetchPage(options: PaginationOptions): Promise<CursorPage<Lead>> {
    PaginationService.validatePageSize(options.pageSize);

    const leadScope = options.leadScope;
    const projectId =
      leadScope?.projectId !== undefined
        ? leadScope.projectId
        : this.activeProjectId;

    const scopeOptions: LeadScopeOptions = {
      projectId,
      orderField: leadScope?.orderField ?? "updatedAt",
      orderDirection: leadScope?.orderDirection ?? "desc",
      omitLimit: leadScope?.omitLimit ?? true,
      pageSize: options.pageSize,
    };

    const uid = this.user ? this.user.uid || this.user.id || "" : "";
    const roleCode = this.user ? this.user.role || "" : "";

    let baseQuery = buildRoleScopedLeadsQuery(
      uid,
      roleCode,
      this.customRoles,
      scopeOptions,
    );

    // Index-safe extra equality: manager filtering by assignee.
    // Agents are already scoped to assignedTo == uid in buildAgentLeadsQuery.
    if (
      leadScope?.assignedTo &&
      isManagerial(roleCode, this.customRoles)
    ) {
      baseQuery = query(
        baseQuery as Query<Lead>,
        where("assignedTo", "==", leadScope.assignedTo),
      );
    }

    if (options.cursor) {
      const decoded = FirestoreCursorAdapter.decode(options.cursor);
      const snap = await getDocumentSnapshotById(decoded.path);
      if (snap.exists()) {
        const { startAfter } = await import("firebase/firestore");
        baseQuery = query(baseQuery, startAfter(snap));
      }
    }

    const fetchLimit = options.pageSize + 1;
    const paginatedQuery = query(baseQuery as Query<Lead>, limit(fetchLimit));

    const querySnap = await getDocs(paginatedQuery);
    const docs = querySnap.docs;

    const hasNextPage = docs.length > options.pageSize;
    const pageDocs = hasNextPage ? docs.slice(0, options.pageSize) : docs;

    const items = pageDocs.map((d) => {
      const data = d.data();
      return { ...data, id: d.id } as Lead;
    });

    const lastDoc = pageDocs[pageDocs.length - 1];
    const nextCursor =
      hasNextPage && lastDoc
        ? FirestoreCursorAdapter.encode(lastDoc as DocumentSnapshot, "next")
        : undefined;

    const hasPreviousPage = !!options.cursor;

    return PaginationService.buildCursorPage(
      items,
      options.pageSize,
      nextCursor,
      options.cursor,
      hasNextPage,
      hasPreviousPage
    );
  }
}

export async function getDocumentSnapshotById(path: string): Promise<DocumentSnapshot> {
  const fullRef = doc(db, path);
  return await getDoc(fullRef);
}
