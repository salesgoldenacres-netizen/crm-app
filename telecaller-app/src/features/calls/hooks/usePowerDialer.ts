import { useState, useEffect, useRef } from "react";
import { Lead } from "@/shared/types";

interface UsePowerDialerProps {
  leads: Lead[];
  startCall: (lead: Lead) => void;
  activeDialerLead: Lead | null;
  isCallLogModalOpen: boolean;
}

export function usePowerDialer({
  leads,
  startCall,
  activeDialerLead,
  isCallLogModalOpen,
}: UsePowerDialerProps) {
  const [isPowerDialerActive, setIsPowerDialerActive] = useState<boolean>(() => {
    return sessionStorage.getItem("isPowerDialerActive") === "true";
  });
  const [powerDialerQueue, setPowerDialerQueue] = useState<string[]>(() => {
    return JSON.parse(sessionStorage.getItem("powerDialerQueue") || "[]");
  });
  const [powerDialerIndex, setPowerDialerIndex] = useState<number>(() => {
    return parseInt(sessionStorage.getItem("powerDialerIndex") || "0", 10);
  });
  const [powerDialerCountdown, setPowerDialerCountdown] = useState(5);
  const [isCountdownPaused, setIsCountdownPaused] = useState(false);

  // Sync state changes with sessionStorage
  useEffect(() => {
    if (isPowerDialerActive) {
      sessionStorage.setItem("isPowerDialerActive", "true");
    } else {
      sessionStorage.removeItem("isPowerDialerActive");
    }
  }, [isPowerDialerActive]);

  useEffect(() => {
    sessionStorage.setItem("powerDialerQueue", JSON.stringify(powerDialerQueue));
  }, [powerDialerQueue]);

  useEffect(() => {
    sessionStorage.setItem("powerDialerIndex", String(powerDialerIndex));
  }, [powerDialerIndex]);

  // Keep track of the previous CallLogModal open state
  const prevCallLogOpenRef = useRef(isCallLogModalOpen);

  useEffect(() => {
    let timer: any;
    if (prevCallLogOpenRef.current && !isCallLogModalOpen) {
      // Call log modal was closed (outcomes saved/finished)
      if (isPowerDialerActive && powerDialerQueue.length > 0) {
        const nextIndex = powerDialerIndex + 1;
        timer = setTimeout(() => {
          setPowerDialerIndex(nextIndex);
          setPowerDialerCountdown(5);
        }, 0);
      }
    }
    prevCallLogOpenRef.current = isCallLogModalOpen;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isCallLogModalOpen, isPowerDialerActive, powerDialerQueue.length, powerDialerIndex]);

  // Power dialer automatic dialing countdown
  useEffect(() => {
    let timer: any;
    const totalLeads = powerDialerQueue.length;
    const isCompleted = powerDialerIndex >= totalLeads;

    if (
      isPowerDialerActive &&
      totalLeads > 0 &&
      !isCompleted &&
      !isCountdownPaused &&
      !activeDialerLead &&
      !isCallLogModalOpen
    ) {
      timer = setInterval(() => {
        setPowerDialerCountdown((prev) => {
          if (prev <= 1) {
            const nextLeadId = powerDialerQueue[powerDialerIndex];
            const nextLead = leads.find((l) => l.id === nextLeadId);
            if (nextLead) {
              startCall(nextLead);
            } else {
              // If lead is missing, auto-skip
              const nextIndex = powerDialerIndex + 1;
              setPowerDialerIndex(nextIndex);
            }
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [
    isPowerDialerActive,
    powerDialerQueue,
    powerDialerIndex,
    isCountdownPaused,
    activeDialerLead,
    isCallLogModalOpen,
    leads,
    startCall,
  ]);

  const handleSkipLead = () => {
    const nextIndex = powerDialerIndex + 1;
    setPowerDialerIndex(nextIndex);
    setPowerDialerCountdown(5);
  };

  const handleQuitCampaign = () => {
    setIsPowerDialerActive(false);
    sessionStorage.removeItem("isPowerDialerActive");
    sessionStorage.removeItem("powerDialerQueue");
    sessionStorage.removeItem("powerDialerIndex");
    setPowerDialerQueue([]);
    setPowerDialerIndex(0);
  };

  return {
    isPowerDialerActive,
    setIsPowerDialerActive,
    powerDialerQueue,
    setPowerDialerQueue,
    powerDialerIndex,
    setPowerDialerIndex,
    powerDialerCountdown,
    setPowerDialerCountdown,
    isCountdownPaused,
    setIsCountdownPaused,
    handleSkipLead,
    handleQuitCampaign,
  };
}
