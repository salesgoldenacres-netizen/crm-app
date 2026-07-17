import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg";
}

export default function Avatar({ src, name, size = "md", className, ...props }: AvatarProps) {
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    if (parts.length === 0 || !parts[0]) return "?";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const textBgColors = [
    "bg-theme-accent-muted text-theme-accent",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-sky-100 text-sky-700",
    "bg-rose-100 text-rose-700",
  ];

  // Pick stable color based on name hash
  const colorIndex = Math.abs(name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % textBgColors.length;
  const pickedColor = textBgColors[colorIndex];

  return (
    <div
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center rounded-full font-bold overflow-hidden border border-theme-border transition-colors select-none",
          sizes[size],
          src ? "" : pickedColor,
          className
        )
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
