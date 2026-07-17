# Renderer Abstraction (Wave 8 Phase 2D-A)

All rendering layout styles (tables, cards, virtual viewports) are strictly abstracted inside separate files:

- **DataTableRenderer.tsx**: Thin wrapper for standard `DataTable.tsx` rendering on desktops.
- **MobileCardRenderer.tsx**: Thin wrapper for standard mobile `MobileCardList.tsx` rendering.
- **VirtualizedRenderer.tsx**: Renders rows matching view window metrics.
- **RendererFactory.tsx**: Standardizes configuration properties and decides the active renderer without leaking decisions into page components.

## Error Recovery Strategy

All desktop virtual renders are automatically wrapped with a custom `VirtualizationErrorBoundary.tsx`. 
If calculations, scrolling behaviors, or rendering cycles fail inside `VirtualizedRenderer`, the boundary intercepts the error and falls back to rendering the standard `DataTableRenderer` immediately, preventing the page view from crashing.
