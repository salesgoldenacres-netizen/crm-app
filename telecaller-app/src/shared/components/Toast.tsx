import React, {
  useState,
  useCallback,
  createContext,
  useContext,
  useRef,
  ReactNode,
} from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type?: ToastType;
}

export interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
}

/* ── Toast Context ─────────────────────────────────────────── */
const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

/* ── Individual Toast Item ──────────────────────────────────── */
const ICONS: Record<ToastType, React.ReactElement> = {
  success: React.createElement(CheckCircle, { className: "w-4 h-4 flex-shrink-0" }),
  error: React.createElement(XCircle, { className: "w-4 h-4 flex-shrink-0" }),
  warning: React.createElement(AlertTriangle, { className: "w-4 h-4 flex-shrink-0" }),
  info: React.createElement(Info, { className: "w-4 h-4 flex-shrink-0" }),
};

const COLORS: Record<ToastType, string> = {
  success: "bg-emerald-600 text-white",
  error: "bg-red-600 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-indigo-600 text-white",
};

interface ToastItemProps {
  id: string;
  message: string;
  type?: ToastType;
  onDismiss: (id: string) => void;
}

function ToastItem({ id, message, type = "info", onDismiss }: ToastItemProps) {
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(id), 250); // wait for exit animation
  }, [id, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg shadow-black/20
        min-w-[240px] max-w-[340px] w-full text-sm font-medium
        ${COLORS[type]}
        ${exiting ? "toast-exit" : "toast-enter"}
      `}
    >
      {ICONS[type]}
      <span className="flex-1 leading-snug">{message}</span>
      <button
        onClick={dismiss}
        className="ml-auto p-0.5 rounded-full opacity-70 hover:opacity-100 transition-opacity cursor-pointer animate-none bg-transparent border-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

/* ── Toast Container (portal-like, fixed bottom-right) ─────── */
function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-20 md:bottom-auto md:top-5 right-4 z-[99999] flex flex-col-reverse md:flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem {...t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

interface ToastProviderProps {
  children: ReactNode;
}

/* ── Provider ───────────────────────────────────────────────── */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timerRefs = useRef<Record<string, number>>({});

  const dismiss = useCallback((id: string) => {
    if (timerRefs.current[id]) {
      clearTimeout(timerRefs.current[id]);
      delete timerRefs.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info", duration = 3500) => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
      setToasts((prev) => [...prev, { id, message, type }]);

      if (duration > 0) {
        timerRefs.current[id] = setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export default ToastProvider;
