import React, { useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export default function Tooltip({
  content,
  children,
  position = "top",
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowStyles = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-theme-text",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-theme-text",
    left: "left-full top-1/2 -translate-y-1/2 border-l-theme-text",
    right: "right-full top-1/2 -translate-y-1/2 border-r-theme-text",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={twMerge(
            clsx(
              "absolute z-50 px-2 py-1 text-[10px] sm:text-xs font-bold text-theme-bg bg-theme-text rounded shadow-md whitespace-nowrap pointer-events-none transition-opacity duration-200",
              positionStyles[position],
              className
            )
          )}
        >
          {content}
          <div
            className={twMerge(
              "absolute border-4 border-transparent",
              arrowStyles[position]
            )}
          />
        </div>
      )}
    </div>
  );
}
