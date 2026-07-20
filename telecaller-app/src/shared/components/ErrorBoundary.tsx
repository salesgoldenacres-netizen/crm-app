import { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

import { captureException } from "@/shared/services/observability/sentry";
import { logger } from "@/shared/utils/logger";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("ErrorBoundary", "Uncaught render error", error, errorInfo);
    // Direct capture when Sentry is initialized (logger hook also fires).
    captureException(error, {
      componentStack: errorInfo.componentStack,
      source: "ErrorBoundary",
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-theme-bg flex items-center justify-center p-6 text-sm font-sans transition-colors duration-300">
          <div className="max-w-md w-full bg-theme-card rounded-theme border border-theme-border shadow-xl overflow-hidden p-6 text-center space-y-5">
            <div className="inline-flex p-4 bg-theme-danger/10 text-theme-danger rounded-theme">
              <ShieldAlert className="w-10 h-10" aria-hidden />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-theme-text">
                Something went wrong
              </h1>
              <p className="text-xs text-theme-muted leading-relaxed">
                An unexpected application rendering error occurred. The developer log contains details of the crash.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-theme-surface p-3 rounded-lg text-left max-h-32 overflow-y-auto border border-theme-border">
                <code className="text-[10px] font-mono text-theme-danger whitespace-pre-wrap select-all">
                  {this.state.error.name}: {this.state.error.message}
                </code>
              </div>
            )}

            <button
              type="button"
              onClick={this.handleReload}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 shadow-sm text-xs font-semibold rounded-lg text-theme-accent-fg bg-theme-accent hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring cursor-pointer border-0 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
