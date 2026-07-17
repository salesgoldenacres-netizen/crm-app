import { logAnalyticsEvent } from "@/shared/utils/analytics";
import { logger } from "@/shared/utils/logger";
import { updateAgentProductivity } from "@/features/admin/hooks/adminStores";
import { useDatabase } from "@/shared/services/DatabaseContext";
import { Lead, CallLog } from "@/shared/types";
import {
  normalizePhone,
  cleanLeadName,
  cleanEmailAddress,
} from "@/shared/utils/formatUtils";
import { LeadsRepository } from "@/shared/services/firebase/repositories";
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

export function useLeadsStore() {
  const { leads, isLeadsLoaded: isLoaded } = useDatabase();

  const addLead = async (leadData: Partial<Lead> & { name: string; phone: string }): Promise<Lead | { isDuplicate: boolean }> => {
    const cleanName = cleanLeadName(leadData.name);
    const cleanEmail = cleanEmailAddress(leadData.email || "");
    const cleanPhone = normalizePhone(leadData.phone);

    // 2. Deduplication check against in-memory leads array
    const duplicate = leads.find((l: Lead) => l.phone === cleanPhone);
    if (duplicate) {
      logger.info(
        "LeadsStore",
        `Client-side duplicate detected for phone: ${cleanPhone}. Merging into existing lead ID: ${duplicate.id}`
      );

      const newLogs = duplicate.callLogs ? [...duplicate.callLogs] : [];
      newLogs.push({
        date: new Date().toISOString(),
        note: `Duplicate lead attempt merged. Source: Manual/Bulk Upload. Notes: ${leadData.notes || "No description provided."}`,
        status: duplicate.status || "new",
        agent: "system",
      });

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
        callLogs: newLogs,
      };

      // Save update in Firestore
      await LeadsRepository.add(updatedLead);
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
      callLogs: leadData.callLogs || [
        {
          date: new Date().toISOString(),
          note: "Lead created.",
          status: leadData.status || "new",
          agent: "system",
        },
      ],
    };
    await LeadsRepository.add(newLead);
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
    const prev = leads.find((l: Lead) => l.id === id);
    await LeadsRepository.update(id, updatedFields);

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
    await LeadsRepository.delete(id);
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
    }: LogCallPayload
  ): Promise<void> => {
    // Capture the lead's CURRENT status before overwriting it (for productivity delta)
    const prevLead = leads.find((l: Lead) => l.id === leadId);
    const prevLeadStatus = prevLead?.status || "new";
    const agentUserId = prevLead?.assignedTo || null;

    const newLog: CallLog = {
      date: new Date().toISOString(),
      note,
      status,
      agent: agent || "telecaller",
    };
    // Attach optional call tracking fields
    if (duration !== undefined) newLog.duration = duration; // in seconds
    if (callType) newLog.callType = callType; // 'outgoing' | 'incoming'
    if (picked !== undefined) newLog.picked = picked; // true if customer answered

    const callSourceId = `call:${leadId}:${newLog.date}`;

    await LeadsRepository.logCall(leadId, newLog, status, followUpDate || "");

    logAnalyticsEvent("call_logged", {
      leadId,
      status,
      agent: agent || "telecaller",
    });

    // Resolve primary activity: explicit timelineActivity wins over heuristics.
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
      // Bracketed domain tags must use typed publishers — do not heuristic-classify as notes.
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

    // Status / follow-up are secondary diffs — only when values actually change.
    // Callers must NOT also updateLead({ status, followUpDate }) for the same intent.
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

    // Fire-and-forget: update agent's daily productivity telemetry
    if (agentUserId) {
      updateAgentProductivity({
        userId: agentUserId,
        newStatus: status,
        prevStatus: prevLeadStatus,
        duration: duration || 0,
      }).catch((err) =>
        logger.warn("LeadsStore", "Failed to update telemetry:", err)
      );
    }
  };

  const bulkUpdateLeads = async (leadIds: string[], updatedFields: Partial<Lead>): Promise<void> => {
    await LeadsRepository.bulkUpdate(leadIds, updatedFields);
  };

  const mergeLeads = async (targetId: string, sourceId: string, customSelections: Partial<Lead> | null = null): Promise<void> => {
    const targetLead = leads.find((l: Lead) => l.id === targetId);
    const sourceLead = leads.find((l: Lead) => l.id === sourceId);
    if (!targetLead || !sourceLead) return;

    const mergedLogs = [
      ...(targetLead.callLogs || []),
      ...(sourceLead.callLogs || []),
    ];
    mergedLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let updates: Partial<Lead> = {
      callLogs: mergedLogs,
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

      updates = {
        ...updates,
        ...customSelections,
        notes: mergedNotes,
      };
    } else {
      // Automatic merge logic
      const mergedNotes = `${targetLead.notes || ""}\n[Merged Notes from ${sourceLead.name}]: ${sourceLead.notes || ""}`;
      updates.notes = mergedNotes;

      if (!targetLead.email && sourceLead.email)
        updates.email = sourceLead.email;
      if (!targetLead.source && sourceLead.source) {
        updates.source = sourceLead.source;
      }
    }

    await LeadsRepository.update(targetId, updates);
    await LeadsRepository.delete(sourceId);

    void publishLeadMerged({
      leadId: targetId,
      sourceLeadId: sourceId,
      sourceLeadName: sourceLead.name,
      sourceId,
      idempotencyKey: `lead_merged_${targetId}_${sourceId}`,
    });
  };

  const rateCallLog = async (leadId: string, logIndex: number, qualityScore: string | number, adminFeedback: string): Promise<void> => {
    const lead = leads.find((l: Lead) => l.id === leadId);
    if (!lead || !lead.callLogs || !lead.callLogs[logIndex]) return;
    const updatedLogs = [...lead.callLogs];
    updatedLogs[logIndex] = {
      ...updatedLogs[logIndex],
      qualityScore: parseInt(qualityScore as string) || undefined,
      adminFeedback: adminFeedback || "",
    } as CallLog;
    await LeadsRepository.rateCallLog(leadId, updatedLogs);
  };

  const archiveLeads = async (leadIds: string[], username = "admin"): Promise<void> => {
    const archivedList: { leadId: string; archivedLead: Lead & { archivedAt: string; archivedBy: string } }[] = [];
    for (const id of leadIds) {
      const lead = leads.find((l: Lead) => l.id === id);
      if (!lead) continue;

      const archivedLead = {
        ...lead,
        archivedAt: new Date().toISOString(),
        archivedBy: username,
        updatedAt: new Date().toISOString(),
      };
      archivedList.push({ leadId: id, archivedLead });
    }
    if (archivedList.length > 0) {
      await LeadsRepository.archiveLeads(archivedList);
    }
  };

  const bulkAddLeads = async (leadsData: Array<Partial<Lead> & { name: string; phone: string }>): Promise<{ successCount: number; duplicateCount: number }> => {
    let successCount = 0;
    let duplicateCount = 0;
    const newlyCreatedLeads: Lead[] = [];
    const newLeadsToDb: Lead[] = [];
    const updatedDuplicatesToDb: Lead[] = [];

    for (const leadData of leadsData) {
      let cleanPhone: string;
      try {
        cleanPhone = normalizePhone(leadData.phone);
      } catch {
        continue;
      }

      const cleanName = cleanLeadName(leadData.name);
      const cleanEmail = cleanEmailAddress(leadData.email || "");

      let duplicate = leads.find((l: Lead) => l.phone === cleanPhone);
      if (!duplicate) {
        duplicate = newlyCreatedLeads.find((l) => l.phone === cleanPhone);
      }

      if (duplicate) {
        const newLogs = duplicate.callLogs ? [...duplicate.callLogs] : [];
        newLogs.push({
          date: new Date().toISOString(),
          note: `Duplicate lead attempt merged. Source: Bulk Upload. Notes: ${leadData.notes || "No description provided."}`,
          status: duplicate.status || "new",
          agent: "system",
        });

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
          callLogs: newLogs,
        };

        const newIdx = newlyCreatedLeads.findIndex((l) => l.id === duplicate.id);
        if (newIdx !== -1) {
          newlyCreatedLeads[newIdx] = updatedLead;
        }

        updatedDuplicatesToDb.push(updatedLead);
        duplicateCount++;
      } else {
        const newId =
          Date.now().toString() + "-" + Math.floor(Math.random() * 1000) + "-" + successCount;
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
          callLogs: [
            {
              date: new Date().toISOString(),
              note: leadData.notes || "Initial import of lead.",
              status: leadData.status || "new",
              agent: "system",
            },
          ],
        };

        newlyCreatedLeads.push(newLead);
        newLeadsToDb.push(newLead);
        successCount++;
      }
    }

    if (newLeadsToDb.length > 0 || updatedDuplicatesToDb.length > 0) {
      await LeadsRepository.bulkAddLeads(newLeadsToDb, updatedDuplicatesToDb);
    }

    return { successCount, duplicateCount };
  };

  return {
    leads,
    isLoaded,
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
