import { logAnalyticsEvent } from "@/shared/utils/analytics";
import { logger } from "@/shared/utils/logger";
import { Lead, CallLog } from "@/shared/types";
import {
  normalizePhone,
  cleanLeadName,
  cleanEmailAddress,
} from "@/shared/utils/formatUtils";
import { LeadRepository } from "@/shared/services/firebase/repositories";
import { CallLogsRepository } from "@/shared/services/firebase/CallLogsRepository";
import {
  publishCallCompleted,
  publishFollowUpDiff,
  publishLeadAssigned,
  publishLeadCreated,
  publishLeadMerged,
  publishLeadReassigned,
  publishLeadStatusChanged,
  publishNoteAdded,
} from "@/shared/contracts";

/** Explicit timeline intent for logCall — prefer over note-text heuristics. */
export type LogCallTimelineActivity = "call" | "note" | "none";

export interface LogCallPayload {
  note: string;
  status: string;
  followUpDate?: string;
  agent?: string;
  duration?: number;
  callType?: "incoming" | "outgoing";
  picked?: boolean;
  /**
   * Wave 6 Phase 2B: typed activity for timeline.
   * - `call` → publishCallCompleted
   * - `note` → publishNoteAdded
   * - `none` → no primary activity event (status/follow-up diffs still emit)
   * When omitted, falls back to heuristics (legacy callers).
   */
  timelineActivity?: LogCallTimelineActivity;
}

/**
 * Lead mutation facade. List reads → LeadQueryService / useLeadQuery.
 * Agent dialer convenience → useAgentOpenLeads (bounded, not list SoT).
 * Productivity counters → Cloud Function only (no client increments).
 */
export function useLeadsStore() {
  const addLead = async (
    leadData: Partial<Lead> & { name: string; phone: string },
  ): Promise<Lead | { isDuplicate: boolean }> => {
    const cleanName = cleanLeadName(leadData.name);
    const cleanEmail = cleanEmailAddress(leadData.email || "");
    const cleanPhone = normalizePhone(leadData.phone);

    const duplicates = await LeadRepository.findByPhone(cleanPhone, 1);
    const duplicate = duplicates[0];
    if (duplicate) {
      logger.info(
        "LeadsStore",
        `Duplicate detected for phone: ${cleanPhone}. Merging into existing lead ID: ${duplicate.id}`,
      );

      const updatedLead: Lead = {
        ...duplicate,
        name:
          duplicate.name === "Unknown Customer" ||
          duplicate.name === "Imported Customer" ||
          duplicate.name === "Generic Webhook Lead"
            ? cleanName
            : duplicate.name,
        email: duplicate.email || cleanEmail,
        updatedAt: new Date().toISOString(),
      };

      await LeadRepository.update(duplicate.id, {
        name: updatedLead.name,
        email: updatedLead.email,
        updatedAt: updatedLead.updatedAt,
      });
      await CallLogsRepository.create(duplicate.id, {
        date: new Date().toISOString(),
        note: `Duplicate lead attempt merged. Source: Manual/Bulk Upload. Notes: ${leadData.notes || "No description provided."}`,
        status: duplicate.status || "new",
        agent: "system",
      });
      return { ...updatedLead, isDuplicate: true };
    }

    const newId = Date.now().toString() + "-" + Math.floor(Math.random() * 1000);
    const finalFollowUp = leadData.followUpDate || "";
    const finalCreatedTime = leadData.createdAt || new Date().toISOString();

    const newLead: Lead = {
      ...leadData,
      id: newId,
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      status: leadData.status || "new",
      notes: leadData.notes || "",
      createdAt: finalCreatedTime,
      updatedAt: new Date().toISOString(),
      source: leadData.source || "Direct Call",
      followUpDate: finalFollowUp,
      followUpOn: finalFollowUp,
      callCount: 0,
      hasAgentCall: false,
    };
    delete (newLead as Partial<Lead>).callLogs;
    await LeadRepository.add(newLead);
    await CallLogsRepository.create(newId, {
      date: new Date().toISOString(),
      note: "Lead created.",
      status: leadData.status || "new",
      agent: "system",
    });
    logAnalyticsEvent("lead_created", {
      id: newId,
      projectId: leadData.source || "unassigned",
    });
    void publishLeadCreated({
      leadId: newId,
      name: cleanName,
      sourceId: newId,
      actorName: "system",
    });
    return newLead;
  };

  const updateLead = async (
    id: string,
    updatedFields: Partial<Lead>,
    options?: { suppressTimeline?: boolean },
  ): Promise<void> => {
    const prev = await LeadRepository.getById(id);
    await LeadRepository.update(id, updatedFields);

    if (!prev || options?.suppressTimeline) return;

    if (
      updatedFields.status !== undefined &&
      updatedFields.status !== prev.status
    ) {
      void publishLeadStatusChanged({
        leadId: id,
        from: prev.status,
        to: updatedFields.status,
        sourceId: id,
        force: true,
        reason: "pipeline",
      });
    }

    if (
      updatedFields.assignedTo !== undefined &&
      updatedFields.assignedTo !== prev.assignedTo
    ) {
      const wasAssigned = !!(prev.assignedTo && prev.assignedTo !== "");
      if (wasAssigned) {
        void publishLeadReassigned({
          leadId: id,
          sourceId: id,
          fromName: prev.assignedToName || prev.assignedTo || null,
          toName: updatedFields.assignedToName || updatedFields.assignedTo || null,
          toId: updatedFields.assignedTo || null,
        });
      } else {
        void publishLeadAssigned({
          leadId: id,
          sourceId: id,
          assigneeName: updatedFields.assignedToName || updatedFields.assignedTo || null,
          assigneeId: updatedFields.assignedTo || null,
        });
      }
    }

    const nextFollowUp =
      updatedFields.followUpDate ?? updatedFields.followUpOn;
    const prevFollowUp = prev.followUpDate || prev.followUpOn || "";
    if (nextFollowUp !== undefined) {
      void publishFollowUpDiff({
        leadId: id,
        sourceId: id,
        previousFollowUpDate: prevFollowUp,
        nextFollowUpDate: nextFollowUp,
      });
    }

    if (
      updatedFields.notes !== undefined &&
      updatedFields.notes !== prev.notes &&
      String(updatedFields.notes || "").trim()
    ) {
      void publishNoteAdded({
        leadId: id,
        sourceId: id,
        note: String(updatedFields.notes),
      });
    }
  };

  const deleteLead = async (id: string): Promise<void> => {
    await LeadRepository.delete(id);
  };

  const logCall = async (
    leadId: string,
    {
      note,
      status,
      followUpDate,
      agent,
      duration,
      callType,
      picked,
      timelineActivity,
    }: LogCallPayload,
  ): Promise<void> => {
    // Identity load for timeline diffs — productivity is CF-only (no client increment).
    const prevLead = await LeadRepository.getById(leadId);
    const prevLeadStatus = prevLead?.status || "new";
    const agentUserId = prevLead?.assignedTo || null;

    const newLog: CallLog = {
      date: new Date().toISOString(),
      note,
      status,
      agent: agent || "telecaller",
    };
    if (duration !== undefined) newLog.duration = duration;
    if (callType) newLog.callType = callType;
    if (picked !== undefined) newLog.picked = picked;

    const callSourceId = `call:${leadId}:${newLog.date}`;

    await LeadRepository.logCall(leadId, newLog, status, followUpDate || "", {
      lastAgentId: agentUserId,
    });

    logAnalyticsEvent("call_logged", {
      leadId,
      status,
      agent: agent || "telecaller",
    });

    let activity: LogCallTimelineActivity;
    if (timelineActivity) {
      activity = timelineActivity;
    } else {
      const noteLower = String(note || "").toLowerCase();
      const isCallLog =
        duration !== undefined ||
        noteLower.includes("call log") ||
        noteLower.includes("disposition:") ||
        noteLower.includes("duration:");
      const isLegacyTaggedNonCall =
        noteLower.includes("[whatsapp") ||
        noteLower.includes("[discount") ||
        noteLower.includes("[campaign") ||
        noteLower.includes("[site visit") ||
        noteLower.includes("[pipeline") ||
        noteLower.includes("[admin stage");
      if (isCallLog) activity = "call";
      else if (
        !isLegacyTaggedNonCall &&
        String(note || "").trim().length > 0
      ) {
        activity = "note";
      } else {
        activity = "none";
      }
    }

    if (activity === "call") {
      void publishCallCompleted({
        leadId,
        sourceId: callSourceId,
        idempotencyKey: `call_completed_${leadId}_${newLog.date}`,
        summary: String(note || "Call completed").slice(0, 120),
        actorName: agent || "telecaller",
        status,
        duration: duration ?? null,
        callType: callType || null,
        timestamp: newLog.date,
      });
    } else if (activity === "note") {
      void publishNoteAdded({
        leadId,
        sourceId: callSourceId,
        note: String(note),
        actorName: agent || "telecaller",
        timestamp: newLog.date,
      });
    }

    if (status && status !== prevLeadStatus) {
      void publishLeadStatusChanged({
        leadId,
        from: prevLeadStatus,
        to: status,
        sourceId: leadId,
        actorName: agent || "telecaller",
        force: true,
        reason: "call",
        idempotencyKey: `status_${leadId}_${prevLeadStatus}_${status}_${newLog.date}`,
      });
    }

    const prevFollowUp = prevLead?.followUpDate || prevLead?.followUpOn || "";
    if (followUpDate !== undefined) {
      void publishFollowUpDiff({
        leadId,
        sourceId: leadId,
        previousFollowUpDate: prevFollowUp,
        nextFollowUpDate: followUpDate || "",
        actorName: agent || "telecaller",
      });
    }

    // Intentionally no client updateAgentProductivity — CF + productivityEvents is sole writer.
  };

  const bulkUpdateLeads = async (
    leadIds: string[],
    updatedFields: Partial<Lead>,
  ): Promise<void> => {
    await LeadRepository.bulkUpdate(leadIds, updatedFields);
  };

  const mergeLeads = async (
    targetId: string,
    sourceId: string,
    customSelections: Partial<Lead> | null = null,
  ): Promise<void> => {
    const result = await LeadRepository.mergeLeads(
      targetId,
      sourceId,
      customSelections,
    );
    if (!result) return;

    void publishLeadMerged({
      leadId: targetId,
      sourceLeadId: sourceId,
      sourceLeadName: result.source.name,
      sourceId,
      idempotencyKey: `lead_merged_${targetId}_${sourceId}`,
    });
  };

  const rateCallLog = async (
    leadId: string,
    logIndex: number,
    qualityScore: string | number,
    adminFeedback: string,
  ): Promise<void> => {
    const lead = (await LeadRepository.getById(leadId)) || {
      id: leadId,
      callLogs: [],
    };
    await CallLogsRepository.rateByLeadIndex(
      lead,
      logIndex,
      parseInt(qualityScore as string, 10) || undefined,
      adminFeedback || "",
    );
  };

  const archiveLeads = async (
    leadIds: string[],
    username = "admin",
  ): Promise<void> => {
    await LeadRepository.archiveLeadsByIds(leadIds, username);
  };

  const bulkAddLeads = async (
    leadsData: Array<Partial<Lead> & { name: string; phone: string }>,
  ): Promise<{ successCount: number; duplicateCount: number }> => {
    let successCount = 0;
    let duplicateCount = 0;
    const newlyCreatedLeads: Lead[] = [];
    const newLeadsToDb: Lead[] = [];
    const updatedDuplicatesToDb: Lead[] = [];
    const phoneToLead = new Map<string, Lead>();

    for (const leadData of leadsData) {
      let cleanPhone: string;
      try {
        cleanPhone = normalizePhone(leadData.phone);
      } catch {
        continue;
      }

      const cleanName = cleanLeadName(leadData.name);
      const cleanEmail = cleanEmailAddress(leadData.email || "");

      let duplicate =
        phoneToLead.get(cleanPhone) ||
        newlyCreatedLeads.find((l) => l.phone === cleanPhone);

      if (!duplicate) {
        const found = await LeadRepository.findByPhone(cleanPhone, 1);
        duplicate = found[0];
        if (duplicate) phoneToLead.set(cleanPhone, duplicate);
      }

      if (duplicate) {
        const updatedLead: Lead = {
          ...duplicate,
          name:
            duplicate.name === "Unknown Customer" ||
            duplicate.name === "Imported Customer" ||
            duplicate.name === "Generic Webhook Lead"
              ? cleanName
              : duplicate.name,
          email: duplicate.email || cleanEmail,
          updatedAt: new Date().toISOString(),
        };

        const newIdx = newlyCreatedLeads.findIndex((l) => l.id === duplicate!.id);
        if (newIdx !== -1) {
          newlyCreatedLeads[newIdx] = updatedLead;
        }

        phoneToLead.set(cleanPhone, updatedLead);
        updatedDuplicatesToDb.push(updatedLead);
        duplicateCount++;
      } else {
        const newId =
          Date.now().toString() +
          "-" +
          Math.floor(Math.random() * 1000) +
          "-" +
          successCount;
        const finalCreatedTime = leadData.createdAt || new Date().toISOString();

        const newLead: Lead = {
          ...leadData,
          id: newId,
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          status: leadData.status || "new",
          notes: leadData.notes || "",
          createdAt: finalCreatedTime,
          updatedAt: new Date().toISOString(),
          callCount: 0,
          hasAgentCall: false,
        };
        delete (newLead as Partial<Lead>).callLogs;

        newlyCreatedLeads.push(newLead);
        newLeadsToDb.push(newLead);
        phoneToLead.set(cleanPhone, newLead);
        successCount++;
      }
    }

    if (newLeadsToDb.length > 0 || updatedDuplicatesToDb.length > 0) {
      await LeadRepository.bulkAddLeads(newLeadsToDb, updatedDuplicatesToDb);
    }

    const callLogPromises: Promise<void>[] = [];
    for (const lead of newLeadsToDb) {
      callLogPromises.push(
        CallLogsRepository.create(lead.id, {
          date: new Date().toISOString(),
          note: lead.notes || "Initial import of lead.",
          status: lead.status || "new",
          agent: "system",
        })
          .then(() => {})
          .catch((err) => {
            logger.error(`Failed to create call log for imported lead ${lead.id}:`, err);
          })
      );
    }
    for (const lead of updatedDuplicatesToDb) {
      callLogPromises.push(
        CallLogsRepository.create(lead.id, {
          date: new Date().toISOString(),
          note: `Duplicate lead attempt merged. Source: Bulk Upload. Notes: ${lead.notes || "No description provided."}`,
          status: lead.status || "new",
          agent: "system",
        })
          .then(() => {})
          .catch((err) => {
            logger.error(`Failed to create call log for duplicate lead ${lead.id}:`, err);
          })
      );
    }
    if (callLogPromises.length > 0) {
      await Promise.all(callLogPromises);
    }

    return { successCount, duplicateCount };
  };

  return {
    addLead,
    updateLead,
    deleteLead,
    logCall,
    bulkUpdateLeads,
    mergeLeads,
    rateCallLog,
    archiveLeads,
    bulkAddLeads,
  };
}
