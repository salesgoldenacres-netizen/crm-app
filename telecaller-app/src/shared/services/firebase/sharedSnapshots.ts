/**
 * Shared Firestore snapshot attachers for ref-counted listeners.
 * Feature hooks should prefer these over importing firebase/firestore directly.
 */

import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "@/shared/services/firebase";
import { CustomRole, AgentStatusRecord, Branding } from "@/shared/types";
import {
  customRolesRef,
  agentStatusRef,
} from "@/shared/services/firebase/converters";

export function attachCustomRolesSnapshot(
  emit: (roles: CustomRole[], loaded?: boolean) => void,
  presets: CustomRole[],
): Unsubscribe {
  return onSnapshot(customRolesRef, (snapshot) => {
    if (snapshot.empty) {
      emit(presets, true);
      return;
    }
    const list: CustomRole[] = [];
    snapshot.forEach((d) => list.push(d.data()));
    emit(list, true);
  });
}

export function attachAgentStatusesSnapshot(
  emit: (statuses: Record<string, AgentStatusRecord>, loaded?: boolean) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    agentStatusRef,
    (snapshot) => {
      const statuses: Record<string, AgentStatusRecord> = {};
      snapshot.forEach((d) => {
        statuses[d.id] = d.data();
      });
      emit(statuses, true);
    },
    (err) => onError?.(err as Error),
  );
}

export function attachBrandingSnapshot(
  emit: (branding: Branding, loaded?: boolean) => void,
  mapDoc: (data: Record<string, unknown>) => Branding,
  onMissing: () => Branding,
): Unsubscribe {
  return onSnapshot(doc(db, "settings", "branding"), (docSnap) => {
    if (docSnap.exists()) {
      emit(mapDoc(docSnap.data() as Record<string, unknown>), true);
      return;
    }
    emit(onMissing(), true);
  });
}
