import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/shared/services/firebase";
import { ListenerManager } from "../ListenerManager";
import { auditLogsRef, notificationsRef } from "../converters";
import {
  buildAuditLogsListQuery,
  buildUserNotificationsQuery,
} from "@/shared/contracts";
import {
  AuditLog,
  NotificationItem,
} from "@/shared/types";
import type { IVRActiveCall } from "@/shared/types/ivr";
import type { TimelineEvent } from "@/shared/types/timeline";

export const AuditLogsRepository = {
  async add(log: AuditLog): Promise<void> {
    await setDoc(doc(auditLogsRef, log.id), log);
  },
  subscribeList(
    options: { limit?: number },
    callback: (logs: AuditLog[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const key = `auditLogs_list_${JSON.stringify(options)}`;
    return ListenerManager.subscribe<AuditLog[]>(
      key,
      (dispatch) => {
        const listQuery = buildAuditLogsListQuery(options);
        return onSnapshot(
          listQuery,
          (snapshot) => {
            const logs: AuditLog[] = [];
            snapshot.forEach((d) => logs.push({ id: d.id, ...d.data() } as AuditLog));
            dispatch(logs);
          },
          onError
        );
      },
      callback
    );
  }
};

export const NotificationsRepository = {
  async add(notification: NotificationItem): Promise<void> {
    await setDoc(doc(notificationsRef, notification.id), notification);
  },
  async update(id: string, updates: Partial<NotificationItem>): Promise<void> {
    await updateDoc(doc(notificationsRef, id), updates);
  },
  async markAllAsRead(ids: string[]): Promise<void> {
    const batch = writeBatch(db);
    for (const id of ids) {
      batch.update(doc(notificationsRef, id), { read: true });
    }
    await batch.commit();
  },
  subscribeUserNotifications(
    userId: string,
    callback: (list: NotificationItem[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const key = `notifications_user_${userId}`;
    return ListenerManager.subscribe<NotificationItem[]>(
      key,
      (dispatch) => {
        const q = buildUserNotificationsQuery(userId);
        return onSnapshot(
          q,
          (snapshot) => {
            const list: NotificationItem[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as NotificationItem));
            dispatch(list);
          },
          onError
        );
      },
      callback
    );
  }
};

export const IvrCallsRepository = {
  subscribeActiveCall(agentId: string, callback: (call: IVRActiveCall | null) => void): () => void {
    const key = `ivrCalls_active_${agentId}`;
    return ListenerManager.subscribe<IVRActiveCall | null>(
      key,
      (dispatch) => {
        const q = query(
          collection(db, "ivrCalls"),
          where("agentId", "==", agentId),
          where("status", "==", "ringing"),
          orderBy("timestamp", "desc"),
          limit(1)
        );
        return onSnapshot(q, (snap) => {
          if (!snap.empty) {
            const d = snap.docs[0];
            dispatch({ id: d.id, ...(d.data() as Omit<IVRActiveCall, "id">) });
          } else {
            dispatch(null);
          }
        });
      },
      callback
    );
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, "ivrCalls", id));
  },
  async add(call: Omit<IVRActiveCall, "id">): Promise<void> {
    await addDoc(collection(db, "ivrCalls"), call);
  }
};

export const TimelineEventsRepository = {
  async add(payload: Omit<TimelineEvent, "id"> | Partial<TimelineEvent>, idempotencyKey?: string): Promise<string | null> {
    if (idempotencyKey) {
      const safeKey = String(idempotencyKey).replace(/[^\w.-]/g, "_").slice(0, 120);
      const id = `tl_${safeKey}`;
      await setDoc(doc(db, "timelineEvents", id), payload, { merge: true });
      return id;
    }
    const ref = await addDoc(collection(db, "timelineEvents"), payload);
    return ref.id;
  },
  subscribe(leadId: string, max: number, callback: (events: TimelineEvent[]) => void): () => void {
    const key = `timelineEvents_lead_${leadId}_max_${max}`;
    return ListenerManager.subscribe<TimelineEvent[]>(
      key,
      (dispatch) => {
        const q = query(
          collection(db, "timelineEvents"),
          where("leadId", "==", leadId),
          orderBy("timestamp", "desc"),
          limit(max)
        );
        return onSnapshot(q, (snap) => {
          const list: TimelineEvent[] = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              leadId: String(data.leadId || leadId),
              type: data.type,
              source: data.source || "system",
              sourceId: data.sourceId,
              conversationId: data.conversationId,
              messageId: data.messageId,
              summary: String(data.summary || ""),
              icon: data.icon || "note",
              actorId: data.actorId,
              actorName: data.actorName,
              metadata: data.metadata,
              timestamp: String(data.timestamp || data.createdAt || ""),
              createdAt: String(data.createdAt || data.timestamp || ""),
            } as TimelineEvent);
          });
          dispatch(list);
        });
      },
      callback
    );
  }
};

export const WhatsAppMessagesRepository = {
  subscribe(leadId: string, max: number, callback: (snapshot: QuerySnapshot<DocumentData>) => void, onError: (err: Error) => void): () => void {
    const key = `whatsappMessages_lead_${leadId}_max_${max}`;
    return ListenerManager.subscribe<QuerySnapshot<DocumentData>>(
      key,
      (dispatch) => {
        const q = query(
          collection(db, "whatsappMessages"),
          where("leadId", "==", leadId),
          orderBy("timestamp", "asc"),
          limit(max)
        );
        return onSnapshot(q, dispatch, onError);
      },
      callback
    );
  },
  subscribeLegacy(leadId: string, max: number, callback: (snapshot: QuerySnapshot<DocumentData>) => void, onError: (err: Error) => void): () => void {
    const key = `whatsappMessagesLegacy_lead_${leadId}_max_${max}`;
    return ListenerManager.subscribe<QuerySnapshot<DocumentData>>(
      key,
      (dispatch) => {
        const q = query(
          collection(db, "leads", leadId, "whatsappMessages"),
          orderBy("timestamp", "asc"),
          limit(max)
        );
        return onSnapshot(q, dispatch, onError);
      },
      callback
    );
  }
};

export const WhatsAppConversationsRepository = {
  subscribe(
    max: number,
    callback: (snapshot: QuerySnapshot<DocumentData>) => void,
    onError: (err: Error) => void,
    scope?: { managerial?: boolean; assignedTo?: string },
  ): () => void {
    const scopeKey = scope?.managerial
      ? "managerial"
      : scope?.assignedTo || "unscoped";
    const key = `whatsappConversations_max_${max}_${scopeKey}`;
    return ListenerManager.subscribe<QuerySnapshot<DocumentData>>(
      key,
      (dispatch) => {
        const constraints = [orderBy("lastMessageAt", "desc"), limit(max)];
        const base = collection(db, "whatsappConversations");
        const q =
          !scope?.managerial && scope?.assignedTo
            ? query(
                base,
                where("assignedTo", "==", scope.assignedTo),
                ...constraints,
              )
            : query(base, ...constraints);
        return onSnapshot(q, dispatch, onError);
      },
      callback,
    );
  },
};
