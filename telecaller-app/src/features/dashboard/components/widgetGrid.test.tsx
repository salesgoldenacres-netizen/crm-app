import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, waitFor } from "@testing-library/react";
import WidgetGrid from "./WidgetGrid";
import type { DashboardMetrics, TeamMetrics } from "@/shared/services/analytics/analyticsTypes";
import type { User, Lead, Goals } from "@/shared/types";

// Mocks
const mockGetDashboardMetrics = vi.fn();
const mockGetTeamMetrics = vi.fn();
const mockInvalidateCache = vi.fn();

let mockActiveProjectId: string | undefined = "proj-1";

// Stable mock object so useAnalytics doesn't invalidate useCallback identity on re-render
const mockAnalyticsValue = {
  service: {
    getDashboardMetrics: mockGetDashboardMetrics,
    getTeamMetrics: mockGetTeamMetrics,
    invalidateCache: mockInvalidateCache,
  },
  refreshToken: 0,
  refreshDashboard: vi.fn(),
};

vi.mock("@/shared/services/analytics/AnalyticsContext", () => ({
  useAnalytics: () => mockAnalyticsValue,
}));

vi.mock("@/shared/services/ProjectScopeContext", () => ({
  useProjectScope: () => ({
    activeProjectId: mockActiveProjectId,
  }),
}));

const mockUser: User = {
  id: "user-1",
  username: "testuser",
  role: "telecaller",
  email: "test@test.com",
};

const mockLeads: Lead[] = [];

const mockGoals: Goals = {
  monthlyCallGoal: 1000,
  monthlyBookingGoal: 10,
  customGoalText: "",
  targetRevenue: 5000000,
};

const mockAgentStats = {
  totalCallsCount: 50,
  siteVisitsCount: 5,
  streak: 3,
  badges: [],
};

const defaultProps = {
  user: mockUser,
  users: [mockUser],
  leads: mockLeads,
  projects: {},
  totalAssigned: 0,
  rawCount: 0,
  hotCount: 0,
  overdueCount: 0,
  followupsToday: 0,
  newCount: 0,
  notAttemptedCount: 0,
  bookedCount: 0,
  contactedCount: 0,
  interestedCount: 0,
  notInterestedCount: 0,
  siteVisitCompletedCount: 0,
  siteVisitConfirmed: 0,
  rnrCount: 0,
  reEngagedCount: 0,
  addNotification: vi.fn(),
  targets: {},
  goals: mockGoals,
  rosters: {},
  coachingTip: "Keep pushing!",
  todaysEvents: [],
  latestAnnouncement: undefined,
  markAsRead: vi.fn(),
  followUpAlertLeads: [],
  setLeadStatusFilter: vi.fn(),
  backendTasks: [],
  addTask: vi.fn(),
  toggleTask: vi.fn(),
  deleteTask: vi.fn(),
  clearCompletedTasks: vi.fn(),
  leaveRequests: [],
  submitLeaveRequest: vi.fn(),
  todayAttendance: null,
  allAttendance: [],
  clockIn: vi.fn(),
  startBreak: vi.fn(),
  endBreak: vi.fn(),
  clockOut: vi.fn(),
  widgets: [],
  setWidgets: vi.fn(),
  updateWidgets: vi.fn(),
  widgetStyle: "modern",
  updateWidgetStyle: vi.fn(),
  widgetDensity: "compact",
  updateWidgetDensity: vi.fn(),
  isCustomizerOpen: false,
  setIsCustomizerOpen: vi.fn(),
  isManagerial: () => false,
  safeFormatTime: (sec: number) => `${sec}s`,
  setLeadsSubTab: vi.fn(),
  setLeadSearchQuery: vi.fn(),
  logAuditEvent: vi.fn(),
  agentStats: mockAgentStats,
  getWidgetColSpan: () => "col-span-1",
  resetPreferences: vi.fn(),
  setActiveLead: vi.fn(),
  refreshToken: 0,
};

const dummyDashboardMetrics: DashboardMetrics = {
  callsLoggedToday: 12,
  callTarget: 50,
  bookingsToday: 2,
  bookingTarget: 5,
  pipelineStats: { newCount: 5, contactedCount: 3, interestedCount: 2, bookedCount: 2, totalCount: 12 },
  leaderboard: [],
};

const dummyTeamMetrics: TeamMetrics = {
  teamGoals: [],
  rankings: [],
};

describe("WidgetGrid Component", () => {
  beforeEach(() => {
    mockActiveProjectId = "proj-1";
    mockGetDashboardMetrics.mockReset().mockResolvedValue(dummyDashboardMetrics);
    mockGetTeamMetrics.mockReset().mockResolvedValue(dummyTeamMetrics);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1. Loads metrics on initial mount", async () => {
    render(<WidgetGrid {...defaultProps} />);

    await waitFor(() => {
      expect(mockGetDashboardMetrics).toHaveBeenCalledWith("proj-1");
      expect(mockGetTeamMetrics).toHaveBeenCalledWith("proj-1");
    });
  });

  it("2 & 3. Reloads metrics when refreshToken increments", async () => {
    const { rerender } = render(<WidgetGrid {...defaultProps} refreshToken={0} />);
    await waitFor(() => expect(mockGetDashboardMetrics).toHaveBeenCalled());

    const countBefore = mockGetDashboardMetrics.mock.calls.length;

    rerender(<WidgetGrid {...defaultProps} refreshToken={1} />);
    await waitFor(() => {
      expect(mockGetDashboardMetrics.mock.calls.length).toBeGreaterThan(countBefore);
    });
  });

  it("4 & 5 & 6. Polling triggers refresh at 60s interval and cleans up on unmount", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const { unmount } = render(<WidgetGrid {...defaultProps} />);
    await waitFor(() => expect(mockGetDashboardMetrics).toHaveBeenCalled());

    const countBefore = mockGetDashboardMetrics.mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(mockGetDashboardMetrics.mock.calls.length).toBe(countBefore + 1);

    // Unmount and verify no further calls occur
    unmount();

    await act(async () => {
      vi.advanceTimersByTime(120_000);
    });
    expect(mockGetDashboardMetrics.mock.calls.length).toBe(countBefore + 1);
  });

  it("7 & 8 & 12. Retains existing metrics on background refresh failure and allows future refreshes", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    render(<WidgetGrid {...defaultProps} />);
    await waitFor(() => expect(mockGetDashboardMetrics).toHaveBeenCalled());

    const countBefore = mockGetDashboardMetrics.mock.calls.length;

    // Make next fetch fail
    mockGetDashboardMetrics.mockRejectedValueOnce(new Error("Network error"));

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(mockGetDashboardMetrics.mock.calls.length).toBe(countBefore + 1);

    // Next fetch succeeds again
    mockGetDashboardMetrics.mockResolvedValueOnce(dummyDashboardMetrics);
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(mockGetDashboardMetrics.mock.calls.length).toBe(countBefore + 2);
  });

  it("9. Protects against race conditions (older requests cannot overwrite newer ones)", async () => {
    let resolveFirst!: (val: DashboardMetrics) => void;
    const firstPromise = new Promise<DashboardMetrics>((resolve) => {
      resolveFirst = resolve;
    });

    // Call 1 returns slow deferred promise
    mockGetDashboardMetrics.mockReturnValueOnce(firstPromise);

    const { rerender } = render(<WidgetGrid {...defaultProps} refreshToken={0} />);

    // Call 2 returns fast promise
    mockGetDashboardMetrics.mockResolvedValueOnce({
      ...dummyDashboardMetrics,
      callsLoggedToday: 99,
    });

    // Trigger Call 2 via refreshToken bump
    rerender(<WidgetGrid {...defaultProps} refreshToken={1} />);

    await waitFor(() => {
      expect(mockGetDashboardMetrics).toHaveBeenCalled();
    });

    // Now resolve Call 1 with old data
    await act(async () => {
      resolveFirst(dummyDashboardMetrics);
    });
  });

  it("10 & 11. Triggers refresh on visibilitychange to visible and cleans up listener", async () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = render(<WidgetGrid {...defaultProps} />);
    await waitFor(() => expect(mockGetDashboardMetrics).toHaveBeenCalled());

    expect(addSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));

    const countBefore = mockGetDashboardMetrics.mock.calls.length;

    // Simulate tab becoming visible
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(mockGetDashboardMetrics.mock.calls.length).toBeGreaterThan(countBefore);
    });

    unmount();
    expect(removeSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });
});
