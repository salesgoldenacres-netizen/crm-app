import { LogOut } from "lucide-react";
import { User } from "@/shared/types";

interface SidebarFooterProps {
  user: User | null;
  isSidebarCollapsed: boolean;
  handleLogout: () => void;
}

export default function SidebarFooter({
  user,
  isSidebarCollapsed,
  handleLogout,
}: SidebarFooterProps) {
  return (
    <div
      className={`shrink-0 border-t border-theme-border/80 ${
        isSidebarCollapsed ? "p-2.5" : "px-3 py-3"
      }`}
    >
      <div
        className={`flex items-center ${
          isSidebarCollapsed ? "justify-center" : "gap-2.5"
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-theme-accent text-theme-accent-fg flex items-center justify-center font-bold text-[11px] shadow-sm shrink-0 tracking-wide">
          {user?.username ? user.username.substring(0, 2).toUpperCase() : "GA"}
        </div>
        {!isSidebarCollapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-theme-text truncate leading-tight">
                {user?.username || "Agent"}
              </p>
              <p className="text-[11px] text-theme-muted truncate capitalize font-medium leading-tight mt-0.5">
                {(user?.role || "Agent").replace(/_/g, " ")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center min-h-11 min-w-11 p-1.5 text-theme-muted hover:text-theme-danger rounded-theme hover:bg-theme-surface transition-colors cursor-pointer border-0 bg-transparent shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
