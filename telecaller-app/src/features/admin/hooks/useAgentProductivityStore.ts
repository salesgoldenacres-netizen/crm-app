import { useState, useEffect } from "react";
import { DailyProductivity } from "@/shared/types";
import { AgentProductivityRepository } from "@/shared/services/firebase/repositories";

export function useAgentProductivityStore() {
  const [productivity, setProductivity] = useState<Record<string, DailyProductivity>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = AgentProductivityRepository.subscribeMap((prod) => {
      setProductivity(prod);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  return { productivity, isLoaded };
}

interface UpdateAgentProductivityArgs {
  userId: string;
  newStatus: string;
  duration?: number;
  prevStatus: string;
}

/**
 * @deprecated Phase F — do not call from client logCall paths.
 * Sole productivity writer is the Cloud Function + productivityEvents.
 * Kept only for emergency/admin tooling; prefer CF.
 */
export async function updateAgentProductivity({
  userId,
  newStatus,       // lead status after this call (e.g. 'booked', 'interested')
  duration,        // call duration in seconds (optional)
  prevStatus,      // lead status before this call (to detect upgrades)
}: UpdateAgentProductivityArgs) {
  if (!userId) return;

  // Derive today's date in IST (UTC+5:30)
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const todayStr = nowIST.toISOString().split("T")[0];
  const docId = `${userId}_${todayStr}`;

  // Determine counter increments
  const bookedStatuses = ["booked", "reserved"];
  const wasBooked = bookedStatuses.includes(prevStatus);
  const isNowBooked = bookedStatuses.includes(newStatus);
  const wasInterested = prevStatus === "interested";
  const isNowInterested = newStatus === "interested";

  const callCount = 1;
  const talkTime = duration && duration > 0 ? duration : 0;
  const bookCount = isNowBooked && !wasBooked ? 1 : 0;
  const interestCount = isNowInterested && !wasInterested ? 1 : 0;
  const activeTime = new Date().toISOString();

  await AgentProductivityRepository.incrementTelemetry(
    docId,
    callCount,
    talkTime,
    bookCount,
    interestCount,
    activeTime
  );
}
