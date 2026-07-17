import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LeadBriefCard from "./LeadBriefCard";

describe("LeadBriefCard", () => {
  it("shows loading spinner copy", () => {
    render(<LeadBriefCard status="loading" />);
    expect(screen.getByText("Loading brief…")).toBeInTheDocument();
    expect(screen.getByText("Loading")).toBeInTheDocument();
  });

  it("shows AI-off empty state when disabled", () => {
    render(<LeadBriefCard status="disabled" />);
    expect(screen.getByText("AI is off")).toBeInTheDocument();
    expect(screen.getByText("AI off")).toBeInTheDocument();
  });

  it("shows error alert and retry", () => {
    const onRetry = vi.fn();
    render(
      <LeadBriefCard
        status="error"
        errorMessage="AI summary unavailable."
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText("Brief unavailable")).toBeInTheDocument();
    expect(screen.getByText("AI summary unavailable.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders ready AI brief with AI Generated badge (stub source)", () => {
    render(
      <LeadBriefCard
        status="ready"
        source="stub"
        data={{ brief: "Stub brief text", bullets: ["Bullet A"] }}
      />,
    );
    expect(screen.getByText("Stub brief text")).toBeInTheDocument();
    expect(screen.getByText("Bullet A")).toBeInTheDocument();
    expect(screen.getByText("AI Generated")).toBeInTheDocument();
  });

  it("renders ready AI brief with AI Generated badge (llm source)", () => {
    render(
      <LeadBriefCard
        status="ready"
        source="llm"
        data={{ brief: "Live brief text", bullets: ["Bullet B"] }}
      />,
    );
    expect(screen.getByText("Live brief text")).toBeInTheDocument();
    expect(screen.getByText("AI Generated")).toBeInTheDocument();
  });

  it("renders rules fallback with AI-off banner", () => {
    render(
      <LeadBriefCard
        status="ready"
        source="rules"
        usedRulesFallback
        fallbackKind="ai_off"
        data={{ brief: "Rules brief", bullets: ["Next: call"] }}
      />,
    );
    expect(screen.getByText("Rules brief")).toBeInTheDocument();
    expect(screen.getByText("Rules (AI off)")).toBeInTheDocument();
    expect(screen.getByText(/Showing Wave 6 rules brief/i)).toBeInTheDocument();
  });

  it("renders offline fallback badge and banner", () => {
    render(
      <LeadBriefCard
        status="ready"
        source="rules"
        usedRulesFallback
        fallbackKind="offline"
        data={{ brief: "Offline rules" }}
      />,
    );
    expect(screen.getByText("Rules (offline)")).toBeInTheDocument();
    expect(screen.getByText(/You're offline/i)).toBeInTheDocument();
  });

  it("renders error fallback with retry AI brief", () => {
    const onRetry = vi.fn();
    render(
      <LeadBriefCard
        status="ready"
        source="rules"
        usedRulesFallback
        fallbackKind="error"
        errorMessage="AI summary unavailable."
        data={{ brief: "Rules after error" }}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText(/AI unavailable/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry ai brief/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
