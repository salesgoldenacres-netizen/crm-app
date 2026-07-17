import { useCallback, useMemo, useState } from "react";
import {
  EMPTY_LEAD_LIST_FILTERS,
  LEAD_LIST_PRESETS,
  LeadListFilters,
  LeadListPresetId,
  buildLeadFilterChips,
  cloneLeadListFilters,
  matchLeadListPreset,
} from "@/features/leads/config/leadListFilterConfig";
import { User } from "@/shared/types";

export function useLeadListFilters(userId: string, todayStr: string) {
  const ctx = useMemo(() => ({ userId, todayStr }), [userId, todayStr]);

  const [draftFilters, setDraftFilters] = useState<LeadListFilters>(() =>
    cloneLeadListFilters(EMPTY_LEAD_LIST_FILTERS)
  );
  const [appliedFilters, setAppliedFilters] = useState<LeadListFilters>(() =>
    cloneLeadListFilters(EMPTY_LEAD_LIST_FILTERS)
  );

  const activePresetId = useMemo(
    () => matchLeadListPreset(appliedFilters, ctx),
    [appliedFilters, ctx]
  );

  const applySearch = useCallback(() => {
    setAppliedFilters(cloneLeadListFilters(draftFilters));
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    const empty = cloneLeadListFilters(EMPTY_LEAD_LIST_FILTERS);
    setDraftFilters(empty);
    setAppliedFilters(empty);
  }, []);

  const applyPreset = useCallback(
    (presetId: LeadListPresetId) => {
      const preset = LEAD_LIST_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      const next = cloneLeadListFilters(preset.build(ctx));
      setDraftFilters(next);
      setAppliedFilters(next);
    },
    [ctx]
  );

  const clearChip = useCallback((chip: { clear: (prev: LeadListFilters) => LeadListFilters }) => {
    setAppliedFilters((prev) => {
      const next = chip.clear(cloneLeadListFilters(prev));
      setDraftFilters(cloneLeadListFilters(next));
      return next;
    });
  }, []);

  const clearAllChips = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  const updateDraft = useCallback((patch: Partial<LeadListFilters>) => {
    setDraftFilters((prev) => ({
      ...prev,
      ...patch,
      statuses: patch.statuses ? [...patch.statuses] : prev.statuses,
    }));
  }, []);

  const getChips = useCallback(
    (users: User[], projectNames: Record<string, string>) =>
      buildLeadFilterChips(appliedFilters, { users, projectNames }),
    [appliedFilters]
  );

  return {
    draftFilters,
    appliedFilters,
    activePresetId,
    setDraftFilters,
    updateDraft,
    applySearch,
    resetFilters,
    applyPreset,
    clearChip,
    clearAllChips,
    getChips,
  };
}
