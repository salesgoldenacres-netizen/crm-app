import React, { useState, useEffect } from "react";
import { User, AuditLog, Branding, SavedTheme } from "@/shared/types";
import { uploadFile } from "@/shared/utils/uploadFile";
import { BRAND_PALETTE } from "@/shared/constants/brandPalette";

interface UseBrandingSettingsProps {
  branding: Branding | undefined;
  brandingLoaded?: boolean;
  updateBranding: (brandingData: Partial<Branding>) => Promise<void>;
  logAuditEvent: (eventData: Partial<AuditLog>) => Promise<void>;
  user: User;
}

const defaultTheme: Branding = {
  companyName: "Golden Acres Portal",
  logoUrl: "",
  tagline: "Your Premium Real Estate Solution",
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
};

function mapBranding(branding?: Branding): Branding {
  return {
    companyName: branding?.companyName || defaultTheme.companyName,
    logoUrl: branding?.logoUrl || defaultTheme.logoUrl,
    tagline: branding?.tagline || defaultTheme.tagline,
    primaryColor: branding?.primaryColor || defaultTheme.primaryColor,
    secondaryColor: branding?.secondaryColor || defaultTheme.secondaryColor,
    accentColor: branding?.accentColor || defaultTheme.accentColor,
    sidebarColor: branding?.sidebarColor || defaultTheme.sidebarColor,
    headerColor: branding?.headerColor || defaultTheme.headerColor,
    backgroundColor: branding?.backgroundColor || defaultTheme.backgroundColor,
    cardBackground: branding?.cardBackground || defaultTheme.cardBackground,
    borderColor: branding?.borderColor || defaultTheme.borderColor,
    textPrimary: branding?.textPrimary || defaultTheme.textPrimary,
    textSecondary: branding?.textSecondary || defaultTheme.textSecondary,
    successColor: branding?.successColor || defaultTheme.successColor,
    warningColor: branding?.warningColor || defaultTheme.warningColor,
    dangerColor: branding?.dangerColor || defaultTheme.dangerColor,
    infoColor: branding?.infoColor || defaultTheme.infoColor,
    typography: branding?.typography || defaultTheme.typography,
    fontSize: branding?.fontSize !== undefined ? Number(branding.fontSize) : defaultTheme.fontSize,
    borderRadius:
      branding?.borderRadius !== undefined ? Number(branding.borderRadius) : defaultTheme.borderRadius,
    shadowIntensity:
      branding?.shadowIntensity !== undefined
        ? Number(branding.shadowIntensity)
        : defaultTheme.shadowIntensity,
    roundedCards:
      branding?.roundedCards !== undefined ? !!branding.roundedCards : defaultTheme.roundedCards,
    glassmorphism:
      branding?.glassmorphism !== undefined ? !!branding.glassmorphism : defaultTheme.glassmorphism,
    compactMode:
      branding?.compactMode !== undefined ? !!branding.compactMode : defaultTheme.compactMode,
    darkSidebar:
      branding?.darkSidebar !== undefined ? !!branding.darkSidebar : defaultTheme.darkSidebar,
    stickyHeader:
      branding?.stickyHeader !== undefined ? !!branding.stickyHeader : defaultTheme.stickyHeader,
    animations: branding?.animations !== undefined ? !!branding.animations : defaultTheme.animations,
    customCss: branding?.customCss || defaultTheme.customCss,
  };
}

export function useBrandingSettings({
  branding,
  brandingLoaded = true,
  updateBranding,
  logAuditEvent,
  user,
}: UseBrandingSettingsProps) {
  const [brandingForm, setBrandingForm] = useState<Branding>(() => mapBranding(branding));
  const [hydrated, setHydrated] = useState(false);
  const [history, setHistory] = useState<Branding[]>(() => [mapBranding(branding)]);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    if (!brandingLoaded || hydrated) return;
    const mapped = mapBranding(branding);
    const timer = window.setTimeout(() => {
      setBrandingForm(mapped);
      setHistory([mapped]);
      setHistoryIndex(0);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [branding, brandingLoaded, hydrated]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    identity: true,
    presets: false,
    colors: false,
    status: false,
    typography: false,
    layout: false,
    advanced: false,
  });

  const toggleSection = (sect: string) => {
    setOpenSections((prev) => ({ ...prev, [sect]: !prev[sect] }));
  };

  const savedThemes = branding?.savedThemes || [];
  const [activePreset, setActivePreset] = useState("custom");
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [previewTab, setPreviewTab] = useState("dashboard");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [previewMode, setPreviewMode] = useState("light");

  /** Org brand starter packs — identity colors + type. Surfaces follow appearance. */
  const presets: Record<string, Partial<Branding> & { name: string }> = {
    goldenAcres: {
      name: "Golden Acres",
      primaryColor: BRAND_PALETTE.primary,
      secondaryColor: BRAND_PALETTE.secondary,
      accentColor: BRAND_PALETTE.accent,
      sidebarColor: BRAND_PALETTE.sidebar,
      backgroundColor: BRAND_PALETTE.background,
      borderColor: BRAND_PALETTE.border,
      successColor: BRAND_PALETTE.success,
      warningColor: BRAND_PALETTE.warning,
      dangerColor: BRAND_PALETTE.danger,
      infoColor: BRAND_PALETTE.info,
      typography: "Outfit",
      borderRadius: 10,
      shadowIntensity: 4,
      roundedCards: true,
    },
    corporate: {
      name: "Corporate Blue",
      primaryColor: "#0284c7",
      secondaryColor: "#0f172a",
      accentColor: "#38bdf8",
      successColor: "#10b981",
      warningColor: "#eab308",
      dangerColor: "#ef4444",
      infoColor: "#3b82f6",
      typography: "Inter",
      borderRadius: 8,
      shadowIntensity: 4,
      roundedCards: true,
    },
    emerald: {
      name: "Emerald Green",
      primaryColor: "#059669",
      secondaryColor: "#064e3b",
      accentColor: "#34d399",
      successColor: "#10b981",
      warningColor: "#ca8a04",
      dangerColor: "#dc2626",
      infoColor: "#2563eb",
      typography: "Outfit",
      borderRadius: 12,
      shadowIntensity: 5,
      roundedCards: true,
    },
    royal: {
      name: "Royal Purple",
      primaryColor: "#7c3aed",
      secondaryColor: "#1e1b4b",
      accentColor: "#a78bfa",
      successColor: "#10b981",
      warningColor: "#eab308",
      dangerColor: "#ef4444",
      infoColor: "#3b82f6",
      typography: "Poppins",
      borderRadius: 16,
      shadowIntensity: 6,
      roundedCards: true,
    },
    sunset: {
      name: "Sunset Orange",
      primaryColor: "#ea580c",
      secondaryColor: "#7c2d12",
      accentColor: "#fb923c",
      successColor: "#16a34a",
      warningColor: "#d97706",
      dangerColor: "#dc2626",
      infoColor: "#2563eb",
      typography: "Outfit",
      borderRadius: 8,
      shadowIntensity: 4,
      roundedCards: true,
    },
    midnight: {
      name: "Midnight Indigo",
      primaryColor: "#6366f1",
      secondaryColor: "#1e1b4b",
      accentColor: "#818cf8",
      successColor: "#34d399",
      warningColor: "#fbbf24",
      dangerColor: "#f87171",
      infoColor: "#60a5fa",
      typography: "Inter",
      borderRadius: 10,
      shadowIntensity: 10,
      roundedCards: true,
    },
  };

  const updateState = (fields: Partial<Branding>) => {
    setBrandingForm((prev) => {
      const nextForm = { ...prev, ...fields };
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(nextForm);
      if (newHistory.length > 30) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      return nextForm;
    });
    setActivePreset("custom");
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setBrandingForm(history[idx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setBrandingForm(history[idx]);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadFile("branding", file);
      updateState({ logoUrl: url });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Logo upload failed: " + msg);
    } finally {
      setUploadingLogo(false);
    }
  };

  const applyPreset = (key: string) => {
    setActivePreset(key);
    if (presets[key]) {
      updateState(presets[key]);
    }
  };

  const handleSaveTheme = async () => {
    const name = prompt("Enter a name for this theme layout:", "My Theme");
    if (!name) return;

    const newTheme: SavedTheme = {
      id: Date.now().toString(),
      name,
      ...brandingForm,
    };

    const updatedSavedThemes = [...savedThemes, newTheme];
    try {
      await updateBranding({
        ...branding,
        savedThemes: updatedSavedThemes,
      });
      alert("Theme saved successfully to library!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Failed to save theme: " + msg);
    }
  };

  const handleDuplicateTheme = async (theme: SavedTheme) => {
    const name = prompt("Duplicate name:", `${theme.name} (Copy)`);
    if (!name) return;

    const newTheme: SavedTheme = {
      ...theme,
      id: Date.now().toString(),
      name,
    };

    const updatedSavedThemes = [...savedThemes, newTheme];
    try {
      await updateBranding({
        ...branding,
        savedThemes: updatedSavedThemes,
      });
      alert("Theme duplicated!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Duplicate failed: " + msg);
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    if (!confirm("Are you sure you want to delete this theme?")) return;

    const updatedSavedThemes = savedThemes.filter((t) => t.id !== themeId);
    try {
      await updateBranding({
        ...branding,
        savedThemes: updatedSavedThemes,
      });
      if (selectedThemeId === themeId) setSelectedThemeId(null);
      alert("Theme deleted!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Delete failed: " + msg);
    }
  };

  const loadSavedTheme = (theme: SavedTheme) => {
    setSelectedThemeId(theme.id);
    setActivePreset("custom");
    const mapped = mapBranding(theme as unknown as Branding);
    setBrandingForm(mapped);
    setHistory((hist) => {
      const next = [...hist.slice(0, historyIndex + 1), mapped];
      setHistoryIndex(next.length - 1);
      return next;
    });
  };

  const handlePublish = async () => {
    try {
      await updateBranding({
        ...branding,
        ...brandingForm,
        savedThemes: branding?.savedThemes || [],
      });
      await logAuditEvent({
        action: "Publish Theme",
        details: `Published custom theme globally. Company: ${brandingForm.companyName}`,
        user: user.username,
      });
      alert(
        "Brand published. Accent, status colors, fonts, and logo apply app-wide. Light/Dark stays under Appearance."
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Failed to publish theme: " + msg);
    }
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(brandingForm, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brandingForm.companyName.toLowerCase().replace(/ /g, "_")}_theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const resultStr = event.target?.result;
        if (typeof resultStr !== "string") return;
        const parsed = JSON.parse(resultStr);
        updateState(parsed);
        alert("Theme configuration imported successfully!");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        alert("Invalid JSON format: " + msg);
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm("Reset customizer to default brand colors?")) {
      updateState(defaultTheme);
    }
  };

  return {
    brandingForm,
    updateBranding,
    updateState,
    openSections,
    toggleSection,
    savedThemes,
    activePreset,
    selectedThemeId,
    history,
    historyIndex,
    uploadingLogo,
    previewTab,
    setPreviewTab,
    previewDevice,
    setPreviewDevice,
    previewMode,
    setPreviewMode,
    presets,
    handleUndo,
    handleRedo,
    handleLogoUpload,
    applyPreset,
    handleSaveTheme,
    handleDuplicateTheme,
    handleDeleteTheme,
    loadSavedTheme,
    handlePublish,
    handleExportJSON,
    handleImportJSON,
    handleReset,
  };
}
