import React, { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface DropdownItemProps {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: "default" | "danger";
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItemProps[];
  align?: "left" | "right";
  className?: string;
}

export default function Dropdown({
  trigger,
  items,
  align = "right",
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={twMerge(
            clsx(
              "absolute z-50 mt-1.5 w-44 rounded-lg bg-theme-card border border-theme-border shadow-xl focus:outline-none py-1 overflow-hidden transition-all duration-200",
              align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left",
              className
            )
          )}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  setIsOpen(false);
                }
              }}
              disabled={item.disabled}
              className={clsx(
                "w-full px-4 py-2 text-xs sm:text-sm font-semibold flex items-center space-x-2.5 transition-colors border-0 bg-transparent text-left",
                item.disabled
                  ? "opacity-40 cursor-not-allowed"
                  : item.variant === "danger"
                  ? "text-theme-danger hover:bg-theme-danger/10 cursor-pointer"
                  : "text-theme-text hover:bg-theme-surface cursor-pointer"
              )}
            >
              {item.icon && <span className="w-4 h-4 text-theme-muted">{item.icon}</span>}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
