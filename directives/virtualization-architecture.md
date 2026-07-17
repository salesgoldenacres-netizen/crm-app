# Virtualization Architecture (Wave 8 Phase 2D-A)

This document describes the virtualization layer implemented in Wave 8 Phase 2D-A.

## Layout Adaption Flow

```text
ResponsiveDataView   (public API — unchanged)
        │
        ▼
      DataView       (internal adapter wrapper)
        │
        ▼
 RendererFactory     (resolves layout based on mode/options)
        │
 ┌──────┼──────────────────────┐
 ▼      ▼                      ▼
DataTableRenderer  VirtualizedRenderer  MobileCardRenderer
                           │
                           ▼
                 VirtualizationErrorBoundary
                           │
                           ▼
                  useVirtualization()  (React hook state & scroll listener)
                           │
                           ▼
                 VirtualizationEngine (stateless interface)
                           │
                           ▼
                   RowHeightStrategy (contract)
                           │
          ┌────────────────┴───────────────┐
          ▼                                ▼
FixedRowHeightStrategy      (future strategies)
```

## Contracts & Modular Design

To ensure swappable layouts and virtualization engines, we split contracts and implementation:

1. **VirtualRange**: Pure data interface representing output indexes and offsets.
2. **RowHeightStrategy**: Contract determining index-based layout sizes.
3. **VirtualizationEngine**: Stateless pure calculation contract. Same inputs yield identical outcomes, facilitating simple replacements later.
