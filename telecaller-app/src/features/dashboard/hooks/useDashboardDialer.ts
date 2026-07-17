import { useState, useRef, useEffect, useCallback } from "react";
import { functions } from "@/shared/services/firebase";
import { httpsCallable } from "firebase/functions";
import { Lead, User } from "@/shared/types";

export function useDashboardDialer(
  user: User,
  isManagerial: (role: string) => boolean,
  updateAgentStatus: (userId: string, status: string, username: string) => Promise<void>,
  ivrSettings: any,
  activeIvrCall: any,
  clearActiveIvrCall: () => Promise<void>,
  matchedIvrLead: Lead | null,
  _toast: (msg: string, type?: "success" | "error" | "info" | "warning") => void,
  setActiveLeadId: (leadId: string) => void,
  setIsAddLeadModalOpen: (open: boolean) => void,
  setAddLeadForm: (updater: (prev: any) => any) => void
) {
  const [activeDialerLead, setActiveDialerLead] = useState<Lead | null>(null);
  const [dialerStatus, setDialerStatus] = useState<string>("Dialing...");
  const [dialerSeconds, setDialerSeconds] = useState<number>(0);
  const [dialerMuted, setDialerMuted] = useState<boolean>(false);
  const [dialerSpeaker, setDialerSpeaker] = useState<boolean>(false);

  const dialerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ivrBridgeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (dialerIntervalRef.current) clearInterval(dialerIntervalRef.current);
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      if (ivrBridgeTimeoutRef.current) clearTimeout(ivrBridgeTimeoutRef.current);
    };
  }, []);

  const handleStartCall = useCallback((lead: Lead) => {
    setActiveDialerLead(lead);
    setDialerSeconds(0);
    setDialerMuted(false);
    setDialerSpeaker(false);

    if (!isManagerial(user.role)) {
      updateAgentStatus(user.id, "on-call", user.username);
    }

    if (ivrSettings && ivrSettings.enableIvr) {
      if (ivrSettings.ivrProvider === "mock") {
        setDialerStatus("Connecting IVR...");
        ivrBridgeTimeoutRef.current = setTimeout(() => {
          setDialerStatus("Ringing agent...");
          ivrBridgeTimeoutRef.current = setTimeout(() => {
            setDialerStatus("Connecting customer...");
            ivrBridgeTimeoutRef.current = setTimeout(() => {
              setDialerStatus("Active Call");
              dialerIntervalRef.current = setInterval(() => {
                setDialerSeconds((prev) => prev + 1);
              }, 1000);
            }, 1500);
          }, 1500);
        }, 1200);
      } else {
        setDialerStatus("Connecting IVR...");
        const triggerCall = async () => {
          try {
            const trigger = httpsCallable(functions, "triggerOutboundCall");
            const result = await trigger({ leadId: lead.id });
            const resultData = result.data as { success: boolean; message?: string };

            if (resultData && resultData.success) {
              setDialerStatus("Ringing agent...");
              ivrBridgeTimeoutRef.current = setTimeout(() => {
                setDialerStatus("Connecting customer...");
                ivrBridgeTimeoutRef.current = setTimeout(() => {
                  setDialerStatus("Active Call");
                  dialerIntervalRef.current = setInterval(() => {
                    setDialerSeconds((prev) => prev + 1);
                  }, 1000);
                }, 2000);
              }, 2000);
            } else {
              setDialerStatus(
                "Failed: " + (resultData?.message || "Unknown error")
              );
            }
          } catch (err: any) {
            console.error("IVR call trigger failed:", err);
            setDialerStatus("Failed: " + err.message);
          }
        };
        triggerCall();
      }
    } else {
      setDialerStatus("Dialing...");
      ringTimeoutRef.current = setTimeout(() => {
        setDialerStatus("Ringing...");
      }, 1200);

      connectTimeoutRef.current = setTimeout(() => {
        setDialerStatus("Active Call");
        dialerIntervalRef.current = setInterval(() => {
          setDialerSeconds((prev) => prev + 1);
        }, 1000);
      }, 3500);
    }
  }, [user, isManagerial, updateAgentStatus, ivrSettings]);

  const handleEndCall = useCallback((setCallLogForm: (updater: (prev: any) => any) => void) => {
    if (dialerIntervalRef.current) clearInterval(dialerIntervalRef.current);
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    if (ivrBridgeTimeoutRef.current) clearTimeout(ivrBridgeTimeoutRef.current);

    // Format duration
    const totalSecs = dialerSeconds;
    const h = Math.floor(totalSecs / 3600).toString().padStart(2, "0");
    const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, "0");
    const s = (totalSecs % 60).toString().padStart(2, "0");
    const durationStr = `${h}:${m}:${s}`;

    setCallLogForm((prev) => ({
      ...prev,
      note: `[Call Log - Duration: ${durationStr}] ` + (prev.note || ""),
    }));

    if (!isManagerial(user.role)) {
      updateAgentStatus(user.id, "available", user.username);
    }
    setActiveDialerLead(null);
  }, [dialerSeconds, user, isManagerial, updateAgentStatus]);

  const handleAnswerIvrCall = useCallback(async () => {
    if (!activeIvrCall) return;
    const phoneNum = activeIvrCall.callerPhone;
    const finalLead: Lead = matchedIvrLead || {
      id: "temp-ivr-" + Date.now(),
      name: activeIvrCall.callerName || "Unknown Caller",
      phone: phoneNum,
      status: "new",
      projectId: "",
      plotId: "",
      notes: "Inbound IVR call received.",
      callLogs: [],
    };

    await clearActiveIvrCall();

    if (finalLead.id && !finalLead.id.startsWith("temp-ivr-")) {
      setActiveLeadId(finalLead.id);
    } else {
      setAddLeadForm((prev) => ({
        ...prev,
        name: finalLead.name,
        phone: finalLead.phone,
        notes: "Inbound IVR call received.",
      }));
      setIsAddLeadModalOpen(true);
    }

    setActiveDialerLead(finalLead);
    setDialerStatus("Active Call");
    setDialerSeconds(0);
    setDialerMuted(false);
    setDialerSpeaker(false);

    if (!isManagerial(user.role)) {
      await updateAgentStatus(user.id, "on-call", user.username);
    }

    if (dialerIntervalRef.current) clearInterval(dialerIntervalRef.current);
    dialerIntervalRef.current = setInterval(() => {
      setDialerSeconds((prev) => prev + 1);
    }, 1000);
  }, [activeIvrCall, matchedIvrLead, clearActiveIvrCall, setActiveLeadId, setIsAddLeadModalOpen, setAddLeadForm, user, isManagerial, updateAgentStatus]);

  return {
    activeDialerLead,
    setActiveDialerLead,
    dialerStatus,
    setDialerStatus,
    dialerSeconds,
    dialerMuted,
    setDialerMuted,
    dialerSpeaker,
    setDialerSpeaker,
    handleStartCall,
    handleEndCall,
    handleAnswerIvrCall,
  };
}
