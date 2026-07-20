/**
 * React binding for LeadQueryService.
 * Filter/search changes reset cursor to page 1 (same service path).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { CustomRole, Lead, User } from "@/shared/types";
import { LeadQueryService } from "@/shared/services/leads/LeadQueryService";
import {
  leadQuerySpecCacheKey,
  type LeadQuerySpec,
} from "@/shared/services/leads/leadQueryTypes";
import type { CursorToken } from "@/shared/services/performance/pagination/contracts/CursorToken";
import { logger } from "@/shared/utils/logger";

export interface UseLeadQueryResult {
  items: Lead[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageSize: number;
  /** Opaque cursor for the current page (undefined = page 1). */
  cursor: CursorToken | undefined;
  nextPage: () => void;
  previousPage: () => void;
  refresh: () => void;
  /** Spec key currently loaded (for diagnostics). */
  specKey: string;
}

export function useLeadQuery(
  user: User | null | undefined,
  customRoles: CustomRole[],
  spec: LeadQuerySpec | null,
): UseLeadQueryResult {
  const [items, setItems] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [cursor, setCursor] = useState<CursorToken | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<CursorToken | undefined>(
    undefined,
  );
  const [cursorStack, setCursorStack] = useState<CursorToken[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  const serviceRef = useRef<LeadQueryService | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const specKey = spec ? leadQuerySpecCacheKey(spec) : "";
  const prevSpecKeyRef = useRef<string>("");

  useEffect(() => {
    if (!user) {
      serviceRef.current = null;
      return;
    }
    serviceRef.current = new LeadQueryService(user, customRoles);
  }, [user, customRoles]);

  // Reset to page 1 when query spec changes (filters / search / sort / pageSize)
  useEffect(() => {
    if (!specKey) return;
    if (prevSpecKeyRef.current && prevSpecKeyRef.current !== specKey) {
      setCursor(undefined);
      setCursorStack([]);
      setNextCursor(undefined);
      serviceRef.current?.resetToFirstPage();
    }
    prevSpecKeyRef.current = specKey;
  }, [specKey]);

  useEffect(() => {
    if (!user || !spec || !serviceRef.current) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const service = serviceRef.current;

    if (hasLoadedOnceRef.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    void (async () => {
      try {
        const page = await service.fetchPage(spec, cursor);
        if (cancelled) return;
        setItems([...page.items]);
        setHasNextPage(page.hasNextPage);
        setHasPreviousPage(!!cursor || cursorStack.length > 0);
        setNextCursor(page.nextCursor);
        hasLoadedOnceRef.current = true;
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load leads";
        logger.error("useLeadQuery", message, err);
        setError(message);
        setItems([]);
        setHasNextPage(false);
        setHasPreviousPage(false);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, spec, cursor, reloadToken, customRoles, cursorStack.length]);

  const nextPage = useCallback(() => {
    if (!nextCursor) return;
    if (cursor) {
      setCursorStack((stack) => [...stack, cursor]);
    }
    setCursor(nextCursor);
  }, [nextCursor, cursor]);

  const previousPage = useCallback(() => {
    if (cursorStack.length === 0) {
      setCursor(undefined);
      return;
    }
    const prev = cursorStack[cursorStack.length - 1];
    setCursorStack((stack) => stack.slice(0, -1));
    setCursor(prev);
  }, [cursorStack]);

  const refresh = useCallback(() => {
    serviceRef.current?.invalidateProject(spec?.server.projectId);
    setReloadToken((t) => t + 1);
  }, [spec?.server.projectId]);

  return {
    items,
    isLoading,
    isRefreshing,
    error,
    hasNextPage,
    hasPreviousPage,
    pageSize: spec?.pageSize ?? 25,
    cursor,
    nextPage,
    previousPage,
    refresh,
    specKey,
  };
}
