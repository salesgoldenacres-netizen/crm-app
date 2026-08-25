import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/shared/services/firebase";
import { ListenerManager } from "../ListenerManager";
import { tasksRef, smartListsRef } from "../converters";
import { buildUserTasksQuery } from "@/shared/contracts";
import { TaskItem, SmartList } from "@/shared/types";

export const TasksRepository = {
  async add(task: TaskItem): Promise<void> {
    await setDoc(doc(tasksRef, task.id), task);
  },
  async update(id: string, updates: Partial<TaskItem>): Promise<void> {
    await updateDoc(doc(tasksRef, id), updates);
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(tasksRef, id));
  },
  async bulkDelete(ids: string[]): Promise<void> {
    const batch = writeBatch(db);
    for (const id of ids) {
      batch.delete(doc(tasksRef, id));
    }
    await batch.commit();
  },
  subscribeUserTasks(userId: string, callback: (tasks: TaskItem[]) => void): () => void {
    const key = `tasks_user_${userId}`;
    return ListenerManager.subscribe<TaskItem[]>(
      key,
      (dispatch) => {
        const q = buildUserTasksQuery(userId);
        return onSnapshot(q, (snapshot) => {
          const list: TaskItem[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as TaskItem);
          });
          dispatch(list);
        });
      },
      callback
    );
  }
};

export const SmartListsRepository = {
  async add(list: SmartList): Promise<void> {
    await setDoc(doc(smartListsRef, list.id), list);
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(smartListsRef, id));
  },
  subscribeUserLists(userId: string | undefined, callback: (lists: SmartList[]) => void): () => void {
    const key = `smartLists_user_${userId ?? "global"}`;
    return ListenerManager.subscribe<SmartList[]>(
      key,
      (dispatch) => {
        return onSnapshot(smartListsRef, (snapshot) => {
          const lists: SmartList[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            if (!userId || data.userId === userId || !data.userId)
              lists.push(data);
          });
          lists.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          dispatch(lists);
        });
      },
      callback
    );
  }
};
