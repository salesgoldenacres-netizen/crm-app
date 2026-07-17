import { useState, useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { SmartList } from "@/shared/types";
import { smartListsRef } from "@/shared/services/firebase/converters";
import { SmartListsRepository } from "@/shared/services/firebase/repositories";

export function useSmartListsStore(userId?: string) {
  const [smartLists, setSmartLists] = useState<SmartList[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(smartListsRef, (snapshot) => {
      const lists: SmartList[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.userId === userId || !data.userId)
          lists.push(data);
      });
      lists.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
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
