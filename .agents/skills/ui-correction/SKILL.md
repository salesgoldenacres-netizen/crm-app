---
name: ui-correction
description: Systematically audit and repair user interface defects, including text clipping/overflow in buttons, misaligned layouts, responsive wrapping errors, and styling inconsistencies.
---

# UI Correction & Layout Polish Guide

This skill provides step-by-step instructions for identifying, debugging, and correcting layout anomalies, text overflows, button clipping, responsive mismatches, and styling inconsistencies in web applications.

---

## How to Invoke

When a user reports a UI layout bug, or when auditing the frontend:

```
/ui-correction
```

To target a specific component or page:

```
/ui-correction [filepath]
```

To run a project-wide inspection:

```
/ui-correction audit
```

---

## Section 1: Layout & Formatting Basics

Locate the target UI code and audit for these basic formatting defects:

### A. Text Overflow & Wrapping Errors
*   **Defect:** Text runs outside its container boundaries, gets clipped, or causes unwanted horizontal scrollbars.
*   **Checklist:**
    *   [ ] **Set Bounds**: Does the container have a defined `width` or `max-width`? (Text overflow properties often require a constrained container to function).
    *   [ ] **Single-Line Truncation**: For single-line text (like names, titles, or prices in buttons/cards), apply the ellipsis pattern:
        *   *Tailwind:* `truncate`
        *   *CSS:* `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`
    *   [ ] **Multi-Line Truncation**: Limit paragraphs or descriptions to a specific height:
        *   *Tailwind:* `line-clamp-2` or `line-clamp-3`
        *   *CSS:* `display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;`
    *   [ ] **Handle Long Words**: If URLs or strings break container margins:
        *   *Tailwind:* `break-words`
        *   *CSS:* `overflow-wrap: break-word; word-break: break-word;`

### B. Button & Interactive Element Anomalies
*   **Defect:** Text inside buttons is cut off, wraps awkwardly to a second line, or defaults to native browser styling.
*   **Checklist:**
    *   [ ] **Reset Default Styles**: Avoid relying on default backgrounds/borders. Set explicit backgrounds and borders, or use `appearance: none;` on form elements.
    *   [ ] **Prevent Wrapping**: If button text should remain on a single line, use `whitespace-nowrap`.
    *   [ ] **Prefer Padding Over Fixed Heights**: Never use hardcoded heights (like `h-10`) on buttons. Use vertical padding (`py-2`) combined with `flex items-center justify-center` so buttons scale naturally with font sizes and line heights.
    *   [ ] **Touch Targets**: Ensure touch regions have a minimum area of 44px x 44px (or 48px x 48px) for mobile compliance.

### C. Flexbox & Grid Axis Quirks
*   **Defect:** Items align unevenly, stretch unexpectedly, or shrink below readable sizes.
*   **Checklist:**
    *   [ ] **Flexbox Axis Check**: Double-check `justify-content` (main axis) and `align-items` (cross axis) combinations.
    *   [ ] **Default Stretch**: Remember that `align-items: stretch` is the default for flex items. Override it with `align-items: center` or `align-items: flex-start` if children should retain their own height.
    *   [ ] **Box-Sizing Reset**: Ensure `box-sizing: border-box` is active globally. Padding and borders should not expand a container's set size.
    *   [ ] **Flex-Shrink Protection**: Prevent icons or key labels from shrinking below their intrinsic sizes in tight flex layouts by applying `flex-shrink-0` (or `flex-shrink: 0;`).

---

## Section 2: Advanced Stacking & Layout Stability

Audit for deep layout bugs, structural shifting, and stacking order anomalies:

### A. Z-Index & Stacking Context Isolation
*   **Defect:** An element with a high `z-index` (e.g. `z-index: 9999`) remains hidden behind a sibling with a lower `z-index`.
*   **Checklist:**
    *   [ ] **Identify Stacking Context Creators**: Remember that `z-index` only works on positioned elements (`position: relative, absolute, fixed, sticky`). Check if parent or sibling containers create a new stacking context that traps child elements. Properties that isolate children:
        *   `opacity` (less than 1)
        *   `transform` (other than `none`)
        *   `filter` (other than `none`)
        *   `mix-blend-mode`
        *   `will-change`
        *   `position: fixed` or `position: sticky` (on modern mobile engines)
    *   [ ] **Avoid Magic Numbers**: Do not use random large numbers (like `z-[999999]`). Maintain a local layer scale:
        *   `z-0` to `z-10`: Normal page layout
        *   `z-20` to `z-30`: Sticky headers / dropdowns
        *   `z-40` to `z-50`: Modals / overlays
    *   [ ] **DOM Ordering**: Whenever possible, structure the DOM so that components that should sit on top appear later in the HTML source order.

### B. Cumulative Layout Shift (CLS) Prevention
*   **Defect:** Elements move or jump around as the page loads, causing accidental clicks.
*   **Checklist:**
    *   [ ] **Reserving Image Space**: Always define explicit `width` and `height` dimensions on image elements or set the CSS `aspect-ratio` property to reserve space while the image loads.
    *   [ ] **Dynamic Widgets & Banners**: For content injected asynchronously (such as loaded maps, cards, or user profiles), wrap them in wrapper divs with a fixed `min-height` to prevent page reflows.
    *   [ ] **Animation Offsets**: Avoid animating properties that trigger page reflows (like `top`, `left`, `margin`, `padding`, `width`, `height`). Utilize compositor-friendly CSS properties for animations:
        *   Use `transform: translate(x, y)` instead of `top` / `left`.
        *   Use `transform: scale(s)` instead of `width` / `height`.
        *   Use `opacity` instead of `visibility`.

### C. Visual Debugging Hacks
*   **The Temporary Outline Border Trick**: When debugging container boundaries, margin collapses, or scrollbar leaks:
    *   Apply a temporary style:
        ```css
        * {
          outline: 1px solid red !important;
        }
        ```
    *   This outlines every box on the page, highlighting hidden padding boundaries, margins, and overflow leaks.
    *   **CRITICAL RULE**: Do not save this style in production files. Apply it only in browser devtools or locally, and revert it immediately before executing builds or committing code.
*   **Computed Style Audit**: Always verify the final rendered styles inside Chrome/Browser DevTools -> "Computed" panel to verify if style overrides or CSS specificity collisions are striking out your styling rules.
