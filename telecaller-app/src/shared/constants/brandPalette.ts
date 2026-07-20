/** Golden Acres brand palette — deep green + warm gold (land / real-estate). */
export const BRAND_PALETTE = {
  primary: "#2E7D32",
  primaryHover: "#256A2A",
  secondary: "#C4A032",
  secondaryHover: "#B08F2A",
  accent: "#2E7D32",
  sidebar: "#0c1b17",
  header: "#fcfdfc",
  background: "#f1f5f2",
  surface: "#e5ece7",
  card: "#fcfdfc",
  border: "#d7e1db",
  ring: "#c2d9cf",
  textPrimary: "#15201c",
  textSecondary: "#5f7269",
  success: "#3D9B4A",
  warning: "#C4A032",
  danger: "#D65C5C",
  info: "#2A7D8C",
  /** Dark appearance — inviting forest defaults (fully overridable). */
  darkBackground: "#0c1b17",
  darkSurface: "#143028",
  darkCard: "#17352c",
  darkBorder: "#23453c",
  darkRing: "#1a6b58",
  darkTextPrimary: "#eef3f0",
  darkTextSecondary: "#a0b3aa",
  darkSidebar: "#06120f",
  darkHeader: "#143028",
} as const;

/**
 * Bump when default inviting palette semantics change and legacy indigo
 * docs should be one-shot migrated. Admin publishes always stamp this so
 * intentional indigo (e.g. Midnight preset) is never remapped.
 */
export const BRAND_PALETTE_VERSION = 2;

/** Legacy indigo defaults that should be migrated to the gold/green palette. */
const LEGACY_PRIMARY = new Set([
  "#4f46e5",
  "#4338ca",
  "#6366f1",
  "#312e81",
  "#1e1b4b",
]);

export function isLegacyIndigoPrimary(hex: string | undefined | null): boolean {
  if (!hex) return false;
  return LEGACY_PRIMARY.has(String(hex).trim().toLowerCase());
}

export function brandPalettePatch() {
  return {
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
    successColor: BRAND_PALETTE.success,
    warningColor: BRAND_PALETTE.warning,
    dangerColor: BRAND_PALETTE.danger,
    infoColor: BRAND_PALETTE.info,
    darkBackgroundColor: BRAND_PALETTE.darkBackground,
    darkSurfaceColor: BRAND_PALETTE.darkSurface,
    darkCardBackground: BRAND_PALETTE.darkCard,
    darkBorderColor: BRAND_PALETTE.darkBorder,
    darkRingColor: BRAND_PALETTE.darkRing,
    darkTextPrimary: BRAND_PALETTE.darkTextPrimary,
    darkTextSecondary: BRAND_PALETTE.darkTextSecondary,
    darkSidebarColor: BRAND_PALETTE.darkSidebar,
    darkHeaderColor: BRAND_PALETTE.darkHeader,
    brandPaletteVersion: BRAND_PALETTE_VERSION,
  };
}

export type BrandSurfaceMode = "light" | "dark";

export interface BrandStructuralTokens {
  "--theme-bg": string;
  "--theme-surface": string;
  "--theme-card": string;
  "--theme-text": string;
  "--theme-muted": string;
  "--theme-border": string;
  "--theme-ring": string;
  "--theme-overlay": string;
}

/** Resolve appearance structural tokens from branding (with forest/sage defaults). */
export function resolveStructuralTokens(
  branding: {
    backgroundColor?: string;
    surfaceColor?: string;
    cardBackground?: string;
    borderColor?: string;
    ringColor?: string;
    textPrimary?: string;
    textSecondary?: string;
    darkBackgroundColor?: string;
    darkSurfaceColor?: string;
    darkCardBackground?: string;
    darkBorderColor?: string;
    darkRingColor?: string;
    darkTextPrimary?: string;
    darkTextSecondary?: string;
  },
  mode: BrandSurfaceMode,
): BrandStructuralTokens {
  if (mode === "dark") {
    const bg = branding.darkBackgroundColor || BRAND_PALETTE.darkBackground;
    return {
      "--theme-bg": bg,
      "--theme-surface": branding.darkSurfaceColor || BRAND_PALETTE.darkSurface,
      "--theme-card": branding.darkCardBackground || BRAND_PALETTE.darkCard,
      "--theme-text": branding.darkTextPrimary || BRAND_PALETTE.darkTextPrimary,
      "--theme-muted": branding.darkTextSecondary || BRAND_PALETTE.darkTextSecondary,
      "--theme-border": branding.darkBorderColor || BRAND_PALETTE.darkBorder,
      "--theme-ring": branding.darkRingColor || BRAND_PALETTE.darkRing,
      "--theme-overlay": "rgba(2, 12, 10, 0.65)",
    };
  }
  return {
    "--theme-bg": branding.backgroundColor || BRAND_PALETTE.background,
    "--theme-surface": branding.surfaceColor || BRAND_PALETTE.surface,
    "--theme-card": branding.cardBackground || BRAND_PALETTE.card,
    "--theme-text": branding.textPrimary || BRAND_PALETTE.textPrimary,
    "--theme-muted": branding.textSecondary || BRAND_PALETTE.textSecondary,
    "--theme-border": branding.borderColor || BRAND_PALETTE.border,
    "--theme-ring": branding.ringColor || BRAND_PALETTE.ring,
    "--theme-overlay": "rgba(15, 32, 28, 0.42)",
  };
}
