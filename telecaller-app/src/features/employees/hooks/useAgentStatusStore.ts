import { useState, useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { logger } from "@/shared/utils/logger";
import { AgentStatusRecord } from "@/shared/types";
import { agentStatusRef } from "@/shared/services/firebase/converters";
import { AgentStatusRepository } from "@/shared/services/firebase/repositories";

/**
 * Hook to manage real-time agent status tracking in Firestore.
 * Listens to dynamic updates representing call status (e.g. busy, on break, available)
 * across the entire telecalling roster for live administration monitoring.
 */
export function useAgentStatusStore() {
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatusRecord>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      agentStatusRef,
      (snapshot) => {
        const statuses: Record<string, AgentStatusRecord> = {};
        snapshot.forEach((d) => {
          statuses[d.id] = d.data();
        });
        setAgentStatuses(statuses);
        setIsLoaded(true);
      },
      (err) => logger.error("AgentStatusStore", "Error listening to agent statuses", err)
    );
    return () => unsubscribe();
  }, []);

  const updateAgentStatus = async (
    userId: string,
    status: string,
    username: string,
    extraFields: Record<string, unknown> = {}
  ): Promise<void> => {
    try {
      const statusRecord: AgentStatusRecord = {
        userId,
        username,
        status,
        updatedAt: new Date().toISOString(),
        ...extraFields,
      };
      await AgentStatusRepository.set(userId, statusRecord);
    } catch (err) {
      logger.error("AgentStatusStore", `Failed to update agent status for user ${userId}`, err);
    }
  };

  return { agentStatuses, isLoaded, updateAgentStatus };
}
