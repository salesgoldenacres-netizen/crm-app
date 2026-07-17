import { useState, useEffect } from "react";
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "@/shared/services/firebase";

export interface IVRSettings {
  enableIvr: boolean;
  ivrProvider: string;
  ivrVirtualNumber: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  exotelSid: string;
  exotelToken: string;
  exotelVirtualNumber: string;
  ivrCustomOutboundUrl: string;
  ivrCustomMethod: string;
  ivrCustomAuthHeader: string;
  ivrCustomHeaders: string;
  ivrCustomPayload: string;
  [key: string]: string | boolean;
}

export interface IVRActiveCall {
  id: string;
  agentId?: string;
  timestamp: string;
  callerPhone: string;
  callerName: string;
  leadId: string;
  status: string;
}

const DEFAULT_IVR_SETTINGS: IVRSettings = {
  enableIvr: false,
  ivrProvider: "mock",
  ivrVirtualNumber: "",
  twilioAccountSid: "",
  twilioAuthToken: "",
  twilioPhoneNumber: "",
  exotelSid: "",
  exotelToken: "",
  exotelVirtualNumber: "",
  ivrCustomOutboundUrl: "",
  ivrCustomMethod: "POST",
  ivrCustomAuthHeader: "",
  ivrCustomHeaders: '{\n  "Content-Type": "application/json"\n}',
  ivrCustomPayload:
    '{\n  "from": "{{agentPhone}}",\n  "to": "{{clientPhone}}",\n  "callerId": "{{virtualNumber}}"\n}',
};

export function useIVRStore(userId: string | null | undefined) {
  const [ivrSettings, setIvrSettings] = useState<IVRSettings>(DEFAULT_IVR_SETTINGS);
  const [activeIvrCall, setActiveIvrCall] = useState<IVRActiveCall | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "integrations"),
      (docSnap) => {
        if (docSnap.exists()) {
          setIvrSettings((prev) =>
            Object.assign({}, prev, docSnap.data() as Partial<IVRSettings>) as IVRSettings
          );
        }
        setIsLoaded(true);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    // Auto-ID docs keyed by agentId field (not doc id === agent id).
    const q = query(
      collection(db, "ivrCalls"),
      where("agentId", "==", userId),
      where("status", "==", "ringing"),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setActiveIvrCall({ id: d.id, ...(d.data() as Omit<IVRActiveCall, "id">) });
      } else {
        setActiveIvrCall(null);
      }
    });
    return () => unsubscribe();
  }, [userId]);

  const updateIvrSettings = async (settings: Partial<IVRSettings>) => {
    await setDoc(doc(db, "settings", "integrations"), settings, {
      merge: true,
    });
  };

  const clearActiveIvrCall = async () => {
    if (!activeIvrCall?.id) return;
    try {
      await deleteDoc(doc(db, "ivrCalls", activeIvrCall.id));
    } catch (err) {
      console.error("Error deleting ivrCall document: ", err);
    }
  };

  const simulateIncomingIvrCall = async (
    targetUserId: string,
    callData: { callerPhone: string; callerName?: string; leadId?: string }
  ) => {
    await addDoc(collection(db, "ivrCalls"), {
      agentId: targetUserId,
      timestamp: new Date().toISOString(),
      callerPhone: callData.callerPhone,
      callerName: callData.callerName ?? "Unknown Caller",
      leadId: callData.leadId ?? "",
      status: "ringing",
    });
  };

  return {
    ivrSettings,
    activeIvrCall,
    isLoaded,
    updateIvrSettings,
    clearActiveIvrCall,
    simulateIncomingIvrCall,
  };
}
