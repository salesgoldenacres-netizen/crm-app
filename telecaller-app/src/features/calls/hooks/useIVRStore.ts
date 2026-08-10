import { useState, useEffect } from "react";
import { splitIvrSettingsFields } from "@/shared/constants/integrationSecretFields";
import { IvrCallsRepository, SettingsRepository } from "@/shared/services/firebase/repositories";
import type { IVRActiveCall, IVRSettings } from "@/shared/types/ivr";

export type { IVRSettings, IVRActiveCall };

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
    const unsubscribe = SettingsRepository.subscribeIntegrations((data) => {
      setIvrSettings((prev) =>
        Object.assign({}, prev, data as Partial<IVRSettings>) as IVRSettings
      );
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = IvrCallsRepository.subscribeActiveCall(userId, (call) => {
      setActiveIvrCall(call);
    });
    return () => unsubscribe();
  }, [userId]);

  const updateIvrSettings = async (settings: Partial<IVRSettings>) => {
    const { publicFields, secretFields } = splitIvrSettingsFields(
      settings as Record<string, unknown>,
    );
    if (Object.keys(publicFields).length > 0) {
      await SettingsRepository.setIntegrations(publicFields);
    }
    if (Object.keys(secretFields).length > 0) {
      await SettingsRepository.setIntegrationsSecrets(secretFields);
    }
  };

  const clearActiveIvrCall = async () => {
    if (!activeIvrCall?.id) return;
    try {
      await IvrCallsRepository.delete(activeIvrCall.id);
    } catch (err) {
      console.error("Error deleting ivrCall document: ", err);
    }
  };

  const simulateIncomingIvrCall = async (
    targetUserId: string,
    callData: { callerPhone: string; callerName?: string; leadId?: string }
  ) => {
    await IvrCallsRepository.add({
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
