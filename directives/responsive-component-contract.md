# Responsive Component Contract

This document outlines the API contracts and architectural responsibilities for shared responsive primitives in the Golden Acres CRM.

---

## 1. Responsibilities Grid

| Concern | Owner | Details |
| --- | --- | --- |
| **Breakpoints** | Shared UI Primitives | Responsive layouts mapped strictly in CSS / Tailwind classes. |
| **Safe Area** | Shared UI Primitives | Handles Notch and Home indicators via CSS variables (`env(safe-area-inset-top/bottom)`). |
| **Keyboard handling** | Shared UI Primitives | Scroll lock, focus management, independent scrolling containers. |
| **Data fetching** | Feature modules | Business components query Firestore and pass resolved data down. |
| **Business logic** | Feature modules | State transitions, dialer queuing, and user notifications. |
| **Authorization** | `AuthorizationService` | Single source of truth for gating user capabilities. |
| **Project scoping** | `ProjectScopeContext` | Restricts queries to active boundaries. |

---

## 2. API Specifications

### Shared Drawer (`DrawerProps`)
- **Desktop/Tablet Presentation**: Renders as a sliding side panel (`right` or `left`) with explicit width mapping.
- **Mobile Presentation (<768px)**: Automatically converts to a bottom sheet spanning `90vh` height.
- **Internal Safe Area Handling**: Incorporates `env(safe-area-inset-bottom)` inside the footer container.
- **Swipe Handle**: Automatically appends a notch indicator on narrow viewports.

### Shared Modal/Dialog (`ModalProps`)
- **Desktop/Tablet Presentation**: Centered overlay.
- **Mobile Presentation (<640px)**: Transitions into a full-height dialog card (`h-[100dvh]`).
- **Safe Area Anchoring**: Adds notch padding to the header (`pt-[calc(1rem+env(safe-area-inset-top))]`) and home bar spacing to the footer/body.

### ResponsiveDataView (`ResponsiveDataViewProps<T>`)
- **Layout Switcher**: Pure CSS-first wrapper utilizing tailwind hide/show rules.
- **Desktop Delegate**: `DataTable`
- **Mobile Delegate**: `MobileCardList`
- **Single Source of Truth**: Evaluates once; shares data arrays, row selections, and event triggers.

### BottomActionBar (`BottomActionBarProps`)
- **Visibility**: Automatically hidden on viewports 768px and up (`md:hidden`).
- **Layout Structure**: Custom flex list centered container.
- **Safe Area Offset**: Applies `pb-[calc(0.75rem+env(safe-area-inset-bottom))]` internally.
