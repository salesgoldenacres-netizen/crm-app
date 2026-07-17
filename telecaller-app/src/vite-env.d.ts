/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
  /** Optional AI master override — non-prod only; see `@/shared/ai` `isAiEnabled`. */
  readonly VITE_AI_ENABLED?: string;
  /**
   * Provider selection when AI is enabled: `stub` (default) | `gemini` | `live`.
   * Live path uses Cloud Function `aiComplete` — no client API keys.
   */
  readonly VITE_AI_PROVIDER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
