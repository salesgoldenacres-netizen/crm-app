# Virtualization Engine Contract (Wave 8 Phase 2D-A)

## Mathematical calculations

`VirtualizationEngine` is a stateless pure-math service. It depends entirely on parameter inputs to return the list window bounds:

```typescript
export interface VirtualizationEngine {
  calculateRange(
    scrollTop: number,
    clientHeight: number,
    totalItems: number,
    overscan: number,
    strategy: RowHeightStrategy
  ): VirtualRange;
}
```

## Replaceable Extension Parts

Future upgrades can swap these implementation components with zero changes to features or `ResponsiveDataView`:

1. **Virtualization engine**: Implement new engines (e.g. TanStack Virtualizer wrapper) satisfying the `VirtualizationEngine` contract.
2. **Row height strategy**: Implement dynamic, measured, or estimated strategies.
3. **Renderer types**: Add additional views behind `RendererFactory`.
4. **Overscan parameters**: Expose custom overscan bounds via properties.
5. **Threshold guidelines**: Change the virtualization threshold configuration.
