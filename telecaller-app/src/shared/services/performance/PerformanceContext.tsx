// src/shared/services/performance/PerformanceContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { performanceMonitor, PerformanceMetrics } from "./performanceMonitor";

const PerformanceContext = createContext<PerformanceMetrics | null>(null);

export const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(performanceMonitor.getMetrics());

  useEffect(() => {
    // Development-only metrics poll loop
    if (!import.meta.env.DEV) {
      return;
    }

    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <PerformanceContext.Provider value={metrics}>
      {children}
    </PerformanceContext.Provider>
  );
};

export const usePerformance = (): PerformanceMetrics => {
  const context = useContext(PerformanceContext);
  if (!context) {
    // Safe fallback metrics if overlay is accessed outside of provider
    return performanceMonitor.getMetrics();
  }
  return context;
};
