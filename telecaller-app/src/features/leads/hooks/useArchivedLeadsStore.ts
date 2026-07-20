import { useState, useEffect } from "react";
import { logAnalyticsEvent } from "@/shared/utils/analytics";
import { Lead } from "@/shared/types";
import { LeadsRepository } from "@/shared/services/firebase/repositories";
import {
  subscribeArchivedLeads,
  type ArchivedLeadDoc,
} from "@/shared/services/firebase/archivedLeadsListener";

export type ArchivedLead = ArchivedLeadDoc;

export interface UseArchivedLeadsStoreOptions {
  /** Max docs for the list listener (default 200 via contract). */
  listLimit?: number;
}

export function useArchivedLeadsStore(
  options: UseArchivedLeadsStoreOptions = {},
) {
  const { listLimit } = options;
  const [archivedLeads, setArchivedLeads] = useState<ArchivedLead[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeArchivedLeads(
      (list) => {
        setArchivedLeads(list);
        setIsLoaded(true);
      },
      (error) => {
        console.error("Error listening to archived leads:", error);
      },
      listLimit,
    );

    return () => unsubscribe();
  }, [listLimit]);

  const restoreLeads = async (
    leadIds: string[],
    newFields: Partial<Lead> = {},
  ): Promise<void> => {
    const restoredList: { id: string; lead: Lead }[] = [];
    for (const id of leadIds) {
      const archivedLead = archivedLeads.find((l) => l.id === id);
      if (!archivedLead) continue;

      const restoredLead: Partial<ArchivedLead> = {
        ...archivedLead,
        ...newFields,
        updatedAt: new Date().toISOString(),
      };

      delete restoredLead.archivedAt;
      delete restoredLead.archivedBy;

      restoredList.push({ id, lead: restoredLead as Lead });

      logAnalyticsEvent("lead_restored", {
        id,
        projectId: restoredLead.source || "unassigned",
      });
    }
    if (restoredList.length > 0) {
      await LeadsRepository.restoreLeads(restoredList);
    }
  };

  const deletePermanently = async (leadIds: string[]): Promise<void> => {
    await LeadsRepository.deletePermanently(leadIds);
  };

  return {
    archivedLeads,
    isLoaded,
    restoreLeads,
    deletePermanently,
  };
}
