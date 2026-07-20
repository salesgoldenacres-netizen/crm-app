import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import ErrorBoundary from "@/shared/components/ErrorBoundary";
import { initAppSentry } from "@/shared/services/observability/sentry";
import { initializeUpdater } from "@/shared/services/updater";

// Optional Sentry (no-op warn when VITE_SENTRY_DSN missing — not a deploy blocker)
initAppSentry();

// Initialize the OTA update system
initializeUpdater();

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}
