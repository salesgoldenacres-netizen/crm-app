import React, { useState, useEffect, useCallback } from "react";
import { User, AuditLog, Branding, SavedTheme } from "@/shared/types";
import { uploadFile } from "@/shared/utils/uploadFile";
import { BRAND_PALETTE } from "@/shared/constants/brandPalette";
import { useToast } from "@/shared/components/Toast";
import type { InteractionDialogState } from "@/shared/components/ui/InteractionDialog";

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
    surfaceColor: branding?.surfaceColor || defaultTheme.surfaceColor,
    cardBackground: branding?.cardBackground || defaultTheme.cardBackground,
    borderColor: branding?.borderColor || defaultTheme.borderColor,
    ringColor: branding?.ringColor || defaultTheme.ringColor,
    textPrimary: branding?.textPrimary || defaultTheme.textPrimary,
    textSecondary: branding?.textSecondary || defaultTheme.textSecondary,
    darkBackgroundColor:
      branding?.darkBackgroundColor || defaultTheme.darkBackgroundColor,
    darkSurfaceColor: branding?.darkSurfaceColor || defaultTheme.darkSurfaceColor,
    darkCardBackground:
      branding?.darkCardBackground || defaultTheme.darkCardBackground,
    darkBorderColor: branding?.darkBorderColor || defaultTheme.darkBorderColor,
    darkRingColor: branding?.darkRingColor || defaultTheme.darkRingColor,
    darkTextPrimary: branding?.darkTextPrimary || defaultTheme.darkTextPrimary,
    darkTextSecondary:
      branding?.darkTextSecondary || defaultTheme.darkTextSecondary,
    darkSidebarColor: branding?.darkSidebarColor || defaultTheme.darkSidebarColor,
    darkHeaderColor: branding?.darkHeaderColor || defaultTheme.darkHeaderColor,
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
  const { toast } = useToast();
  const [interaction, setInteraction] = useState<InteractionDialogState | null>(
    null
  );
  const clearInteraction = useCallback(() => setInteraction(null), []);

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
    colors: true,
    surfaces: true,
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

  /** Org brand starter packs — identity + surfaces for light & dark. */
  const presets: Record<string, Partial<Branding> & { name: string }> = {
    goldenAcres: {
      name: "Golden Acres",
      primaryColor: BRAND_PALETTE.primary,
      secondaryColor: BRAND_PALETTE.secondary,
      accentColor: BRAND_PALETTE.accent,
      sidebarColor: BRAND_PALETTE.sidebar,
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
      backgroundColor: "#f8fafc",
      surfaceColor: "#f1f5f9",
      cardBackground: "#ffffff",
      borderColor: "#e2e8f0",
      textPrimary: "#0f172a",
      textSecondary: "#64748b",
      darkBackgroundColor: "#020617",
      darkSurfaceColor: "#0f172a",
      darkCardBackground: "#1e293b",
      darkBorderColor: "#334155",
      darkTextPrimary: "#f8fafc",
      darkTextSecondary: "#94a3b8",
      darkSidebarColor: "#020617",
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
      backgroundColor: "#f0fdf4",
      surfaceColor: "#dcfce7",
      cardBackground: "#ffffff",
      borderColor: "#bbf7d0",
      textPrimary: "#052e16",
      textSecondary: "#166534",
      darkBackgroundColor: "#022c22",
      darkSurfaceColor: "#064e3b",
      darkCardBackground: "#065f46",
      darkBorderColor: "#047857",
      darkTextPrimary: "#ecfdf5",
      darkTextSecondary: "#6ee7b7",
      darkSidebarColor: "#022c22",
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
      backgroundColor: "#faf5ff",
      surfaceColor: "#f3e8ff",
      cardBackground: "#ffffff",
      borderColor: "#e9d5ff",
      textPrimary: "#1e1b4b",
      textSecondary: "#6b21a8",
      darkBackgroundColor: "#0f0a1e",
      darkSurfaceColor: "#1e1b4b",
      darkCardBackground: "#2e1065",
      darkBorderColor: "#4c1d95",
      darkTextPrimary: "#f5f3ff",
      darkTextSecondary: "#c4b5fd",
      darkSidebarColor: "#0f0a1e",
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
      backgroundColor: "#fff7ed",
      surfaceColor: "#ffedd5",
      cardBackground: "#ffffff",
      borderColor: "#fed7aa",
      textPrimary: "#431407",
      textSecondary: "#9a3412",
      darkBackgroundColor: "#1c0a00",
      darkSurfaceColor: "#431407",
      darkCardBackground: "#7c2d12",
      darkBorderColor: "#9a3412",
      darkTextPrimary: "#fff7ed",
      darkTextSecondary: "#fdba74",
      darkSidebarColor: "#1c0a00",
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
      backgroundColor: "#eef2ff",
      surfaceColor: "#e0e7ff",
      cardBackground: "#ffffff",
      borderColor: "#c7d2fe",
      textPrimary: "#1e1b4b",
      textSecondary: "#4338ca",
      darkBackgroundColor: "#0b0a1a",
      darkSurfaceColor: "#1e1b4b",
      darkCardBackground: "#312e81",
      darkBorderColor: "#4338ca",
      darkRingColor: "#6366f1",
      darkTextPrimary: "#eef2ff",
      darkTextSecondary: "#a5b4fc",
      darkSidebarColor: "#0b0a1a",
      darkHeaderColor: "#1e1b4b",
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
      toast("Logo upload failed: " + msg, "error");
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

  const handleSaveTheme = () => {
    setInteraction({
      mode: "prompt",
      title: "Save theme",
      description: "Enter a name for this theme layout.",
      defaultValue: "My Theme",
      inputLabel: "Theme name",
      confirmLabel: "Save",
      onConfirm: async (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        const newTheme: SavedTheme = {
          id: Date.now().toString(),
          name: trimmed,
          ...brandingForm,
        };

        const updatedSavedThemes = [...savedThemes, newTheme];
        try {
          await updateBranding({
            ...branding,
            savedThemes: updatedSavedThemes,
          });
          toast("Theme saved successfully to library!", "success");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          toast("Failed to save theme: " + msg, "error");
        }
      },
    });
  };

  const handleDuplicateTheme = (theme: SavedTheme) => {
    setInteraction({
      mode: "prompt",
      title: "Duplicate theme",
      description: "Enter a name for the duplicated theme.",
      defaultValue: `${theme.name} (Copy)`,
      inputLabel: "Theme name",
      confirmLabel: "Duplicate",
      onConfirm: async (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        const newTheme: SavedTheme = {
          ...theme,
          id: Date.now().toString(),
          name: trimmed,
        };

        const updatedSavedThemes = [...savedThemes, newTheme];
        try {
          await updateBranding({
            ...branding,
            savedThemes: updatedSavedThemes,
          });
          toast("Theme duplicated!", "success");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          toast("Duplicate failed: " + msg, "error");
        }
      },
    });
  };

  const handleDeleteTheme = (themeId: string) => {
    setInteraction({
      mode: "confirm",
      title: "Delete theme",
      description: "Are you sure you want to delete this theme?",
      confirmLabel: "Delete",
      confirmVariant: "danger",
      onConfirm: async () => {
        const updatedSavedThemes = savedThemes.filter((t) => t.id !== themeId);
        try {
          await updateBranding({
            ...branding,
            savedThemes: updatedSavedThemes,
          });
          if (selectedThemeId === themeId) setSelectedThemeId(null);
          toast("Theme deleted!", "success");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          toast("Delete failed: " + msg, "error");
        }
      },
    });
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
      // Full identity payload — store stamps brandPaletteVersion so indigo
      // presets are not remapped by legacy migrate on the next snapshot.
      await updateBranding({
        ...brandingForm,
        savedThemes: branding?.savedThemes || [],
      });
      await logAuditEvent({
        action: "Publish Theme",
        details: `Published custom theme globally. Company: ${brandingForm.companyName}`,
        user: user.username,
      });
      toast(
        "Brand published. All colors (including light & dark surfaces) apply app-wide. Light/Dark mode stays under Appearance.",
        "success"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast("Failed to publish theme: " + msg, "error");
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
        toast("Theme configuration imported successfully!", "success");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast("Invalid JSON format: " + msg, "error");
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    setInteraction({
      mode: "confirm",
      title: "Reset customizer",
      description: "Reset customizer to default brand colors?",
      confirmLabel: "Reset",
      confirmVariant: "danger",
      onConfirm: () => {
        updateState(defaultTheme);
      },
    });
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
    interaction,
    clearInteraction,
  };
}
