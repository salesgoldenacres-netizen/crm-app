import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

vi.mock("@/shared/services/auth", () => ({
  loginWithEmailAndPassword: vi.fn(),
  loginWithGoogle: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock("@/shared/utils/analytics", () => ({
  logAnalyticsEvent: vi.fn(),
}));

vi.mock("@/features/admin/hooks/useBrandingStore", () => ({
  useBrandingStore: () => ({
    branding: {
      companyName: "Golden Acres",
      tagline: "Golden Acres Real Estate Portal",
    },
  }),
}));

vi.mock("@/features/settings/components/ThemeToggle", () => ({
  default: () => <button type="button">Theme</button>,
}));

describe("Login page smoke", () => {
  it("renders sign-in shell with branding and username field", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
    expect(screen.getByText(/Golden Acres Real Estate Portal/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Sign in$/i })).toBeInTheDocument();
  });
});
