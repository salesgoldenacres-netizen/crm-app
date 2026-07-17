/** Golden Acres brand palette — deep green + warm gold (land / real-estate). */
export const BRAND_PALETTE = {
  primary: "#2E7D32",
  primaryHover: "#256A2A",
  secondary: "#c9a227",
  secondaryHover: "#b8921f",
  accent: "#2E7D32",
  sidebar: "#0b1a16",
  header: "#ffffff",
  background: "#f3f6f4",
  card: "#ffffff",
  border: "#A5D6A7",
  textPrimary: "#0f172a",
  textSecondary: "#5a6b63",
  success: "#43A047",
  warning: "#c9a227",
  danger: "#ef4444",
  info: "#2E7D32",
} as const;

/** Legacy indigo defaults that should be migrated to the gold/green palette. */
const LEGACY_PRIMARY = new Set([
  "#4f46e5",
  "#4338ca",
  "#6366f1",
  "#312e81",
  "#1e1b4b",
]);

export function isLegacyIndigoPrimary(hex: string | undefined | null): boolean {
  if (!hex) return true;
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
    cardBackground: BRAND_PALETTE.card,
    borderColor: BRAND_PALETTE.border,
    textPrimary: BRAND_PALETTE.textPrimary,
    textSecondary: BRAND_PALETTE.textSecondary,
    successColor: BRAND_PALETTE.success,
    warningColor: BRAND_PALETTE.warning,
    dangerColor: BRAND_PALETTE.danger,
    infoColor: BRAND_PALETTE.info,
  };
}
