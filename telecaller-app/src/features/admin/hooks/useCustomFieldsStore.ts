import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/shared/services/firebase";
import { CustomField } from "@/shared/types";
import { SettingsRepository } from "@/shared/services/firebase/repositories";

export function useCustomFieldsStore() {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "customFields"),
      (docSnap) => {
        setCustomFields(docSnap.exists() ? docSnap.data().fields || [] : []);
        setIsLoaded(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const saveCustomFields = async (fields: CustomField[]) => {
    await SettingsRepository.setCustomFields(fields);
  };

  return { customFields, isLoaded, saveCustomFields };
}
