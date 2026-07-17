import { useState, useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { logger } from "@/shared/utils/logger";
import { AuditLog } from "@/shared/types";
import { AuditLogsRepository } from "@/shared/services/firebase/repositories";
import { buildAuditLogsListQuery } from "@/shared/contracts";

export interface UseAuditLogsStoreOptions {
  /**
   * When true, subscribe to the bounded audit list query.
   * Default false — write-only (`logAuditEvent`) for Dashboard / non-audit tabs.
   * Enable only on Audit UI (e.g. Admin Settings → Audit).
   */
  subscribeToList?: boolean;
  /** Max docs for the list listener (default 100 via contract). */
  listLimit?: number;
}

/**
 * Hook to interface with audit log events in Firestore.
 * List subscription is opt-in; writes always go through AuditLogsRepository.
 */
export function useAuditLogsStore(options: UseAuditLogsStoreOptions = {}) {
  const { subscribeToList = false, listLimit } = options;
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(!subscribeToList);

  useEffect(() => {
    if (!subscribeToList) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuditLogs([]);
      setIsLoaded(true);
      return;
    }

    const listQuery = buildAuditLogsListQuery(
      listLimit != null ? { limit: listLimit } : {},
    );

    const unsubscribe = onSnapshot(
      listQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setAuditLogs([]);
          setIsLoaded(true);
          return;
        }
        const logs: AuditLog[] = [];
        snapshot.forEach((d) =>
          logs.push({ id: d.id, ...d.data() } as AuditLog),
        );
        // Query orders by timestamp desc; keep client fallback sort
        logs.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        setAuditLogs(logs);
        setIsLoaded(true);
      },
      (err) =>
        logger.error("AuditLogsStore", "Error listening to audit logs", err),
    );
    return () => unsubscribe();
  }, [subscribeToList, listLimit]);

  const logAuditEvent = async (event: Partial<AuditLog>): Promise<void> => {
    const newId = Date.now().toString();
    try {
      const newLog: AuditLog = {
        id: newId,
        timestamp: new Date().toISOString(),
        action: event.action || "Unknown Action",
        details: event.details || "",
        user: event.user || "system",
        changes: event.changes || null,
      };
      await AuditLogsRepository.add(newLog);
    } catch (err) {
      logger.error("AuditLogsStore", "Failed to write audit log event", err);
    }
  };

  return { auditLogs, isLoaded, logAuditEvent };
}
