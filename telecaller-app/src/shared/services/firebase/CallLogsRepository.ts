import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";
import { callLogsRef, leadsRef } from "./converters";
import type { CallLog, CallLogDocument, Lead } from "@/shared/types";
import {
  buildLeadCallSummaryPatch,
  mergeCallLogsDualRead,
  orderRecentCallLogsChronologically,
} from "./callLogSummaries";
import { isEmbeddedCallLogFallbackEnabled } from "./callLogIds";

export interface CreateCallLogOptions {
  /** Lead status to set (optional). */
  status?: string;
  /** Follow-up date to set; empty string clears. */
  followUpDate?: string | null;
  /** Agent user id for lastAgentId summary. */
  lastAgentId?: string | null;
  /** Extra lead fields merged into the same batch update. */
  extraLeadFields?: Record<string, unknown>;
}

/**
 * Phase C — top-level `callLogs` collection repository.
 * Writes never append to embedded `lead.callLogs[]`.
 */
export const CallLogsRepository = {
  /**
   * Create a call log doc and update lead denormalized summaries (+ optional status/follow-up)
   * in one batch. Returns the new callLog id.
   */
  async create(
    leadId: string,
    log: CallLog,
    options: CreateCallLogOptions = {},
  ): Promise<string> {
    const callLogRef = doc(callLogsRef);
    const id = callLogRef.id;
    const now = new Date().toISOString();
    const date = log.date || now;

    const callLogDoc: CallLogDocument = {
      ...log,
      id,
      leadId,
      date,
      createdAt: now,
    };

    const leadPatch: Record<string, unknown> = {
      ...buildLeadCallSummaryPatch({ ...log, date }, { lastAgentId: options.lastAgentId }),
      callCount: increment(1),
      ...(options.extraLeadFields || {}),
    };
    if (options.status !== undefined && options.status !== null) {
      leadPatch.status = options.status;
    }
    if (options.followUpDate !== undefined && options.followUpDate !== null) {
      leadPatch.followUpDate = options.followUpDate;
    }

    const batch = writeBatch(db);
    batch.set(callLogRef, callLogDoc);
    batch.update(doc(leadsRef, leadId), leadPatch);
    await batch.commit();
    return id;
  },

  async getById(id: string): Promise<CallLogDocument | null> {
    const snap = await getDoc(doc(callLogsRef, id));
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as CallLogDocument;
  },

  /**
   * List the most recent call logs for a lead (default 200), returned in ascending
   * chronological order for UI timelines and dual-read merge compatibility.
   */
  async listByLeadId(
    leadId: string,
    options?: { pageSize?: number },
  ): Promise<CallLogDocument[]> {
    const pageSize = options?.pageSize ?? 200;
    const q = query(
      callLogsRef,
      where("leadId", "==", leadId),
      orderBy("date", "desc"),
      limit(pageSize),
    );
    const snap = await getDocs(q);
    const newestFirst = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as CallLogDocument,
    );
    return orderRecentCallLogsChronologically(newestFirst);
  },

  /**
   * Dual-read: collection first, optionally merge embedded `lead.callLogs`.
   * Controlled by `VITE_CALL_LOGS_EMBEDDED_FALLBACK` (default true).
   */
  async listByLeadIdWithFallback(
    lead: Pick<Lead, "id" | "callLogs">,
    options?: { pageSize?: number; includeEmbedded?: boolean },
  ): Promise<CallLogDocument[]> {
    const collectionLogs = await this.listByLeadId(lead.id, {
      pageSize: options?.pageSize,
    });
    const includeEmbedded =
      options?.includeEmbedded ?? isEmbeddedCallLogFallbackEnabled();
    return mergeCallLogsDualRead(collectionLogs, lead.callLogs, {
      includeEmbedded,
    });
  },

  async update(id: string, updates: Partial<CallLog>): Promise<void> {
    await updateDoc(doc(callLogsRef, id), {
      ...updates,
    } as Record<string, unknown>);
  },

  /**
   * Rate a call log by lead + index into the dual-read ordered list.
   * Prefer `update` with an explicit callLogId when available.
   */
  async rateByLeadIndex(
    lead: Pick<Lead, "id" | "callLogs">,
    logIndex: number,
    qualityScore: number | undefined,
    adminFeedback: string,
  ): Promise<void> {
    const logs = await this.listByLeadIdWithFallback(lead);
    const target = logs[logIndex];
    if (!target?.id || String(target.id).startsWith("embedded:")) {
      // Embedded-only entry not yet backfilled — cannot rate top-level doc.
      return;
    }
    await this.update(target.id, {
      qualityScore,
      feedback: adminFeedback,
      adminFeedback,
    });
  },

  /** Re-point all call logs from one lead to another (merge support). */
  async reassignLeadId(fromLeadId: string, toLeadId: string): Promise<number> {
    const logs = await this.listByLeadId(fromLeadId, { pageSize: 500 });
    if (logs.length === 0) return 0;
    const batch = writeBatch(db);
    let count = 0;
    for (const log of logs) {
      batch.update(doc(callLogsRef, log.id), { leadId: toLeadId });
      count += 1;
      if (count >= 450) break; // stay under batch limit; rare for merge
    }
    await batch.commit();
    return count;
  },

  /** Create with an explicit document id (backfill / idempotent imports). */
  async createWithId(
    id: string,
    leadId: string,
    log: CallLog,
    meta?: Partial<CallLogDocument>,
  ): Promise<void> {
    const now = new Date().toISOString();
    const callLogDoc: CallLogDocument = {
      ...log,
      ...meta,
      id,
      leadId,
      date: log.date || now,
      createdAt: meta?.createdAt || now,
    };
    await setDoc(doc(callLogsRef, id), callLogDoc, { merge: false });
  },
};
