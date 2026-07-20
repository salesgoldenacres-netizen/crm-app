import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  variant?: "line" | "pills";
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  className,
  variant = "line",
}: TabsProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "flex space-x-1 border-theme-border transition-colors duration-300",
          variant === "line" ? "border-b" : "bg-theme-surface p-1 rounded-theme"
        ),
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={clsx(
              "flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-300 border-0 cursor-pointer bg-transparent",
              variant === "line"
                ? isActive
                  ? "border-b-2 border-theme-accent text-theme-accent"
                  : "text-theme-muted hover:text-theme-text"
                : isActive
                ? "bg-theme-card text-theme-text rounded-lg shadow-sm"
                : "text-theme-muted hover:text-theme-text rounded-lg"
            )}
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
