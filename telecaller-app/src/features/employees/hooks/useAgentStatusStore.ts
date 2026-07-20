import { useState, useEffect } from "react";
import { logger } from "@/shared/utils/logger";
import { AgentStatusRecord } from "@/shared/types";
import { AgentStatusRepository } from "@/shared/services/firebase/repositories";

export function useAgentStatusStore() {
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatusRecord>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = AgentStatusRepository.subscribe(
      (data) => {
        setAgentStatuses(data);
        setIsLoaded(true);
      },
      (err) => {
        logger.error("AgentStatusStore", "Error listening to agent statuses", err);
      }
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
