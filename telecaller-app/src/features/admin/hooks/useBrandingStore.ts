import { useState, useEffect } from "react";
import { Branding } from "@/shared/types";
import { SettingsRepository } from "@/shared/services/firebase/repositories";
import {
  BRAND_PALETTE,
  BRAND_PALETTE_VERSION,
  brandPalettePatch,
  isLegacyIndigoPrimary,
  resolveStructuralTokens,
} from "@/shared/constants/brandPalette";
import { APPEARANCE_CHANGED_EVENT } from "@/features/settings/hooks/useThemeStore";

/** Module-level so shared listener migrates at most once across mounts. */
let brandingMigrated = false;
/** Local cache so login / boot screens theme before Firestore snapshot. */
const BRANDING_CACHE_KEY = "ga_branding_cache";

/** Latest applied branding — re-used when appearance (light/dark) flips. */
let latestBranding: Branding | null = null;

const DEFAULT_BRANDING: Branding = {
  companyName: "Golden Acres Portal",
  logoUrl: "",
  tagline: "",
  primaryColor: BRAND_PALETTE.primary,
  secondaryColor: BRAND_PALETTE.secondary,
  accentColor: BRAND_PALETTE.accent,
  sidebarColor: BRAND_PALETTE.sidebar,
  headerColor: BRAND_PALETTE.header,
  backgroundColor: BRAND_PALETTE.background,
  surfaceColor: BRAND_PALETTE.surface,
  cardBackground: BRAND_PALETTE.card,
  borderColor: BRAND_PALETTE.border,
  ringColor: BRAND_PALETTE.ring,
  textPrimary: BRAND_PALETTE.textPrimary,
  textSecondary: BRAND_PALETTE.textSecondary,
  darkBackgroundColor: BRAND_PALETTE.darkBackground,
  darkSurfaceColor: BRAND_PALETTE.darkSurface,
  darkCardBackground: BRAND_PALETTE.darkCard,
  darkBorderColor: BRAND_PALETTE.darkBorder,
  darkRingColor: BRAND_PALETTE.darkRing,
  darkTextPrimary: BRAND_PALETTE.darkTextPrimary,
  darkTextSecondary: BRAND_PALETTE.darkTextSecondary,
  darkSidebarColor: BRAND_PALETTE.darkSidebar,
  darkHeaderColor: BRAND_PALETTE.darkHeader,
  successColor: BRAND_PALETTE.success,
  warningColor: BRAND_PALETTE.warning,
  dangerColor: BRAND_PALETTE.danger,
  infoColor: BRAND_PALETTE.info,
  typography: "Inter",
  fontSize: 14,
  borderRadius: 12,
  shadowIntensity: 4,
  roundedCards: true,
  glassmorphism: false,
  compactMode: false,
  darkSidebar: true,
  stickyHeader: true,
  animations: true,
  customCss: "",
  savedThemes: [],
  brandPaletteVersion: BRAND_PALETTE_VERSION,
};

function hexOr(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function adjustColor(hex: string, percent: number): string {
  try {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);
    R = Math.min(255, Math.max(0, Math.round((R * (100 + percent)) / 100)));
    G = Math.min(255, Math.max(0, Math.round((G * (100 + percent)) / 100)));
    B = Math.min(255, Math.max(0, Math.round((B * (100 + percent)) / 100)));
    return `#${R.toString(16).padStart(2, "0")}${G.toString(16).padStart(2, "0")}${B.toString(16).padStart(2, "0")}`;
  } catch {
    return hex;
  }
}

function hexToRgba(hex: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(46, 125, 50, ${alpha})`;
  const R = parseInt(hex.substring(1, 3), 16);
  const G = parseInt(hex.substring(3, 5), 16);
  const B = parseInt(hex.substring(5, 7), 16);
  return `rgba(${R}, ${G}, ${B}, ${alpha})`;
}

function mapBrandingDoc(data: Record<string, any>): Branding {
  const rawPrimary = data.primaryColor as string | undefined;
  const docVersion = Number(data.brandPaletteVersion) || 0;

  let primary = hexOr(rawPrimary, BRAND_PALETTE.primary);
  let secondary = hexOr(data.secondaryColor, BRAND_PALETTE.secondary);
  let accent = hexOr(data.accentColor, BRAND_PALETTE.accent);
  let sidebar = hexOr(data.sidebarColor, BRAND_PALETTE.sidebar);
  let header = hexOr(data.headerColor, BRAND_PALETTE.header);
  let bg = hexOr(data.backgroundColor, BRAND_PALETTE.background);
  let surface = hexOr(data.surfaceColor, BRAND_PALETTE.surface);
  let cardBg = hexOr(data.cardBackground, BRAND_PALETTE.card);
  let border = hexOr(data.borderColor, BRAND_PALETTE.border);
  let ring = hexOr(data.ringColor, BRAND_PALETTE.ring);
  let textP = hexOr(data.textPrimary, BRAND_PALETTE.textPrimary);
  let textS = hexOr(data.textSecondary, BRAND_PALETTE.textSecondary);
  let darkBg = hexOr(data.darkBackgroundColor, BRAND_PALETTE.darkBackground);
  let darkSurface = hexOr(data.darkSurfaceColor, BRAND_PALETTE.darkSurface);
  let darkCard = hexOr(data.darkCardBackground, BRAND_PALETTE.darkCard);
  let darkBorder = hexOr(data.darkBorderColor, BRAND_PALETTE.darkBorder);
  let darkRing = hexOr(data.darkRingColor, BRAND_PALETTE.darkRing);
  let darkTextP = hexOr(data.darkTextPrimary, BRAND_PALETTE.darkTextPrimary);
  let darkTextS = hexOr(data.darkTextSecondary, BRAND_PALETTE.darkTextSecondary);
  let darkSidebar = hexOr(data.darkSidebarColor, BRAND_PALETTE.darkSidebar);
  let darkHeader = hexOr(data.darkHeaderColor, BRAND_PALETTE.darkHeader);
  const success = hexOr(data.successColor, BRAND_PALETTE.success);
  let warning = hexOr(data.warningColor, BRAND_PALETTE.warning);
  const danger = hexOr(data.dangerColor, BRAND_PALETTE.danger);
  let info = hexOr(data.infoColor, BRAND_PALETTE.info);
  const customCss = typeof data.customCss === "string" ? data.customCss : "";

  // One-shot legacy indigo → inviting palette. Never remap after version stamp
  // (admin may intentionally publish Midnight Indigo / custom indigo).
  const needsLegacyMigrate =
    !brandingMigrated &&
    docVersion < BRAND_PALETTE_VERSION &&
    isLegacyIndigoPrimary(rawPrimary);

  if (needsLegacyMigrate) {
    brandingMigrated = true;
    const patch = brandPalettePatch();
    primary = patch.primaryColor;
    secondary = patch.secondaryColor;
    accent = patch.accentColor;
    sidebar = patch.sidebarColor;
    header = patch.headerColor;
    bg = patch.backgroundColor;
    surface = patch.surfaceColor;
    cardBg = patch.cardBackground;
    border = patch.borderColor;
    ring = patch.ringColor;
    textP = patch.textPrimary;
    textS = patch.textSecondary;
    darkBg = patch.darkBackgroundColor;
    darkSurface = patch.darkSurfaceColor;
    darkCard = patch.darkCardBackground;
    darkBorder = patch.darkBorderColor;
    darkRing = patch.darkRingColor;
    darkTextP = patch.darkTextPrimary;
    darkTextS = patch.darkTextSecondary;
    darkSidebar = patch.darkSidebarColor;
    darkHeader = patch.darkHeaderColor;
    warning = patch.warningColor;
    info = patch.infoColor;
    void SettingsRepository.setBranding(patch).catch((err) => {
      console.warn("Brand palette migrate failed", err);
      brandingMigrated = false;
    });
  }

  return {
    companyName: data.companyName || "Golden Acres Portal",
    logoUrl: data.logoUrl || "",
    tagline: data.tagline || "",
    primaryColor: primary,
    secondaryColor: secondary,
    accentColor: accent,
    sidebarColor: sidebar,
    headerColor: header,
    backgroundColor: bg,
    surfaceColor: surface,
    cardBackground: cardBg,
    borderColor: border,
    ringColor: ring,
    textPrimary: textP,
    textSecondary: textS,
    darkBackgroundColor: darkBg,
    darkSurfaceColor: darkSurface,
    darkCardBackground: darkCard,
    darkBorderColor: darkBorder,
    darkRingColor: darkRing,
    darkTextPrimary: darkTextP,
    darkTextSecondary: darkTextS,
    darkSidebarColor: darkSidebar,
    darkHeaderColor: darkHeader,
    successColor: success,
    warningColor: warning,
    dangerColor: danger,
    infoColor: info,
    typography: data.typography || "Inter",
    fontSize: data.fontSize !== undefined ? Number(data.fontSize) : 14,
    borderRadius:
      data.borderRadius !== undefined ? Number(data.borderRadius) : 12,
    shadowIntensity:
      data.shadowIntensity !== undefined ? Number(data.shadowIntensity) : 4,
    roundedCards: data.roundedCards !== undefined ? !!data.roundedCards : true,
    glassmorphism:
      data.glassmorphism !== undefined ? !!data.glassmorphism : false,
    compactMode: data.compactMode !== undefined ? !!data.compactMode : false,
    darkSidebar: data.darkSidebar !== undefined ? !!data.darkSidebar : true,
    stickyHeader: data.stickyHeader !== undefined ? !!data.stickyHeader : true,
    animations: data.animations !== undefined ? !!data.animations : true,
    customCss,
    savedThemes: Array.isArray(data.savedThemes) ? data.savedThemes : [],
    brandPaletteVersion: needsLegacyMigrate
      ? BRAND_PALETTE_VERSION
      : docVersion || undefined,
  };
}

function applyBrandingToDom(branding: Branding) {
  if (typeof window === "undefined") return;

  latestBranding = branding;

  const primary = hexOr(branding.primaryColor, BRAND_PALETTE.primary);
  const secondary = hexOr(branding.secondaryColor, BRAND_PALETTE.secondary);
  const accent = hexOr(branding.accentColor, BRAND_PALETTE.accent);
  const success = hexOr(branding.successColor, BRAND_PALETTE.success);
  const warning = hexOr(branding.warningColor, BRAND_PALETTE.warning);
  const danger = hexOr(branding.dangerColor, BRAND_PALETTE.danger);
  const info = hexOr(branding.infoColor, BRAND_PALETTE.info);
  const customCss = branding.customCss || "";
  const sidebarLight = hexOr(branding.sidebarColor, BRAND_PALETTE.sidebar);
  const sidebarDark = hexOr(branding.darkSidebarColor, BRAND_PALETTE.darkSidebar);

  const applyColor = (name: string, hex: string) => {
    document.documentElement.style.setProperty(`--${name}-color`, hex);
    document.documentElement.style.setProperty(
      `--${name}-color-hover`,
      adjustColor(hex, -15),
    );
    document.documentElement.style.setProperty(
      `--${name}-color-light`,
      adjustColor(hex, 40),
    );
    document.documentElement.style.setProperty(
      `--${name}-color-dark`,
      adjustColor(hex, -30),
    );
  };

  applyColor("primary", primary);
  applyColor("secondary", secondary);
  applyColor("accent", accent);
  applyColor("success", success);
  applyColor("warning", warning);
  applyColor("danger", danger);
  applyColor("info", info);

  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const mode = isDark ? "dark" : "light";
  const structural = resolveStructuralTokens(branding, mode);
  Object.entries(structural).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });

  const accentMuted = isDark ? `${primary}26` : adjustColor(primary, 40);
  root.style.setProperty("--theme-accent", primary);
  root.style.setProperty("--theme-accent-fg", "#ffffff");
  root.style.setProperty("--theme-accent-muted", accentMuted);
  root.style.setProperty("--theme-accent-text", primary);
  root.style.setProperty("--theme-accent-bg", accentMuted);
  root.style.setProperty("--theme-secondary", secondary);
  root.style.setProperty("--theme-success", success);
  root.style.setProperty("--theme-warning", warning);
  root.style.setProperty("--theme-danger", danger);
  root.style.setProperty("--theme-info", info);

  // Sidebar rail accent follows secondary (gold by default — fully editable)
  root.style.setProperty("--theme-sidebar-accent", secondary);
  root.style.setProperty(
    "--theme-sidebar-accent-muted",
    hexToRgba(secondary, 0.18),
  );

  const bg = structural["--theme-bg"];
  const sidebarBase = isDark ? sidebarDark : sidebarLight;
  root.style.setProperty(
    "--theme-canvas-gradient",
    [
      `radial-gradient(ellipse 85% 55% at 0% 0%, ${hexToRgba(primary, isDark ? 0.22 : 0.07)}, transparent 55%)`,
      `radial-gradient(ellipse 65% 45% at 100% 0%, ${hexToRgba(secondary, isDark ? 0.1 : 0.08)}, transparent 50%)`,
      `radial-gradient(ellipse 75% 55% at 50% 100%, ${hexToRgba(primary, isDark ? 0.14 : 0.04)}, transparent 55%)`,
      `linear-gradient(180deg, ${bg} 0%, ${adjustColor(bg, isDark ? 8 : -2)} 100%)`,
    ].join(", "),
  );
  root.style.setProperty(
    "--theme-sidebar-gradient",
    isDark
      ? `linear-gradient(180deg, ${adjustColor(sidebarBase, -20)} 0%, ${sidebarBase} 40%, ${adjustColor(primary, -25)} 100%)`
      : `linear-gradient(180deg, ${sidebarBase} 0%, ${adjustColor(primary, -10)} 55%, ${adjustColor(primary, -20)} 100%)`,
  );
  root.style.setProperty(
    "--theme-brand-gradient",
    `linear-gradient(135deg, ${primary} 0%, ${adjustColor(primary, 15)} 45%, ${secondary} 100%)`,
  );

  const selectedFont = branding.typography || "Inter";
  const fontStack = `'${selectedFont}', ui-sans-serif, system-ui, sans-serif`;
  root.style.setProperty("--font-family", fontStack);
  root.style.setProperty("--font-sans", fontStack);
  root.style.setProperty("--font-display", fontStack);
  root.style.setProperty("--font-size", `${branding.fontSize || 14}px`);
  root.style.setProperty(
    "--radius",
    `${branding.roundedCards ? branding.borderRadius || 12 : 0}px`,
  );
  root.style.setProperty(
    "--border-radius",
    `${branding.roundedCards ? branding.borderRadius || 12 : 0}px`,
  );

  const shadowOpacity =
    (branding.shadowIntensity !== undefined ? branding.shadowIntensity : 4) / 100;
  const shadowRgb = isDark ? "0, 0, 0" : "21, 40, 32";
  const boxShadow = `0 4px 14px -4px rgba(${shadowRgb}, ${shadowOpacity}), 0 2px 6px -2px rgba(${shadowRgb}, ${shadowOpacity * 0.65})`;
  root.style.setProperty("--box-shadow", boxShadow);
  root.style.setProperty("--elevation-md", boxShadow);

  if (selectedFont) {
    const fontId = "custom-google-font";
    let fontLink = document.getElementById(fontId) as HTMLLinkElement;
    if (!fontLink) {
      fontLink = document.createElement("link");
      fontLink.id = fontId;
      fontLink.rel = "stylesheet";
      document.head.appendChild(fontLink);
    }
    fontLink.href = `https://fonts.googleapis.com/css2?family=${selectedFont.replace(/ /g, "+")}:wght@300;400;500;600;700;800&display=swap`;
  }

  let styleTag = document.getElementById("custom-brand-css");
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "custom-brand-css";
    document.head.appendChild(styleTag);
  }
  styleTag.innerHTML = customCss;

  if (branding.logoUrl) {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = branding.logoUrl;
  }

  // Keep localStorage caches in sync for login / boot bootstrap (pre-auth)
  try {
    localStorage.setItem("theme_variables", JSON.stringify(structural));
    const cacheable: Partial<Branding> = { ...branding };
    delete cacheable.savedThemes;
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(cacheable));
  } catch {
    /* ignore quota */
  }
}

function readCachedBranding(): Branding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    // Merge through defaults — no Firestore migrate side-effects from cache
    return {
      ...DEFAULT_BRANDING,
      ...parsed,
      savedThemes: Array.isArray(parsed.savedThemes)
        ? (parsed.savedThemes as Branding["savedThemes"])
        : [],
    } as Branding;
  } catch {
    return null;
  }
}

// Re-apply brand identity + surfaces when light/dark flips
if (typeof window !== "undefined") {
  window.addEventListener(APPEARANCE_CHANGED_EVENT, () => {
    if (latestBranding) applyBrandingToDom(latestBranding);
  });

  // Immediate paint for login / auth loading before Firestore arrives
  const cached = readCachedBranding();
  if (cached) applyBrandingToDom(cached);
}

export function useBrandingStore() {
  const [branding, setBranding] = useState<Branding>(
    () => readCachedBranding() ?? DEFAULT_BRANDING,
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = SettingsRepository.subscribeBranding(
      (mapped) => {
        applyBrandingToDom(mapped);
        setBranding(mapped);
        setIsLoaded(true);
      },
      (data) => mapBrandingDoc(data),
      () => {
        if (!brandingMigrated) {
          brandingMigrated = true;
          void SettingsRepository.setBranding({
            ...DEFAULT_BRANDING,
            brandPaletteVersion: BRAND_PALETTE_VERSION,
          }).catch((err) => {
            console.warn("Brand palette seed failed", err);
            brandingMigrated = false;
          });
        }
        applyBrandingToDom(DEFAULT_BRANDING);
        return DEFAULT_BRANDING;
      }
    );
    return () => unsubscribe();
  }, []);

  const updateBranding = async (newBranding: Partial<Branding>) => {
    const base = latestBranding ?? DEFAULT_BRANDING;
    const merged: Branding = {
      ...base,
      ...newBranding,
      brandPaletteVersion: BRAND_PALETTE_VERSION,
    };
    // Optimistic live apply so Go Live feels instant (Firestore snapshot will confirm)
    applyBrandingToDom(merged);
    setBranding(merged);
    await SettingsRepository.setBranding({
      ...newBranding,
      brandPaletteVersion: BRAND_PALETTE_VERSION,
    });
  };

  return { branding, isLoaded, updateBranding };
}

