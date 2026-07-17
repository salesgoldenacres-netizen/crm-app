import { useState, useEffect } from "react";
import { logger } from "@/shared/utils/logger";
import { AgentStatusRecord } from "@/shared/types";
import { AgentStatusRepository } from "@/shared/services/firebase/repositories";
import { subscribeSharedListener } from "@/shared/services/firebase/sharedListener";
import { attachAgentStatusesSnapshot } from "@/shared/services/firebase/sharedSnapshots";

const AGENT_STATUS_LISTENER_KEY = "agentStatuses";

/**
 * Hook to manage real-time agent status tracking in Firestore.
 * Listens to dynamic updates representing call status (e.g. busy, on break, available)
 * across the entire telecalling roster for live administration monitoring.
 * Uses a ref-counted shared listener so nested mounts share one onSnapshot.
 */
export function useAgentStatusStore() {
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatusRecord>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    return subscribeSharedListener<Record<string, AgentStatusRecord>>(
      AGENT_STATUS_LISTENER_KEY,
      {},
      (emit) =>
        attachAgentStatusesSnapshot(emit, (err) =>
          logger.error("AgentStatusStore", "Error listening to agent statuses", err),
        ),
      ({ data, isLoaded: loaded }) => {
        setAgentStatuses(data);
        setIsLoaded(loaded);
      },
    );
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
