# Virtualization Contract (Wave 8 Phase 2D)

## Canonical Architecture

```
ResponsiveDataView   ← Feature code uses this ONLY
        │
        ▼
      DataView        ← Internal stable adapter; exposes virtualization prop
        │
        ▼
   RendererFactory    ← Sole authority for renderer selection
        │
 ┌──────┴──────────────────────┐
 ▼                             ▼
Desktop (md:block)         Mobile (md:hidden)
        │                      │
        ▼                      ▼
VirtualizedRenderer    MobileCardRenderer
(or DataTableRenderer)
        │
        ▼
VirtualizationEngine    ← Pluggable interface
        │
        ▼
TanStackVirtualEngine   ← Default (swappable)
```

## Contracts

### Feature Code
- Always import and use `ResponsiveDataView`.
- Never import `DataView`, `RendererFactory`, `VirtualizedRenderer`, `DataTableRenderer`, or `MobileCardRenderer` directly from feature code.

### Virtualization Escape Hatch
```tsx
<ResponsiveDataView
  virtualization="never"  // drag-and-drop, print, export, PDF, SSR, <50 rows
  {...rest}
/>
```

Valid values: `"auto"` (default), `"always"`, `"never"`

### Engine Swapping
To change virtualization engine:
1. Implement `VirtualizationEngine` interface in `src/shared/services/performance/virtualization/`.
2. Update `RendererFactory.tsx` to import the new engine.
3. No renderer or feature code changes required.

## DOM Budget
- Visible rows + overscan must never exceed 60 on desktop.
- Overscan: 10 rows (configurable in `VirtualizedRenderer.tsx`).
- Sticky header: always rendered, excluded from virtual count.

## Accessibility
- Container: `role="grid"`, `aria-rowcount`.
- Header row: `role="row"`.
- Cells: `role="gridcell"`.
- Rows: `role="row"`, `aria-rowindex`, `aria-selected`.
