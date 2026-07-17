// src/shared/services/performance/PerformanceOverlay.tsx
import React from "react";
import { usePerformance } from "./PerformanceContext";

const PerformanceOverlay: React.FC = () => {
  const metrics = usePerformance();

  // Floating overlay panel in dev environment
  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        background: "rgba(30, 41, 59, 0.95)",
        color: "#f8fafc",
        padding: "16px",
        borderRadius: "12px",
        fontFamily: "monospace",
        fontSize: "12px",
        zIndex: 99999,
        border: "1px solid rgba(255,255,255,0.1)",
        pointerEvents: "none",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "4px" }}>
        📊 CRM Diagnostic Overlay
      </div>
      <div>Queries Executed: {metrics.queryCount}</div>
      <div>Average Latency: {metrics.averageQueryLatency.toFixed(1)}ms</div>
      <div>Cache Hit Ratio: {(metrics.cacheHits / Math.max(1, metrics.cacheHits + metrics.cacheMisses) * 100).toFixed(0)}%</div>
      <div>Cache Evictions: {metrics.cacheEvictions}</div>
      <div>Virtualization runs: {metrics.totalVirtualizationCalculations}</div>
      <div>Avg Render time: {metrics.averageVirtualizationDuration.toFixed(1)}ms</div>
    </div>
  );
};

export default PerformanceOverlay;
