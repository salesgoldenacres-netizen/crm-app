import { useState, useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { logAnalyticsEvent } from "@/shared/utils/analytics";
import { Lead } from "@/shared/types";
import { LeadsRepository } from "@/shared/services/firebase/repositories";
import { buildArchivedLeadsListQuery } from "@/shared/contracts";

export interface ArchivedLead extends Lead {
  archivedAt?: string;
  archivedBy?: string;
}

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
    const listQuery = buildArchivedLeadsListQuery(
      listLimit != null ? { limit: listLimit } : {},
    );

    const unsubscribe = onSnapshot(
      listQuery,
      (snapshot) => {
        const list: ArchivedLead[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ArchivedLead);
        });
        // Query orders by archivedAt desc; keep client fallback sort
        list.sort(
          (a, b) =>
            new Date(b.archivedAt || 0).getTime() -
            new Date(a.archivedAt || 0).getTime(),
        );
        setArchivedLeads(list);
        setIsLoaded(true);
      },
      (error) => {
        console.error("Error listening to archived leads:", error);
      },
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

      // Clean up archive-specific fields
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
    if (leadIds.length > 0) {
      await LeadsRepository.deletePermanently(leadIds);
      for (const id of leadIds) {
        logAnalyticsEvent("lead_permanently_deleted", { id });
      }
    }
  };

  return { archivedLeads, isLoaded, restoreLeads, deletePermanently };
}
