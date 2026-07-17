import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NextActionCard from "./NextActionCard";
import ReadinessCard from "./ReadinessCard";
import TimelineHighlights from "./TimelineHighlights";
import CopilotAlert from "./CopilotAlert";

describe("NextActionCard", () => {
  it("shows empty state when no data", () => {
    render(<NextActionCard />);
    expect(screen.getByText("No next action")).toBeInTheDocument();
  });

  it("renders type, reason, and channel", () => {
    render(
      <NextActionCard
        type="schedule_call"
        reason="Follow-up due today"
        channel="call"
      />,
    );
    expect(screen.getByText(/schedule call/i)).toBeInTheDocument();
    expect(screen.getByText("Follow-up due today")).toBeInTheDocument();
    expect(screen.getByText("call")).toBeInTheDocument();
  });
});

describe("ReadinessCard", () => {
  it("shows empty state when no data", () => {
    render(<ReadinessCard />);
    expect(screen.getByText("Readiness unavailable")).toBeInTheDocument();
  });

  it("renders probability, band, and gaps", () => {
    render(
      <ReadinessCard
        bookingProbability={0.42}
        band="medium"
        gaps={["Missing follow-up date"]}
      />,
    );
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
    expect(screen.getByText("Missing follow-up date")).toBeInTheDocument();
  });
});

describe("TimelineHighlights", () => {
  it("shows empty state when no activity", () => {
    render(<TimelineHighlights />);
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
  });

  it("renders summary and items", () => {
    render(
      <TimelineHighlights
        summaryText="Recent activity summary"
        items={[
          {
            type: "call_completed",
            summary: "Connected",
            timestamp: "2026-07-14T10:00:00.000Z",
          },
        ]}
      />,
    );
    expect(screen.getByText("Recent activity summary")).toBeInTheDocument();
    expect(screen.getByText(/Connected/)).toBeInTheDocument();
    expect(screen.getByText(/call completed/i)).toBeInTheDocument();
  });
});

describe("CopilotAlert", () => {
  it("renders role=alert with title and children", () => {
    render(
      <CopilotAlert tone="warning" title="Safety">
        AI summary unavailable.
      </CopilotAlert>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Safety");
    expect(alert).toHaveTextContent("AI summary unavailable.");
  });
});
