import LoadingSpinner from "@/shared/components/ui/LoadingSpinner";

interface BrandedBootScreenProps {
  /** Primary line under the spinner (company / product name). */
  title?: string;
  /** Secondary status line. */
  message?: string;
}

/**
 * Full-viewport boot / Suspense fallback. Uses Brand Customizer tokens
 * (`app-canvas`, `theme-*`) so Go Live updates login & loading immediately.
 */
export default function BrandedBootScreen({
  title = "Golden Acres",
  message = "Loading…",
}: BrandedBootScreenProps) {
  return (
    <div className="flex h-screen items-center justify-center app-canvas text-theme-text transition-colors duration-300">
      <div className="flex flex-col items-center gap-4 px-6">
        <div className="relative flex items-center justify-center">
          <div
            className="absolute inset-0 -m-3 rounded-full blur-xl opacity-40 pointer-events-none"
            style={{
              background:
                "color-mix(in srgb, var(--theme-accent) 45%, transparent)",
            }}
            aria-hidden
          />
          <LoadingSpinner size="lg" variant="indigo" className="relative" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="type-page-title text-theme-text">{title}</h2>
          <p className="type-secondary text-theme-muted">{message}</p>
        </div>
      </div>
    </div>
  );
}
