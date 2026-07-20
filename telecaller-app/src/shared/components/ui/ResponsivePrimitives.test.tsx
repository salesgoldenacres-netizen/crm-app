import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Drawer from "./Drawer";
import Modal from "./Modal";
import ResponsiveDataView from "../ResponsiveDataView";
import BottomActionBar from "./BottomActionBar";

// Mock useOverlayFocus as it requires DOM APIs and focus management that might error in JSDOM
vi.mock("./Modal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./Modal")>();
  return {
    ...actual,
    useOverlayFocus: () => {},
  };
});

describe("Responsive UI Primitives", () => {
  describe("Drawer Responsive Behavior", () => {
    it("renders drawer with bottom sheet slide up animation on mobile viewports", () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={() => {}} title="Test Drawer">
          <div>Content</div>
        </Drawer>
      );
      
      // Verify motion classes contain animate-sheetSlideUp for bottom sheet transition
      const panel = container.querySelector('[role="dialog"]');
      expect(panel).toBeDefined();
      expect(panel?.className).toContain("animate-sheetSlideUp");
    });

    it("renders mobile swipe handle indicator inside the drawer content", () => {
      const { container } = render(
        <Drawer isOpen={true} onClose={() => {}} title="Test Drawer">
          <div>Content</div>
        </Drawer>
      );

      // Verify indicator bar exists for swipe representation
      const handle = container.querySelector(".bg-theme-border");
      expect(handle).toBeDefined();
      expect(handle?.className).toContain("h-1");
    });
  });

  describe("Modal / Dialog Responsive Behavior", () => {
    it("sheet variant: full-screen layout wrapper for narrow mobile viewports", () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal" variant="sheet">
          <div>Content</div>
        </Modal>
      );

      // Verify mobile-specific height and spacing layout classes are applied
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog?.className).toContain("h-[100dvh]");
      expect(dialog?.className).toContain("rounded-t-theme");
    });

    it("center variant: dialog chrome at all breakpoints (no mobile sheet height)", () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal" variant="center">
          <div>Content</div>
        </Modal>
      );

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog?.className).toContain("rounded-theme");
      expect(dialog?.className).not.toContain("h-[100dvh]");
    });

    it("sheet variant: includes safe area padding adjustments in body container", () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal" variant="sheet">
          <div>Content</div>
        </Modal>
      );

      const body = container.querySelector(".flex-1");
      expect(body?.className).toContain("pb-[calc(1.25rem+env(safe-area-inset-bottom))]");
    });
  });

  describe("ResponsiveDataView Switcher", () => {
    const columns = [
      { key: "name", header: "Name" },
      { key: "phone", header: "Phone" }
    ];
    const data = [
      { name: "John Doe", phone: "1234567890" }
    ];

    it("renders both desktop table layout and mobile card list layout for CSS-first delivery", async () => {
      render(
        <ResponsiveDataView
          columns={columns}
          data={data}
          getRowKey={(row) => row.name}
        />
      );

      // Allow lazy-loaded renderers to resolve asynchronously
      await waitFor(
        () => {
          expect(screen.queryAllByText("John Doe").length).toBeGreaterThanOrEqual(2);
        },
        { timeout: 3000 }
      );
      expect(screen.queryAllByText("Phone").length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("BottomActionBar Component", () => {
    it("mounts actions container with mobile responsive utility classes and safe area support", () => {
      const { container } = render(
        <BottomActionBar>
          <button>Submit</button>
        </BottomActionBar>
      );

      const bar = container.firstChild as HTMLElement;
      expect(bar.className).toContain("md:hidden");
      expect(bar.className).toContain("pb-[calc(0.75rem+env(safe-area-inset-bottom))]");
      expect(screen.getByText("Submit")).toBeDefined();
    });
  });
});
