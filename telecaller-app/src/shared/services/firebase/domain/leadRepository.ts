import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  runTransaction,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/shared/services/firebase";
import { leadsRef, archivedLeadsRef } from "../converters";
import { Lead, CallLog } from "@/shared/types";
import { CallLogsRepository } from "../CallLogsRepository";
import { fetchLeadsByPhone } from "@/shared/services/leads/leadsSec1Api";

/**
 * Identity-based lead mutations (Production Hardening Phase F).
 * List reads → LeadQueryService. Never scan a global in-memory leads[].
 */
export const LeadRepository = {
  async add(lead: Lead): Promise<void> {
    await setDoc(doc(leadsRef, lead.id), lead);
  },
  async update(id: string, updates: Partial<Lead>): Promise<void> {
    await updateDoc(doc(leadsRef, id), updates);
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(leadsRef, id));
  },
  /** Point read for detail pages — not a list query. */
  async getById(id: string): Promise<Lead | null> {
    const snap = await getDoc(doc(leadsRef, id));
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as Lead;
  },
  /**
   * Indexed phone lookup for dedup via SEC-1 callable (no cross-owner client scan).
   * Phones must already be normalized the same way create/import stores them.
   */
  async findByPhone(phone: string, max = 10): Promise<Lead[]> {
    if (!phone) return [];
    return fetchLeadsByPhone(phone, max);
  },
  async assign(
    id: string,
    assignedTo: string,
    assignedToName: string,
    assignedToUid = "",
  ): Promise<void> {
    await updateDoc(doc(leadsRef, id), {
      assignedTo,
      assignedToName,
      assignedToUid,
      updatedAt: new Date().toISOString(),
    });
  },
  async updateStatus(id: string, status: string, extra?: Partial<Lead>): Promise<void> {
    await updateDoc(doc(leadsRef, id), {
      ...extra,
      status,
      updatedAt: new Date().toISOString(),
    });
  },
  /**
   * Archive by lead ids — loads each doc by id (no global array scan).
   */
  async archiveLeadsByIds(leadIds: string[], archivedBy: string): Promise<number> {
    if (leadIds.length === 0) return 0;
    const now = new Date().toISOString();
    const leads = await Promise.all(leadIds.map((id) => this.getById(id)));

    const batch = writeBatch(db);
    let archived = 0;
    for (let i = 0; i < leadIds.length; i++) {
      const lead = leads[i];
      if (!lead) continue;
      const leadId = leadIds[i];
      const archivedLead = {
        ...lead,
        archivedAt: now,
        archivedBy,
        updatedAt: now,
      };
      batch.set(doc(archivedLeadsRef, leadId), archivedLead);
      batch.delete(doc(leadsRef, leadId));
      archived += 1;
    }
    if (archived > 0) await batch.commit();
    return archived;
  },
  /**
   * Restore archived leads by id — loads from archived collection.
   */
  async restoreLeadsByIds(leadIds: string[]): Promise<number> {
    if (leadIds.length === 0) return 0;
    const snaps = await Promise.all(leadIds.map((id) => getDoc(doc(archivedLeadsRef, id))));

    const batch = writeBatch(db);
    let restored = 0;
    for (let i = 0; i < leadIds.length; i++) {
      const snap = snaps[i];
      if (!snap.exists()) continue;
      const id = leadIds[i];
      const data = { ...(snap.data() as Lead & { archivedAt?: string; archivedBy?: string }) };
      delete (data as { archivedAt?: string }).archivedAt;
      delete (data as { archivedBy?: string }).archivedBy;
      batch.set(doc(leadsRef, id), { ...data, id, updatedAt: new Date().toISOString() });
      batch.delete(doc(archivedLeadsRef, id));
      restored += 1;
    }
    if (restored > 0) await batch.commit();
    return restored;
  },
  /**
   * Merge source → target by id inside a transaction (load both by id).
   * Call-log reassignment happens outside the transaction (top-level collection).
   */
  async mergeLeads(
    targetId: string,
    sourceId: string,
    customSelections: Partial<Lead> | null = null,
  ): Promise<{ target: Lead; source: Lead } | null> {
    if (!targetId || !sourceId || targetId === sourceId) return null;

    await CallLogsRepository.reassignLeadId(sourceId, targetId);

    const result = await runTransaction(db, async (tx) => {
      const targetRef = doc(leadsRef, targetId);
      const sourceRef = doc(leadsRef, sourceId);
      const [targetSnap, sourceSnap] = await Promise.all([
        tx.get(targetRef),
        tx.get(sourceRef),
      ]);
      if (!targetSnap.exists() || !sourceSnap.exists()) return null;

      const targetLead = { ...targetSnap.data(), id: targetSnap.id } as Lead;
      const sourceLead = { ...sourceSnap.data(), id: sourceSnap.id } as Lead;

      let updates: Partial<Lead> = {
        callCount: (targetLead.callCount || 0) + (sourceLead.callCount || 0),
        hasAgentCall: !!(targetLead.hasAgentCall || sourceLead.hasAgentCall),
        updatedAt: new Date().toISOString(),
      };

      if (customSelections) {
        const selectedNotes = customSelections.notes || "";
        let mergedNotes = selectedNotes;
        if (
          sourceLead.notes &&
          sourceLead.notes !== targetLead.notes &&
          !selectedNotes.includes(sourceLead.notes)
        ) {
          mergedNotes = `${selectedNotes}\n[Merged Notes from ${sourceLead.name}]: ${sourceLead.notes}`;
        }
        updates = { ...updates, ...customSelections, notes: mergedNotes };
      } else {
        updates.notes = `${targetLead.notes || ""}\n[Merged Notes from ${sourceLead.name}]: ${sourceLead.notes || ""}`;
        if (!targetLead.email && sourceLead.email) updates.email = sourceLead.email;
        if (!targetLead.source && sourceLead.source) updates.source = sourceLead.source;
      }

      tx.update(targetRef, updates);
      tx.delete(sourceRef);
      return {
        target: { ...targetLead, ...updates },
        source: sourceLead,
      };
    });

    return result;
  },
  async listIdsByAssignee(assigneeId: string, pageSize = 50): Promise<string[]> {
    const ids: string[] = [];
    let last: QueryDocumentSnapshot | undefined;
    const MAX_PAGES = 40;
    for (let page = 0; page < MAX_PAGES; page++) {
      const constraints = [
        where("assignedTo", "==", assigneeId),
        orderBy("updatedAt", "desc"),
        limit(pageSize),
      ];
      const q = last
        ? query(leadsRef, ...constraints, startAfter(last))
        : query(leadsRef, ...constraints);
      const snap = await getDocs(q);
      if (snap.empty) break;
      snap.docs.forEach((d) => ids.push(d.id));
      last = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < pageSize) break;
    }
    return ids;
  },
  async logCall(
    leadId: string,
    log: CallLog,
    status: string,
    followUpDate: string,
    options?: { lastAgentId?: string | null },
  ): Promise<string> {
    return CallLogsRepository.create(leadId, log, {
      status,
      followUpDate:
        followUpDate !== undefined && followUpDate !== null ? followUpDate : undefined,
      lastAgentId: options?.lastAgentId,
    });
  },
  async rateCallLog(leadId: string, updatedLogs: CallLog[]): Promise<void> {
    const withScore = [...updatedLogs].reverse().find((l) => l.qualityScore != null);
    if (!withScore) return;
    const logs = await CallLogsRepository.listByLeadId(leadId);
    const match = logs.find(
      (l) =>
        l.date === withScore.date &&
        l.note === withScore.note &&
        l.agent === withScore.agent,
    );
    if (!match) return;
    await CallLogsRepository.update(match.id, {
      qualityScore: withScore.qualityScore,
      feedback: withScore.feedback || withScore.adminFeedback || "",
      adminFeedback: withScore.adminFeedback || withScore.feedback || "",
    });
  },
  async bulkUpdate(ids: string[], updates: Partial<Lead>): Promise<void> {
    const batch = writeBatch(db);
    for (const id of ids) {
      batch.update(doc(leadsRef, id), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    }
    await batch.commit();
  },
  async archiveLeads(archivedList: { leadId: string; archivedLead: Lead & { archivedAt: string; archivedBy: string } }[]): Promise<void> {
    const batch = writeBatch(db);
    for (const { leadId, archivedLead } of archivedList) {
      batch.set(doc(archivedLeadsRef, leadId), archivedLead);
      batch.delete(doc(leadsRef, leadId));
    }
    await batch.commit();
  },
  async restoreLeads(restoredList: { id: string; lead: Lead }[]): Promise<void> {
    const batch = writeBatch(db);
    for (const { id, lead } of restoredList) {
      batch.set(doc(leadsRef, id), lead);
      batch.delete(doc(archivedLeadsRef, id));
    }
    await batch.commit();
  },
  async deletePermanently(ids: string[]): Promise<void> {
    const batch = writeBatch(db);
    for (const id of ids) {
      batch.delete(doc(archivedLeadsRef, id));
    }
    await batch.commit();
  },
  async bulkAddLeads(newLeads: Lead[], updatedDuplicates: Lead[]): Promise<void> {
    const allLeads = [...newLeads, ...updatedDuplicates];
    if (allLeads.length === 0) return;
    const CHUNK_SIZE = 400;
    for (let i = 0; i < allLeads.length; i += CHUNK_SIZE) {
      const chunk = allLeads.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const lead of chunk) {
        batch.set(doc(leadsRef, lead.id), lead);
      }
      await batch.commit();
    }
  },
};

export const LeadsRepository = LeadRepository;
