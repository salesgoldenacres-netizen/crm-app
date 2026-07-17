import { useEffect } from "react";
import {
  Paintbrush,
  Upload,
  Undo2,
  Redo2,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronUp,
  Check,
  Trash2,
  Plus,
} from "lucide-react";

import { useBrandingSettings } from "@/features/admin/hooks/useBrandingSettings";
import ThemeMockupPreview from "@/features/admin/components/ThemeMockupPreview";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";
import Textarea from "@/shared/components/ui/Textarea";
import Button from "@/shared/components/ui/Button";
import FormActions from "@/shared/components/ui/FormActions";
import {
  FIELD_CONTROL_CLASS,
  FIELD_LABEL_CLASS,
} from "@/shared/components/ui/formField";

const ACCORDION_BTN =
  "w-full flex justify-between items-center px-4 py-3 bg-theme-surface border-b border-theme-border text-sm font-semibold text-theme-text cursor-pointer border-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";
const TOOLBAR_BTN =
  "p-2 border border-theme-border rounded-theme hover:bg-theme-surface disabled:opacity-50 text-theme-text cursor-pointer bg-theme-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";
const TOOLBAR_CHIP =
  "flex items-center gap-1.5 px-3 py-2 border border-theme-border rounded-theme text-xs font-semibold hover:bg-theme-surface text-theme-text cursor-pointer bg-theme-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";
const COLOR_HEX =
  "w-full font-mono text-[11px] border border-theme-border bg-theme-surface text-theme-text rounded-theme p-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";
const COLOR_SWATCH =
  "w-7 h-7 rounded-theme border border-theme-border p-0 cursor-pointer overflow-hidden bg-transparent shrink-0";
const RANGE_INPUT = "w-full accent-[var(--theme-accent)]";

interface BrandingSettingsTabProps {
  branding: any;
  brandingLoaded?: boolean;
  updateBranding: (brandingData: any) => Promise<any>;
  logAuditEvent: (eventData: any) => Promise<any>;
  user: any;
}

export default function BrandingSettingsTab({
  branding,
  brandingLoaded = true,
  updateBranding,
  logAuditEvent,
  user,
}: BrandingSettingsTabProps) {
  const {
    brandingForm,
    updateState,
    openSections,
    toggleSection,
    savedThemes,
    activePreset,
    selectedThemeId,
    historyIndex,
    history,
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
  } = useBrandingSettings({
    branding,
    brandingLoaded,
    updateBranding,
    logAuditEvent,
    user,
  });

  // Dynamic Google Font Load for Live Preview
  useEffect(() => {
    if (brandingForm.typography) {
      const fontId = "preview-google-font";
      let link = document.getElementById(fontId) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.id = fontId;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      link.href = `https://fonts.googleapis.com/css2?family=${brandingForm.typography.replace(
        / /g,
        "+"
      )}:wght@300;400;500;600;700;800&display=swap`;
    }
  }, [brandingForm.typography]);

  return (
    <div className="space-y-6 text-sm animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-theme-border pb-4 gap-4">
        <div>
          <h1 className="text-sm font-semibold text-theme-text flex items-center gap-2">
            <Paintbrush className="w-5 h-5 text-theme-accent" aria-hidden="true" />
            Theme & Branding Customizer
          </h1>
          <p className="text-xs text-theme-muted mt-1">
            Org brand identity (logo, accent, fonts). Light / Dark / System is controlled by Appearance in the header.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndex === 0}
            className={TOOLBAR_BTN}
            title="Undo"
            aria-label="Undo"
          >
            <Undo2 className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className={TOOLBAR_BTN}
            title="Redo"
            aria-label="Redo"
          >
            <Redo2 className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className={TOOLBAR_BTN}
            title="Reset Settings"
            aria-label="Reset settings"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className={TOOLBAR_CHIP}
            title="Export theme to JSON file"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" /> Export JSON
          </button>
          <label className={TOOLBAR_CHIP}>
            <Upload className="w-3.5 h-3.5" aria-hidden="true" /> Import JSON
            <input type="file" accept="application/json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-theme-border bg-theme-accent-muted/40 px-4 py-3 text-[11px] text-theme-text leading-relaxed">
        <strong className="font-semibold text-theme-accent">What Go Live applies:</strong> company name, logo, primary/secondary/accent,
        status colors, typography, radius, and custom CSS. Page backgrounds and surfaces follow each user’s Appearance
        setting — not the color pickers below for sidebar/header (those are mockup-only).
      </div>

      {/* Library of Saved Themes */}
      {savedThemes.length > 0 && (
        <div className="bg-theme-surface border border-theme-border p-4 rounded-xl">
          <h3 className="type-label font-semibold uppercase tracking-wider text-theme-muted mb-3">
            Saved Theme Layout Library ({savedThemes.length})
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {savedThemes.map((theme: any) => (
              <div
                key={theme.id}
                onClick={() => loadSavedTheme(theme)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    loadSavedTheme(theme);
                  }
                }}
                role="button"
                tabIndex={0}
                className={`flex-shrink-0 w-44 p-3 bg-theme-card border rounded-theme shadow-sm cursor-pointer hover:border-theme-accent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                  selectedThemeId === theme.id
                    ? "border-theme-accent ring-2 ring-theme-ring/20"
                    : "border-theme-border"
                }`}
              >
                <div className="flex justify-between items-start gap-1">
                  <span className="font-semibold text-xs text-theme-text truncate w-full">
                    {theme.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTheme(theme.id);
                    }}
                    className="text-theme-muted hover:text-theme-danger border-0 bg-transparent p-0 flex-shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
                    aria-label={`Delete theme ${theme.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span
                    className="w-3 h-3 rounded-full border border-theme-border"
                    style={{ backgroundColor: theme.primaryColor }}
                  />
                  <span
                    className="w-3 h-3 rounded-full border border-theme-border"
                    style={{ backgroundColor: theme.sidebarColor }}
                  />
                  <span
                    className="w-3 h-3 rounded-full border border-theme-border"
                    style={{ backgroundColor: theme.backgroundColor }}
                  />
                </div>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-theme-border">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateTheme(theme);
                    }}
                    className="text-[10px] text-theme-muted hover:text-theme-accent border-0 bg-transparent p-0 cursor-pointer"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadSavedTheme(theme);
                      handlePublish();
                    }}
                    className="text-[10px] text-theme-success hover:opacity-80 font-semibold border-0 bg-transparent p-0 cursor-pointer"
                  >
                    Go Live
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Panel grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Theme Configuration Accordion */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Brand Identity */}
          <div className="bg-theme-card rounded-xl border border-theme-border shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("identity")}
              className={ACCORDION_BTN}
              aria-expanded={openSections.identity}
            >
              <span>1. Brand Identity</span>
              {openSections.identity ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
            </button>
            {openSections.identity && (
              <div className="p-4 space-y-4">
                <Input
                  label="Company Name"
                  type="text"
                  value={brandingForm.companyName}
                  onChange={(e) => updateState({ companyName: e.target.value })}
                />
                <Input
                  label="Company Tagline"
                  type="text"
                  value={brandingForm.tagline}
                  onChange={(e) => updateState({ tagline: e.target.value })}
                />
                <div>
                  <span className={`${FIELD_LABEL_CLASS} block mb-1.5`}>
                    Company Logo (Drag & Drop / Select)
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="logo-uploader"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <label
                      htmlFor="logo-uploader"
                      className="px-3 py-2 border border-dashed border-theme-border rounded-theme text-xs font-semibold text-theme-muted hover:bg-theme-surface cursor-pointer flex items-center flex-shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                      {uploadingLogo ? "Uploading…" : "Select Logo"}
                    </label>
                    <input
                      type="text"
                      value={brandingForm.logoUrl}
                      onChange={(e) => updateState({ logoUrl: e.target.value })}
                      placeholder="Paste Image URL"
                      aria-label="Logo image URL"
                      className={FIELD_CONTROL_CLASS}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Theme Presets */}
          <div className="bg-theme-card rounded-xl border border-theme-border shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("presets")}
              className={ACCORDION_BTN}
              aria-expanded={openSections.presets}
            >
              <span>2. Brand Presets</span>
              {openSections.presets ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
            </button>
            {openSections.presets && (
              <div className="p-4 space-y-3">
                <p className="text-[10px] text-theme-muted">
                  Starter packs for accent + typography. Does not change Light/Dark appearance.
                </p>
                <div className="grid grid-cols-2 gap-3">
                {Object.entries(presets).map(([key, config]: [string, any]) => (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    onClick={() => applyPreset(key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        applyPreset(key);
                      }
                    }}
                    className={`p-3 border rounded-theme cursor-pointer transition-all hover:bg-theme-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                      activePreset === key ? "border-theme-accent ring-2 ring-theme-ring" : "border-theme-border"
                    }`}
                  >
                    <div className="text-xs font-semibold text-theme-text mb-2 truncate">
                      {config.name}
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-theme-border"
                        style={{ backgroundColor: config.primaryColor }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-theme-border"
                        style={{ backgroundColor: config.secondaryColor }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-theme-border"
                        style={{ backgroundColor: config.accentColor }}
                      />
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Colors */}
          <div className="bg-theme-card rounded-xl border border-theme-border shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("colors")}
              className={ACCORDION_BTN}
              aria-expanded={openSections.colors}
            >
              <span>3. Color Scheme</span>
              {openSections.colors ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
            </button>
            {openSections.colors && (
              <div className="p-4 space-y-3.5">
                <p className="text-[10px] text-theme-muted">
                  These map to live brand tokens (`--theme-accent*`). Surfaces stay on Appearance.
                </p>
                {[
                  { label: "Primary Accent", key: "primaryColor" },
                  { label: "Secondary Accent", key: "secondaryColor" },
                  { label: "Accent Highlight", key: "accentColor" },
                ].map((colorItem) => (
                  <div key={colorItem.key} className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold text-theme-muted w-1/3 truncate">
                      {colorItem.label}
                    </span>
                    <div className="flex items-center gap-2 w-2/3">
                      <input
                        type="color"
                        aria-label={colorItem.label}
                        value={String(brandingForm[colorItem.key] ?? "")}
                        onChange={(e) => updateState({ [colorItem.key]: e.target.value })}
                        className={COLOR_SWATCH}
                      />
                      <input
                        type="text"
                        aria-label={`${colorItem.label} hex`}
                        value={String(brandingForm[colorItem.key] ?? "")}
                        onChange={(e) => updateState({ [colorItem.key]: e.target.value })}
                        className={COLOR_HEX}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 4: Status Colors */}
          <div className="bg-theme-card rounded-xl border border-theme-border shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("status")}
              className={ACCORDION_BTN}
              aria-expanded={openSections.status}
            >
              <span>4. Status & Indicators</span>
              {openSections.status ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
            </button>
            {openSections.status && (
              <div className="p-4 space-y-3.5">
                {[
                  { label: "Success Color", key: "successColor", text: "Booked" },
                  { label: "Warning Color", key: "warningColor", text: "Pending" },
                  { label: "Error Color", key: "dangerColor", text: "Action Needed" },
                  { label: "Info Color", key: "infoColor", text: "New" },
                ].map((colorItem) => (
                  <div key={colorItem.key} className="flex items-center justify-between gap-4">
                    <div className="w-1/3 flex flex-col">
                      <span className="text-xs font-semibold text-theme-muted truncate">
                        {colorItem.label}
                      </span>
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-theme text-center self-start mt-1 border text-white"
                        style={{
                          backgroundColor: String(brandingForm[colorItem.key] ?? ""),
                          borderColor: `${String(brandingForm[colorItem.key] ?? "")}33`,
                        }}
                      >
                        {colorItem.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 w-2/3">
                      <input
                        type="color"
                        aria-label={colorItem.label}
                        value={String(brandingForm[colorItem.key] ?? "")}
                        onChange={(e) => updateState({ [colorItem.key]: e.target.value })}
                        className={COLOR_SWATCH}
                      />
                      <input
                        type="text"
                        aria-label={`${colorItem.label} hex`}
                        value={String(brandingForm[colorItem.key] ?? "")}
                        onChange={(e) => updateState({ [colorItem.key]: e.target.value })}
                        className={COLOR_HEX}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 5: Typography */}
          <div className="bg-theme-card rounded-xl border border-theme-border shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("typography")}
              className={ACCORDION_BTN}
              aria-expanded={openSections.typography}
            >
              <span>5. Typography & Shapes</span>
              {openSections.typography ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
            </button>
            {openSections.typography && (
              <div className="p-4 space-y-4">
                <Select
                  label="Font Family"
                  value={brandingForm.typography}
                  onChange={(e) => updateState({ typography: e.target.value })}
                  options={["Inter", "Poppins", "Outfit", "Roboto", "Manrope", "DM Sans"].map(
                    (font) => ({ value: font, label: font })
                  )}
                />
                <div>
                  <div className="flex justify-between type-label font-semibold text-theme-muted mb-1">
                    <span>Base Font Size</span>
                    <span className="font-mono text-theme-text">{brandingForm.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="20"
                    aria-label="Base font size"
                    value={brandingForm.fontSize}
                    onChange={(e) => updateState({ fontSize: Number(e.target.value) })}
                    className={RANGE_INPUT}
                  />
                </div>
                <div>
                  <div className="flex justify-between type-label font-semibold text-theme-muted mb-1">
                    <span>Card Corner Radius</span>
                    <span className="font-mono text-theme-text">{brandingForm.borderRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    aria-label="Card corner radius"
                    value={brandingForm.borderRadius}
                    onChange={(e) => updateState({ borderRadius: Number(e.target.value) })}
                    className={RANGE_INPUT}
                  />
                </div>
                <div>
                  <div className="flex justify-between type-label font-semibold text-theme-muted mb-1">
                    <span>Shadow Intensity</span>
                    <span className="font-mono text-theme-text">{brandingForm.shadowIntensity}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    aria-label="Shadow intensity"
                    value={brandingForm.shadowIntensity}
                    onChange={(e) => updateState({ shadowIntensity: Number(e.target.value) })}
                    className={RANGE_INPUT}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 6: Layout Options */}
          <div className="bg-theme-card rounded-xl border border-theme-border shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("layout")}
              className={ACCORDION_BTN}
              aria-expanded={openSections.layout}
            >
              <span>6. Layout Options</span>
              {openSections.layout ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
            </button>
            {openSections.layout && (
              <div className="p-4 space-y-3.5">
                <p className="text-[10px] text-theme-muted">
                  Corner radius applies live. Other layout flags were removed — they were not wired to the shell.
                </p>
                {[
                  { label: "Rounded Cards", key: "roundedCards" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-theme-text">{item.label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!brandingForm[item.key]}
                      aria-label={item.label}
                      onClick={() => updateState({ [item.key]: !brandingForm[item.key] })}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                        brandingForm[item.key] ? "bg-theme-accent" : "bg-theme-border"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          brandingForm[item.key] ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 7: Advanced CSS */}
          <div className="bg-theme-card rounded-xl border border-theme-border shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("advanced")}
              className={ACCORDION_BTN}
              aria-expanded={openSections.advanced}
            >
              <span>7. Advanced CSS Rules</span>
              {openSections.advanced ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
            </button>
            {openSections.advanced && (
              <div className="p-4 space-y-2">
                <p className="type-label font-semibold text-theme-muted">
                  Custom Global Stylesheet Override
                </p>
                <div className="relative border border-theme-border rounded-theme overflow-hidden bg-theme-surface">
                  <Textarea
                    value={brandingForm.customCss}
                    onChange={(e) => updateState({ customCss: e.target.value })}
                    placeholder={"/* Write custom CSS overrides here */\n.card {\n  border: 2px solid var(--primary-color);\n}"}
                    rows={6}
                    className="font-mono text-[11px] border-0 shadow-none focus-visible:ring-0 rounded-none min-h-32"
                    aria-label="Custom CSS"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Live Visual Interactive Preview */}
        <ThemeMockupPreview
          brandingForm={brandingForm}
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
          previewDevice={previewDevice}
          setPreviewDevice={setPreviewDevice}
          previewTab={previewTab}
          setPreviewTab={setPreviewTab}
        />
      </div>

      {/* Footer Settings Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-theme-surface border border-theme-border p-4 rounded-xl gap-4">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleSaveTheme}>
            <Plus className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> Save to Theme Library
          </Button>
        </div>

        <FormActions>
          <Button type="button" variant="outline" onClick={handleReset}>
            Cancel / Reset
          </Button>
          <Button type="button" variant="primary" onClick={handlePublish}>
            <Check className="w-4 h-4 mr-1.5" aria-hidden="true" /> Go Live & Publish Brand
          </Button>
        </FormActions>
      </div>
    </div>
  );
}
