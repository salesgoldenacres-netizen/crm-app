# Performance Overlay (Wave 8 Phase 2D-D)

The developer diagnostics dashboard runs under these conditions:

- **Strict Environment Checks**: Loaded lazy-conditionally using `import.meta.env.DEV && import.meta.env.VITE_PERFORMANCE_DEBUG`.
- **Zero Cost Production**: Fully tree-shaken and omitted from production minified bundles.
- **Context Consumer**: Exclusively consumes context variables through `usePerformance()`.
