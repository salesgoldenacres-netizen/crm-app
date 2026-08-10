import { useState, useEffect } from "react";
import { ThemesRepository } from "@/shared/services/firebase/repositories";
import {
  BRAND_PALETTE,
  resolveStructuralTokens,
} from "@/shared/constants/brandPalette";
import type { Appearance, ResolvedMode } from "@/shared/types/theme";

export type { Appearance, ResolvedMode };

/** Fired after structural tokens + dark class are applied (branding re-syncs). */
export const APPEARANCE_CHANGED_EVENT = "ga:appearance-changed";

const APPEARANCE_KEY = "appearance";
const LEGACY_THEME_KEY = "theme";

/**
 * Bootstrap structural defaults (forest/sage). Branding Customizer overwrites
 * these via applyBrandingToDom after load / on APPEARANCE_CHANGED_EVENT.
 */
const STRUCTURAL_LIGHT = resolveStructuralTokens({}, "light");
const STRUCTURAL_DARK = resolveStructuralTokens({}, "dark");

const DEFAULT_ACCENT = BRAND_PALETTE.primary;

export function getSystemMode(): ResolvedMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveAppearance(appearance: Appearance): ResolvedMode {
  if (appearance === "system") return getSystemMode();
  return appearance;
}

function readStoredAppearance(): Appearance {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(APPEARANCE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  // Migrate legacy light/dark preference
  const legacy = localStorage.getItem(LEGACY_THEME_KEY);
  if (legacy === "light" || legacy === "dark") return legacy;
  return "system";
}

export function applyAppearance(appearance: Appearance): ResolvedMode {
  if (typeof window === "undefined") return "light";
  const root = document.documentElement;
  const resolved = resolveAppearance(appearance);

  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  const tokens = resolved === "dark" ? STRUCTURAL_DARK : STRUCTURAL_LIGHT;
  const varsToCache: Record<string, string> = {};
  Object.entries(tokens).forEach(([key, val]) => {
    root.style.setProperty(key, val);
    varsToCache[key] = val;
  });

  // Keep brand accent-muted readable when appearance flips
  const accent =
    getComputedStyle(root).getPropertyValue("--theme-accent").trim() || DEFAULT_ACCENT;
  if (resolved === "dark") {
    root.style.setProperty("--theme-accent-muted", `${accent}26`);
    root.style.setProperty("--theme-accent-bg", `${accent}26`);
  } else {
    // Lighten primary for muted chip backgrounds (same helper as branding store)
    try {
      let R = parseInt(accent.substring(1, 3), 16);
      let G = parseInt(accent.substring(3, 5), 16);
      let B = parseInt(accent.substring(5, 7), 16);
      R = Math.min(255, Math.max(0, Math.round((R * 140) / 100)));
      G = Math.min(255, Math.max(0, Math.round((G * 140) / 100)));
      B = Math.min(255, Math.max(0, Math.round((B * 140) / 100)));
      const muted = `#${R.toString(16).padStart(2, "0")}${G.toString(16).padStart(2, "0")}${B.toString(16).padStart(2, "0")}`;
      root.style.setProperty("--theme-accent-muted", muted);
      root.style.setProperty("--theme-accent-bg", muted);
    } catch {
      /* keep existing */
    }
  }

  localStorage.setItem("theme_variables", JSON.stringify(varsToCache));
  localStorage.setItem(APPEARANCE_KEY, appearance);
  // Keep legacy key in sync for older bootstrap paths
  localStorage.setItem(LEGACY_THEME_KEY, resolved);

  window.dispatchEvent(new CustomEvent(APPEARANCE_CHANGED_EVENT));

  return resolved;
}

interface AppearanceState {
  appearance: Appearance;
  resolved: ResolvedMode;
}

type AppearanceListener = (state: AppearanceState) => void;

const listeners = new Set<AppearanceListener>();
let activeUserId: string | undefined;

function notify(appearance: Appearance) {
  const resolved = applyAppearance(appearance);
  const state = { appearance, resolved };
  listeners.forEach((listener) => listener(state));
  return state;
}

async function persistAppearance(appearance: Appearance, userId?: string) {
  notify(appearance);
  const uid = userId ?? activeUserId;
  if (uid) {
    try {
      await ThemesRepository.set(uid, appearance);
    } catch (err) {
      console.error("Error updating appearance in Firestore: ", err);
    }
  }
}

// Module init + cross-tab sync
if (typeof window !== "undefined") {
  const initial = readStoredAppearance();
  applyAppearance(initial);

  window.addEventListener("storage", (e) => {
    if (e.key === APPEARANCE_KEY || e.key === LEGACY_THEME_KEY) {
      notify(readStoredAppearance());
    }
  });

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (readStoredAppearance() === "system") {
      notify("system");
    }
  };
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onSystemChange);
  } else {
    mq.addListener(onSystemChange);
  }
}

/**
 * Appearance store — owns Light / Dark / System and structural semantic tokens.
 * Branding is a separate writer (useBrandingStore).
 */
export function useAppearanceStore(userId?: string) {
  const [state, setState] = useState<AppearanceState>(() => {
    const appearance = readStoredAppearance();
    return {
      appearance,
      resolved: resolveAppearance(appearance),
    };
  });
  const [isLoaded, setIsLoaded] = useState(!userId);
  const [prevUserId, setPrevUserId] = useState(userId);

  if (userId !== prevUserId) {
    setPrevUserId(userId);
    setIsLoaded(!userId);
  }

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      notify(readStoredAppearance());
      return;
    }
    activeUserId = userId;
    const unsubscribe = ThemesRepository.subscribe(userId, (data) => {
      if (!data) {
        notify(readStoredAppearance());
        setIsLoaded(true);
        return;
      }
      let appearance: Appearance = "system";
      if (data.appearance === "light" || data.appearance === "dark" || data.appearance === "system") {
        appearance = data.appearance;
      } else {
        const legacy = data as { appearance?: Appearance; theme?: string };
        if (legacy.theme === "light" || legacy.theme === "dark") {
          appearance = legacy.theme;
        }
      }
      notify(appearance);
      setIsLoaded(true);
    });
    return () => {
      if (activeUserId === userId) activeUserId = undefined;
      unsubscribe();
    };
  }, [userId]);

  const updateAppearance = async (next: Appearance): Promise<void> => {
    await persistAppearance(next, userId);
  };

  return {
    appearance: state.appearance,
    resolved: state.resolved,
    /** @deprecated use `resolved` — kept for transitional callers */
    theme: state.resolved,
    isLoaded,
    updateAppearance,
    /** @deprecated use `updateAppearance` */
    updateTheme: updateAppearance,
  };
}

/** @deprecated use useAppearanceStore */
export const useThemeStore = useAppearanceStore;
