# Wave 8 Phase 2B Release Notes

## Overview

Wave 8 Phase 2B delivers responsive adaptation across the Golden Acres CRM without altering the locked DLS v1.4 tokens, business rules, or database schemas.

## Key Changes

- **Responsive Drawer & Modal**: Updated `Drawer.tsx` and `Modal.tsx` to display as bottom/full sheets on mobile, complete with touch swipe handles and safe area spacing.
- **Responsive Tables**: Shipped generic `MobileCardList` and `ResponsiveDataView` to render tables responsively using a CSS-first layout switcher.
- **Sticky Actions**: Integrated slot-based `BottomActionBar` on `LeadDetailsPage.tsx` containing dial, WhatsApp, copilot, and template actions.
- **iOS Zoom Prevention**: Set input classes to `text-base` on mobile and `sm:text-sm` on desktop.
