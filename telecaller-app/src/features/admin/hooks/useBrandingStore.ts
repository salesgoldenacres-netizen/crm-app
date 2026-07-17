import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/shared/services/firebase";
import { Branding } from "@/shared/types";
import { SettingsRepository } from "@/shared/services/firebase/repositories";
import {
  BRAND_PALETTE,
  brandPalettePatch,
  isLegacyIndigoPrimary,
} from "@/shared/constants/brandPalette";

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
  savedThemes: [],
};

export function useBrandingStore() {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [isLoaded, setIsLoaded] = useState(false);
  const migratedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "branding"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          let primary = data.primaryColor || BRAND_PALETTE.primary;
          let secondary = data.secondaryColor || BRAND_PALETTE.secondary;
          let accent = data.accentColor || BRAND_PALETTE.accent;
          let sidebar = data.sidebarColor || BRAND_PALETTE.sidebar;
          let header = data.headerColor || BRAND_PALETTE.header;
          let bg = data.backgroundColor || BRAND_PALETTE.background;
          let cardBg = data.cardBackground || BRAND_PALETTE.card;
          let border = data.borderColor || BRAND_PALETTE.border;
          let textP = data.textPrimary || BRAND_PALETTE.textPrimary;
          let textS = data.textSecondary || BRAND_PALETTE.textSecondary;
          const success = data.successColor || BRAND_PALETTE.success;
          let warning = data.warningColor || BRAND_PALETTE.warning;
          const danger = data.dangerColor || BRAND_PALETTE.danger;
          let info = data.infoColor || BRAND_PALETTE.info;
          const customCss = data.customCss || "";

          // One-time migrate legacy indigo branding → gold/green (preserve name/logo/tagline)
          if (isLegacyIndigoPrimary(primary) && !migratedRef.current) {
            migratedRef.current = true;
            const patch = brandPalettePatch();
            primary = patch.primaryColor;
            secondary = patch.secondaryColor;
            accent = patch.accentColor;
            sidebar = patch.sidebarColor;
            header = patch.headerColor;
            bg = patch.backgroundColor;
            cardBg = patch.cardBackground;
            border = patch.borderColor;
            textP = patch.textPrimary;
            textS = patch.textSecondary;
            warning = patch.warningColor;
            info = patch.infoColor;
            void SettingsRepository.setBranding(patch).catch((err) => {
              console.warn("Brand palette migrate failed", err);
              migratedRef.current = false;
            });
          }

          setBranding({
            companyName: data.companyName || "Golden Acres Portal",
            logoUrl: data.logoUrl || "",
            tagline: data.tagline || "",
            primaryColor: primary,
            secondaryColor: secondary,
            accentColor: accent,
            sidebarColor: sidebar,
            headerColor: header,
            backgroundColor: bg,
            cardBackground: cardBg,
            borderColor: border,
            textPrimary: textP,
            textSecondary: textS,
            successColor: success,
            warningColor: warning,
            dangerColor: danger,
            infoColor: info,
            typography: data.typography || "Inter",
            fontSize: data.fontSize !== undefined ? Number(data.fontSize) : 14,
            borderRadius:
              data.borderRadius !== undefined ? Number(data.borderRadius) : 12,
            shadowIntensity:
              data.shadowIntensity !== undefined
                ? Number(data.shadowIntensity)
                : 4,
            roundedCards:
              data.roundedCards !== undefined ? !!data.roundedCards : true,
            glassmorphism:
              data.glassmorphism !== undefined ? !!data.glassmorphism : false,
            compactMode:
              data.compactMode !== undefined ? !!data.compactMode : false,
            darkSidebar:
              data.darkSidebar !== undefined ? !!data.darkSidebar : true,
            stickyHeader:
              data.stickyHeader !== undefined ? !!data.stickyHeader : true,
            animations: data.animations !== undefined ? !!data.animations : true,
            customCss,
            savedThemes: Array.isArray(data.savedThemes) ? data.savedThemes : [],
          });

          if (typeof window !== "undefined") {
            const adjustColor = (hex: string, percent: number) => {
              try {
                let R = parseInt(hex.substring(1, 3), 16);
                let G = parseInt(hex.substring(3, 5), 16);
                let B = parseInt(hex.substring(5, 7), 16);
                R = Math.min(
                  255,
                  Math.max(0, parseInt(((R * (100 + percent)) / 100).toString())),
                );
                G = Math.min(
                  255,
                  Math.max(0, parseInt(((G * (100 + percent)) / 100).toString())),
                );
                B = Math.min(
                  255,
                  Math.max(0, parseInt(((B * (100 + percent)) / 100).toString())),
                );
                return `#${R.toString(16).padStart(2, "0")}${G.toString(16).padStart(2, "0")}${B.toString(16).padStart(2, "0")}`;
              } catch {
                return hex;
              }
            };

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
            const accentMuted = isDark
              ? `${primary}26`
              : adjustColor(primary, 40);
            root.style.setProperty("--theme-accent", primary);
            root.style.setProperty("--theme-accent-fg", "#ffffff");
            root.style.setProperty("--theme-accent-muted", accentMuted);
            root.style.setProperty("--theme-accent-text", primary);
            root.style.setProperty("--theme-accent-bg", accentMuted);
            root.style.setProperty("--theme-success", success);
            root.style.setProperty("--theme-warning", warning);
            root.style.setProperty("--theme-danger", danger);
            root.style.setProperty(
              "--theme-brand-gradient",
              `linear-gradient(135deg, ${primary} 0%, ${adjustColor(primary, 15)} 45%, ${secondary} 100%)`,
            );

            const selectedFont = data.typography || "Inter";
            const fontStack = `'${selectedFont}', ui-sans-serif, system-ui, sans-serif`;
            root.style.setProperty("--font-family", fontStack);
            root.style.setProperty("--font-sans", fontStack);
            root.style.setProperty("--font-display", fontStack);
            root.style.setProperty("--font-size", `${data.fontSize || 14}px`);
            root.style.setProperty(
              "--radius",
              `${data.roundedCards ? data.borderRadius || 12 : 0}px`,
            );
            root.style.setProperty(
              "--border-radius",
              `${data.roundedCards ? data.borderRadius || 12 : 0}px`,
            );

            const shadowOpacity =
              (data.shadowIntensity !== undefined ? data.shadowIntensity : 4) /
              100;
            root.style.setProperty(
              "--box-shadow",
              `0 4px 6px -1px rgba(0, 0, 0, ${shadowOpacity}), 0 2px 4px -2px rgba(0, 0, 0, ${shadowOpacity})`,
            );

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

            if (data.logoUrl) {
              let link = document.querySelector(
                "link[rel*='icon']",
              ) as HTMLLinkElement;
              if (!link) {
                link = document.createElement("link");
                link.rel = "icon";
                document.head.appendChild(link);
              }
              link.href = data.logoUrl;
            }
          }
        } else if (!migratedRef.current) {
          // No branding doc yet — seed gold/green defaults
          migratedRef.current = true;
          void SettingsRepository.setBranding(brandPalettePatch()).catch(
            (err) => {
              console.warn("Brand palette seed failed", err);
              migratedRef.current = false;
            },
          );
        }
        setIsLoaded(true);
      },
    );
    return () => unsubscribe();
  }, []);

  const updateBranding = async (newBranding: Partial<Branding>) => {
    await SettingsRepository.setBranding(newBranding);
  };

  return { branding, isLoaded, updateBranding };
}
