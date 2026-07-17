# DLS Responsive Guidelines (DLS v1.4 Locked)

This guide documents the guidelines and standards for implementing responsive layouts within the locked DLS v1.4 framework.

---

## 1. Core Directives

1. **Do Not Modify Spacing or Size Tokens**:
   Do not introduce custom margin or padding variables. Use the layout breakpoints (`sm:`, `md:`, `lg:`) to scale margins or paddings using existing theme classes.

2. **iOS Zoom Prevention**:
   All text inputs, select dropdowns, and textareas must have a minimum font-size of `text-base` (16px) on mobile viewports. On desktop, they can scale down to `sm:text-sm` or `sm:text-xs`. This prevents browser auto-zoom layout shifts on focus.

3. **Touch Targets**:
   Interactive controls should achieve approximately `44x44px` touch targets. Do this by wrapping inline buttons or links in containers with padding or min-heights, not by changing the DLS font sizes.

4. **Encapsulate Device Quirks**:
   Features must never manually handle device-specific CSS (like safe-area offsets). Use shared primitives (`Drawer`, `Modal`, `BottomActionBar`) which encapsulate notch and home indicator spacing.

---

## 2. Layout Patterns

- **Tables**: Use `<ResponsiveDataView>` instead of raw tables.
- **Overlays**: Use `<Drawer>` or `<Dialog>` (which uses `<Modal>`). They automatically switch from centered/side panels to bottom/full sheets on mobile.
- **Sticky Actions**: Place mobile CTAs inside `<BottomActionBar>`.
