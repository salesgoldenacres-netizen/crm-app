import { useState, useEffect } from "react";
import { SmartList } from "@/shared/types";
import { SmartListsRepository } from "@/shared/services/firebase/repositories";

export function useSmartListsStore(userId?: string) {
  const [smartLists, setSmartLists] = useState<SmartList[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = SmartListsRepository.subscribeUserLists(userId, (lists) => {
      setSmartLists(lists);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [userId]);

  const addSmartList = async (listData: { name: string; filters: Record<string, any> }) => {
    const newId = Date.now().toString();
    const newList: SmartList = {
      id: newId,
      userId,
      name: listData.name,
      filters: listData.filters || {},
      createdAt: new Date().toISOString(),
    };
    await SmartListsRepository.add(newList);
  };

  const deleteSmartList = async (id: string) => {
    await SmartListsRepository.delete(id);
  };

  return { smartLists, isLoaded, addSmartList, deleteSmartList };
}
