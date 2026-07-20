import { useState, useEffect } from "react";
import { TaskItem } from "@/shared/types";
import { TasksRepository } from "@/shared/services/firebase/repositories";

export interface UseTasksStoreOptions {
  /**
   * When false, skip the live listener (Dashboard lazy-subscribe).
   * Writes still work via repository when the listener was previously warm.
   */
  enabled?: boolean;
}

export function useTasksStore(
  userId?: string,
  options: UseTasksStoreOptions = {},
) {
  const { enabled = true } = options;
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(!userId || !enabled);
  const [prevUserId, setPrevUserId] = useState(userId);

  if (userId !== prevUserId) {
    setPrevUserId(userId);
    setIsLoaded(!userId || !enabled);
    if (!userId) setTasks([]);
  }

  useEffect(() => {
    if (!userId || !enabled) return;

    const unsubscribe = TasksRepository.subscribeUserTasks(userId, (list) => {
      // Query orders by createdAt asc; keep client fallback
      list.sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime(),
      );
      setTasks(list);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [userId, enabled]);

  const addTask = async (text: string) => {
    if (!userId) return;
    const id = Date.now().toString();
    const newTask: TaskItem = {
      id,
      userId,
      text,
      done: false,
      createdAt: new Date().toISOString(),
    };
    await TasksRepository.add(newTask);
  };

  const toggleTask = async (taskId: string, done: boolean) => {
    await TasksRepository.update(taskId, { done });
  };

  const deleteTask = async (taskId: string) => {
    await TasksRepository.delete(taskId);
  };

  const clearCompletedTasks = async () => {
    const completedIds = tasks.filter((t) => t.done).map((t) => t.id);
    if (completedIds.length > 0) {
      await TasksRepository.bulkDelete(completedIds);
    }
  };

  return { tasks, isLoaded, addTask, toggleTask, deleteTask, clearCompletedTasks };
}
