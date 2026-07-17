import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SalesCopilotDrawer from "./SalesCopilotDrawer";
import { AI_SUMMARY_UNAVAILABLE } from "./secureCopilotOutput";
import { LEAD_BRIEF_V1_ID } from "@/shared/ai";

const {
  runMock,
  isAiEnabledMock,
  createAiRuntimeMock,
  onlineStatusRef,
  secureLeadBriefOutputMock,
} = vi.hoisted(() => {
  const runMock = vi.fn();
  return {
    runMock,
    isAiEnabledMock: vi.fn(),
    createAiRuntimeMock: vi.fn((_options?: unknown) => ({ run: runMock })),
    onlineStatusRef: { current: true },
    secureLeadBriefOutputMock: vi.fn(),
  };
});

vi.mock("@/shared/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/ai")>();
  return {
    ...actual,
    isAiEnabled: () => isAiEnabledMock() as boolean,
    createAiRuntime: ((options?: unknown) =>
      createAiRuntimeMock(options)) as unknown as typeof actual.createAiRuntime,
  };
});

vi.mock("./useOnlineStatus", () => ({
  useOnlineStatus: () => onlineStatusRef.current,
}));

vi.mock("@/shared/services/AuthorizationContext", () => ({
  useAuthorization: () => ({
    canExecuteProposal: () => true,
    canReadLead: () => true,
    canUpdateLead: () => true,
    canAssignLead: () => true,
    canUseCopilot: () => true,
  }),
}));

vi.mock("./secureCopilotOutput", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./secureCopilotOutput")>();
  return {
    ...actual,
    secureLeadBriefOutput: ((raw: unknown) =>
      secureLeadBriefOutputMock(raw)) as unknown as typeof actual.secureLeadBriefOutput,
  };
});

const rulesBrief = {
  brief: "Wave 6 rules brief for Ada",
  bullets: ["Next action: schedule call"],
};

const updateLeadMock = vi.fn();
const logCallMock = vi.fn();

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  leadId: "lead_1",
  leadName: "Ada Lovelace",
  lead: {
    id: "lead_1",
    name: "Ada Lovelace",
    phone: "9999999999",
    status: "interested",
    priority: "warm",
    assignedTo: "user_2",
    assignedToName: "Current Owner",
    followUpDate: "2026-07-20",
  },
  userId: "user_1",
  actorName: "Grace",
  role: "agent",
  assignableUsers: [
    { id: "user_2", username: "Current Owner" },
    { id: "user_3", username: "Priya" },
  ],
  updateLead: updateLeadMock,
  logCall: logCallMock,
  contextSlots: {
    statusLabel: "Interested",
    scoreBand: "hot",
    health: "ok",
    nextActionType: "schedule_call",
    nextActionReason: "Follow-up due",
    timelineSummary: "Recent call",
    facts: "Budget 50L",
  },
  nextAction: {
    type: "schedule_call",
    reason: "Follow-up due today",
    channel: "call",
  },
  readiness: {
    bookingProbability: 0.35,
    band: "medium",
    gaps: ["No site visit scheduled"],
  },
  timeline: {
    summaryText: "Recent activity",
    items: [{ type: "call_completed", summary: "Connected" }],
  },
  rulesBrief,
};

describe("SalesCopilotDrawer", () => {
  beforeEach(() => {
    onlineStatusRef.current = true;
    isAiEnabledMock.mockReset();
    runMock.mockReset();
    createAiRuntimeMock.mockClear();
    createAiRuntimeMock.mockImplementation(() => ({ run: runMock }));
    secureLeadBriefOutputMock.mockReset();
    updateLeadMock.mockReset();
    logCallMock.mockReset();
    updateLeadMock.mockResolvedValue(undefined);
    logCallMock.mockResolvedValue(undefined);
    // Default: pass-through secure helper (real behavior shape).
    secureLeadBriefOutputMock.mockImplementation((raw: unknown) => {
      if (
        raw &&
        typeof raw === "object" &&
        typeof (raw as { brief?: unknown }).brief === "string" &&
        (raw as { brief: string }).brief.trim()
      ) {
        return { ok: true, data: raw };
      }
      return { ok: false, notice: AI_SUMMARY_UNAVAILABLE };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders drawer chrome and Wave 6 panels when open", async () => {
    isAiEnabledMock.mockReturnValue(false);

    render(<SalesCopilotDrawer {...baseProps} />);

    expect(screen.getByText("Sales Copilot")).toBeInTheDocument();
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(
      screen.getByText(/Recommendations only — no CRM writes/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(rulesBrief.brief)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/schedule call/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Follow-up due today")).toBeInTheDocument();
    expect(screen.getByText("35%")).toBeInTheDocument();
    expect(screen.getByText("No site visit scheduled")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(runMock).not.toHaveBeenCalled();
  });

  it("does not render when closed", () => {
    isAiEnabledMock.mockReturnValue(false);
    const { container } = render(
      <SalesCopilotDrawer {...baseProps} isOpen={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("feature flag off → rules fallback, no orchestrator run", async () => {
    isAiEnabledMock.mockReturnValue(false);

    render(<SalesCopilotDrawer {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText(rulesBrief.brief)).toBeInTheDocument();
    });
    expect(screen.getByText("Rules (AI off)")).toBeInTheDocument();
    expect(createAiRuntimeMock).not.toHaveBeenCalled();
    expect(runMock).not.toHaveBeenCalled();
  });

  it("offline → rules fallback without AI call", async () => {
    onlineStatusRef.current = false;
    isAiEnabledMock.mockReturnValue(true);

    render(<SalesCopilotDrawer {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText(rulesBrief.brief)).toBeInTheDocument();
    });
    expect(screen.getByText("Rules (offline)")).toBeInTheDocument();
    expect(runMock).not.toHaveBeenCalled();
  });

  it("AI enabled → runs lead-brief-v1 via createAiRuntime and shows AI Generated badge", async () => {
    isAiEnabledMock.mockReturnValue(true);
    runMock.mockResolvedValue({
      ok: true,
      source: "stub",
      data: {
        brief: "AI stub brief for Ada",
        bullets: ["Confirm visit"],
      },
    });

    render(<SalesCopilotDrawer {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText("AI stub brief for Ada")).toBeInTheDocument();
    });

    expect(createAiRuntimeMock).toHaveBeenCalled();
    expect(runMock).toHaveBeenCalledWith(
      LEAD_BRIEF_V1_ID,
      expect.objectContaining({
        leadId: "lead_1",
        userId: "user_1",
        role: "agent",
        context: baseProps.contextSlots,
      }),
    );
    expect(screen.getByText("AI Generated")).toBeInTheDocument();
    expect(screen.getByText("Confirm visit")).toBeInTheDocument();
  });

  it("live llm source → AI Generated badge (not rules)", async () => {
    isAiEnabledMock.mockReturnValue(true);
    runMock.mockResolvedValue({
      ok: true,
      source: "llm",
      data: {
        brief: "Live Gemini brief for Ada",
        bullets: ["Ask budget"],
      },
    });

    render(<SalesCopilotDrawer {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText("Live Gemini brief for Ada")).toBeInTheDocument();
    });
    expect(screen.getByText("AI Generated")).toBeInTheDocument();
    expect(screen.queryByText("Rules (AI off)")).not.toBeInTheDocument();
  });

  it("AI unavailable (provider error) → rules fallback with safe copy", async () => {
    isAiEnabledMock.mockReturnValue(true);
    runMock.mockResolvedValue({
      ok: false,
      error: {
        code: "PROVIDER_ERROR",
        message: "SECRET_STACK_TRACE openai key sk-leak",
      },
    });

    render(<SalesCopilotDrawer {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText(rulesBrief.brief)).toBeInTheDocument();
    });

    expect(screen.getByText(/AI unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/AI summary unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/SECRET_STACK_TRACE/)).not.toBeInTheDocument();
    expect(screen.queryByText(/sk-leak/)).not.toBeInTheDocument();
  });

  it("orchestrator SAFETY_VIOLATION → safety banner + rules fallback", async () => {
    isAiEnabledMock.mockReturnValue(true);
    runMock.mockResolvedValue({
      ok: false,
      error: {
        code: "SAFETY_VIOLATION",
        message: "CRM patch detected in provider dump",
      },
    });

    render(<SalesCopilotDrawer {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText("Safety")).toBeInTheDocument();
    });
    expect(screen.getByText(AI_SUMMARY_UNAVAILABLE)).toBeInTheDocument();
    expect(screen.getByText(rulesBrief.brief)).toBeInTheDocument();
    expect(screen.queryByText(/CRM patch detected/)).not.toBeInTheDocument();
  });

  it("display safety failure after ok run → withhold AI payload", async () => {
    isAiEnabledMock.mockReturnValue(true);
    runMock.mockResolvedValue({
      ok: true,
      source: "stub",
      data: { brief: "RAW UNSAFE BRIEF with crmPatch" },
    });
    secureLeadBriefOutputMock.mockReturnValue({
      ok: false,
      notice: AI_SUMMARY_UNAVAILABLE,
    });

    render(<SalesCopilotDrawer {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText("Safety")).toBeInTheDocument();
    });
    expect(screen.queryByText(/RAW UNSAFE BRIEF/)).not.toBeInTheDocument();
    expect(screen.getByText(rulesBrief.brief)).toBeInTheDocument();
  });

  it("AI_DISABLED result → quiet rules fallback (no safety banner)", async () => {
    isAiEnabledMock.mockReturnValue(true);
    runMock.mockResolvedValue({
      ok: false,
      error: { code: "AI_DISABLED", message: "flag off" },
    });

    render(<SalesCopilotDrawer {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText(rulesBrief.brief)).toBeInTheDocument();
    });
    expect(screen.getByText("Rules (AI off)")).toBeInTheDocument();
    expect(screen.queryByText("Safety")).not.toBeInTheDocument();
  });

  it("thrown exception → safe error / rules fallback, no stack leak", async () => {
    isAiEnabledMock.mockReturnValue(true);
    runMock.mockRejectedValue(new Error("INTERNAL provider boom stack"));

    render(<SalesCopilotDrawer {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText(rulesBrief.brief)).toBeInTheDocument();
    });
    expect(screen.queryByText(/INTERNAL provider boom/)).not.toBeInTheDocument();
  });

  it("retry re-invokes orchestrator after error fallback", async () => {
    isAiEnabledMock.mockReturnValue(true);
    runMock
      .mockResolvedValueOnce({
        ok: false,
        error: { code: "PROVIDER_ERROR", message: "fail once" },
      })
      .mockResolvedValueOnce({
        ok: true,
        source: "stub",
        data: { brief: "Recovered AI brief", bullets: [] },
      });

    render(<SalesCopilotDrawer {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText(rulesBrief.brief)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /retry ai brief/i }));

    await waitFor(() => {
      expect(screen.getByText("Recovered AI brief")).toBeInTheDocument();
    });
    expect(runMock).toHaveBeenCalledTimes(2);
  });

  it("passes an abort signal into orchestrator runs", async () => {
    isAiEnabledMock.mockReturnValue(true);
    runMock.mockResolvedValue({
      ok: true,
      source: "stub",
      data: {
        brief: "Abort-aware brief",
        bullets: [],
      },
    });

    render(<SalesCopilotDrawer {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText("Abort-aware brief")).toBeInTheDocument();
    });

    expect(runMock).toHaveBeenCalledWith(
      LEAD_BRIEF_V1_ID,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("aborts in-flight AI work when the drawer closes", async () => {
    isAiEnabledMock.mockReturnValue(true);
    let seenSignal: AbortSignal | undefined;
    runMock.mockImplementation(
      async (_capabilityId: string, input?: { signal?: AbortSignal }) => {
        seenSignal = input?.signal;
        return new Promise(() => undefined);
      },
    );

    const { rerender } = render(<SalesCopilotDrawer {...baseProps} />);

    await waitFor(() => {
      expect(runMock).toHaveBeenCalledTimes(1);
    });
    expect(seenSignal?.aborted).toBe(false);

    rerender(<SalesCopilotDrawer {...baseProps} isOpen={false} />);

    await waitFor(() => {
      expect(seenSignal?.aborted).toBe(true);
    });
  });

  it("no rules brief + AI off → disabled empty state", async () => {
    isAiEnabledMock.mockReturnValue(false);

    render(
      <SalesCopilotDrawer
        {...baseProps}
        rulesBrief={null}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("AI is off")).toBeInTheDocument();
    });
  });

  it("renders executable proposals and confirms a status change", async () => {
    isAiEnabledMock.mockReturnValue(true);
    runMock.mockResolvedValue({
      ok: true,
      source: "llm",
      data: {
        brief: "AI brief with actions",
        proposals: [
          {
            id: "proposal-status-1",
            leadId: "lead_1",
            title: "Move lead to contacted",
            createdAt: "2026-07-14T02:00:00.000Z",
            status: "PENDING_CONFIRMATION",
            type: "STATUS_CHANGE",
            payload: {
              fromStatus: "interested",
              toStatus: "contacted",
              rationale: "Recent call needs a follow-up state update.",
            },
          },
        ],
      },
    });

    render(<SalesCopilotDrawer {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText("Proposed actions")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /review action/i }));
    await waitFor(() => {
      expect(screen.getByText(/confirm status change/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^confirm$/i }));

    await waitFor(() => {
      expect(updateLeadMock).toHaveBeenCalledWith("lead_1", {
        status: "contacted",
      });
    });
    expect(screen.getByText("Action applied")).toBeInTheDocument();
  });

  it("dialog cancel after validation does not execute proposal", async () => {
    isAiEnabledMock.mockReturnValue(true);
    runMock.mockResolvedValue({
      ok: true,
      source: "stub",
      data: {
        brief: "AI brief with note proposal",
        proposals: [
          {
            id: "proposal-note-1",
            leadId: "lead_1",
            title: "Add call summary note",
            createdAt: "2026-07-14T02:05:00.000Z",
            status: "PENDING_CONFIRMATION",
            type: "ADD_NOTE",
            payload: {
              noteText: "Customer requested a callback after lunch.",
            },
          },
        ],
      },
    });

    render(<SalesCopilotDrawer {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText("Proposed actions")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /review action/i }));
    await waitFor(() => {
      expect(screen.getByText(/confirm add note/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => {
      expect(
        screen.queryByText(/confirm add note/i),
      ).not.toBeInTheDocument();
    });
    expect(updateLeadMock).not.toHaveBeenCalled();
    expect(logCallMock).not.toHaveBeenCalled();
  });
});
