import React from "react";
import { twMerge } from "tailwind-merge";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  clean?: boolean;
}

export default function Container({ children, className, clean = false, ...props }: ContainerProps) {
  return (
    <div
      className={twMerge(
        clean ? "" : "w-full max-w-none px-3 sm:px-5 lg:px-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
