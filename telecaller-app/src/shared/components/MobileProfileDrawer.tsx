import { LogOut, Minimize2, Maximize2, Keyboard } from "lucide-react";
import { User } from "@/shared/types";
import ThemeToggle from "@/shared/components/ThemeToggle";
import Drawer from "@/shared/components/ui/Drawer";

interface MobileProfileDrawerProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  openShortcuts: () => void;
  handleLogout: () => Promise<void>;
}

export default function MobileProfileDrawer({
  user,
  isOpen,
  onClose,
  isFullscreen,
  toggleFullscreen,
  openShortcuts,
  handleLogout,
}: MobileProfileDrawerProps) {
  const footer = (
    <div className="w-full">
      <button
        type="button"
        onClick={async () => {
          onClose();
          await handleLogout();
        }}
        className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-theme-danger/10 hover:bg-theme-danger/20 border border-theme-danger/20 text-theme-danger font-bold text-sm transition-all active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
      >
        <LogOut className="w-4 h-4" aria-hidden="true" />
        <span>Sign Out</span>
      </button>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Account"
      position="bottom"
      size="lg"
      footer={footer}
      className="pb-safe"
    >
      <div className="p-4 bg-theme-surface rounded-2xl border border-theme-border flex items-center space-x-4 mb-5">
        <div className="w-12 h-12 rounded-full bg-theme-accent text-theme-accent-fg flex items-center justify-center font-black text-sm flex-shrink-0 shadow-lg">
          {user?.username
            ? user.username.substring(0, 2).toUpperCase()
            : "GA"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-theme-text truncate">
            {user?.username || "User"}
          </p>
          <p className="text-[11px] text-theme-muted font-semibold capitalize truncate">
            {user?.role || "Agent"}
          </p>
          {user?.email && (
            <p className="text-[10px] text-theme-muted truncate mt-0.5">
              {user.email}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="w-full flex items-center justify-between px-4 py-3 bg-theme-surface rounded-xl border border-theme-border">
          <span className="text-xs font-bold text-theme-text">Appearance</span>
          <ThemeToggle compact />
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
            toggleFullscreen();
          }}
          className="w-full flex items-center justify-between px-4 py-3 bg-theme-surface rounded-xl border border-theme-border text-theme-text hover:opacity-90 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
        >
          <div className="flex items-center space-x-3">
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-theme-accent" aria-hidden="true" />
            ) : (
              <Maximize2 className="w-4 h-4 text-theme-accent" aria-hidden="true" />
            )}
            <span className="text-xs font-bold">Full Screen Mode</span>
          </div>
          <span className="text-[10px] font-black text-theme-muted uppercase tracking-wider">
            {isFullscreen ? "Enabled" : "Disabled"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            openShortcuts();
          }}
          className="w-full flex items-center px-4 py-3 bg-theme-surface rounded-xl border border-theme-border text-theme-text hover:opacity-90 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
        >
          <Keyboard className="w-4 h-4 text-theme-muted mr-3" aria-hidden="true" />
          <span className="text-xs font-bold">Keyboard Shortcuts</span>
        </button>
      </div>
    </Drawer>
  );
}
