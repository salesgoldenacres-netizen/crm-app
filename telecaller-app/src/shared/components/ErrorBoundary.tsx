import { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

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
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-sm font-sans transition-colors duration-300">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 text-center space-y-5">
            <div className="inline-flex p-4 bg-rose-50 dark:bg-rose-955/30 text-rose-600 dark:text-rose-400 rounded-full">
              <ShieldAlert className="w-10 h-10 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Something went wrong
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                An unexpected application rendering error occurred. The developer log contains details of the crash.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-lg text-left max-h-32 overflow-y-auto border dark:border-slate-800">
                <code className="text-[10px] font-mono text-rose-600 dark:text-rose-400 whitespace-pre-wrap select-all">
                  {this.state.error.name}: {this.state.error.message}
                </code>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 shadow-sm text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none cursor-pointer border-0 transition-colors"
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
