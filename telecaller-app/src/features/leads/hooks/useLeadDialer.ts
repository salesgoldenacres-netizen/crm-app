import { useState, useEffect, useRef, useCallback } from "react";
import { functions } from "@/shared/services/firebase";
import { httpsCallable } from "firebase/functions";
import { formatDuration } from "@/shared/utils/dateUtils";
import { Lead, User } from "@/shared/types";
import { useIVRStore } from "@/features/calls/hooks/useIVRStore";

export function useLeadDialer(
  activeLead: Lead | undefined,
  user: User
) {
  const { ivrSettings } = useIVRStore(user ? user.id : null);

  const [activeDialerLead, setActiveDialerLead] = useState<Lead | null>(null);
  const [dialerStatus, setDialerStatus] = useState("Dialing...");
  const [dialerSeconds, setDialerSeconds] = useState(0);
  const [dialerMuted, setDialerMuted] = useState(false);
  const [dialerSpeaker, setDialerSpeaker] = useState(false);
  const dialerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isDialerActive, setIsDialerActive] = useState(
    sessionStorage.getItem("isPowerDialerActive") === "true"
  );

  const handleStartCall = useCallback(
    (lead: Lead) => {
      setActiveDialerLead(lead);
      setDialerSeconds(0);
      setDialerMuted(false);
      setDialerSpeaker(false);

      if (ivrSettings && ivrSettings.enableIvr) {
        if (ivrSettings.ivrProvider === "mock") {
          setDialerStatus("Connecting IVR...");
          setTimeout(() => {
            setDialerStatus("Ringing agent...");
            setTimeout(() => {
              setDialerStatus("Connecting customer...");
              setTimeout(() => {
                setDialerStatus("Active Call");
              }, 1500);
            }, 1500);
          }, 1200);
        } else {
          setDialerStatus("Connecting IVR...");
          const triggerCall = async () => {
            try {
              const trigger = httpsCallable(functions, "triggerOutboundCall");
              const result = (await trigger({ leadId: lead.id })) as {
                data: { success: boolean; message?: string };
              };

              if (result.data && result.data.success) {
                setDialerStatus("Ringing agent...");
                setTimeout(() => {
                  setDialerStatus("Connecting customer...");
                  setTimeout(() => {
                    setDialerStatus("Active Call");
                  }, 2000);
                }, 2000);
              } else {
                setDialerStatus(
                  "Failed: " + (result.data?.message || "Unknown error")
                );
              }
            } catch (err: unknown) {
              console.error("IVR call trigger failed:", err);
              const errMsg = err instanceof Error ? err.message : String(err);
              setDialerStatus("Failed: " + errMsg);
            }
          };
          void triggerCall();
        }
      } else {
        setDialerStatus("Dialing...");
        setTimeout(() => {
          setDialerStatus("Ringing...");
          setTimeout(() => {
            setDialerStatus("Active Call");
          }, 2000);
        }, 1500);
      }
    },
    [ivrSettings]
  );

  const handleEndCall = useCallback(
    (onCallEnded?: (seconds: number, formatted: string) => void) => {
      if (dialerIntervalRef.current) clearInterval(dialerIntervalRef.current);
      const formatted = formatDuration(dialerSeconds * 1000);
      onCallEnded?.(dialerSeconds, formatted);
      setActiveDialerLead(null);
    },
    [dialerSeconds]
  );

  // Dialer timer ticks
  useEffect(() => {
    if (activeDialerLead && dialerStatus === "Active Call") {
      dialerIntervalRef.current = setInterval(() => {
        setDialerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (dialerIntervalRef.current) clearInterval(dialerIntervalRef.current);
    }
    return () => {
      if (dialerIntervalRef.current) clearInterval(dialerIntervalRef.current);
    };
  }, [activeDialerLead, dialerStatus]);

  // Power dialer auto-call on page mount or switch
  useEffect(() => {
    if (activeLead && isDialerActive) {
      const timer = setTimeout(() => {
        if (!activeDialerLead) {
          handleStartCall(activeLead);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [activeLead, isDialerActive, activeDialerLead, handleStartCall]);

  return {
    activeDialerLead,
    dialerStatus,
    dialerSeconds,
    dialerMuted,
    setDialerMuted,
    dialerSpeaker,
    setDialerSpeaker,
    isDialerActive,
    setIsDialerActive,
    handleStartCall,
    handleEndCall,
  };
}
