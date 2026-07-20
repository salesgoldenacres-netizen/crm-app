/**
 * Archived-leads list listener (Lead Bin). Kept out of features/leads so list/query
 * paths do not import firebase/firestore directly.
 */

import { onSnapshot, type Unsubscribe } from "firebase/firestore";
import { buildArchivedLeadsListQuery } from "@/shared/contracts";
import type { Lead } from "@/shared/types";

export interface ArchivedLeadDoc extends Lead {
  archivedAt?: string;
  archivedBy?: string;
}

export function subscribeArchivedLeads(
  onData: (leads: ArchivedLeadDoc[]) => void,
  onError?: (error: Error) => void,
  listLimit?: number,
): Unsubscribe {
  const listQuery = buildArchivedLeadsListQuery(
    listLimit != null ? { limit: listLimit } : {},
  );

  return onSnapshot(
    listQuery,
    (snapshot) => {
      const list: ArchivedLeadDoc[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ArchivedLeadDoc);
      });
      list.sort(
        (a, b) =>
          new Date(b.archivedAt || 0).getTime() -
          new Date(a.archivedAt || 0).getTime(),
      );
      onData(list);
    },
    (error) => {
      onError?.(error);
    },
  );
}
