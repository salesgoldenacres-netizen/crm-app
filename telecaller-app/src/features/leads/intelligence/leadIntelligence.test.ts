import { describe, it, expect } from "vitest";
import {
  LEAD_SCORE_FACTOR_IDS,
  LEAD_SCORE_VERSION_V1,
  decideLeadHealthBand,
  scoreToBand,
} from "@/shared/contracts";
import {
  leadScoreV1,
  leadHealthV1,
  nextActionV1,
  rankDailyPriorities,
  computeLeadIntelligence,
  daysAgoYmd,
} from "./index";

const TODAY = "2026-07-14";

describe("leadScoreV1", () => {
  it("fixes booked at 100 and not-interested at 0", () => {
    expect(leadScoreV1({ status: "booked" }, { todayYmd: TODAY }).score).toBe(
      100,
    );
    expect(
      leadScoreV1({ status: "not-interested" }, { todayYmd: TODAY }).score,
    ).toBe(0);
  });

  it("boosts manual hot and follow-up today", () => {
    const result = leadScoreV1(
      {
        status: "interested",
        priority: "hot",
        followUpDate: TODAY,
        updatedAt: `${TODAY}T10:00:00+05:30`,
      },
      { todayYmd: TODAY },
    );
    expect(result.version).toBe(LEAD_SCORE_VERSION_V1);
    expect(result.scoreBand).toBe("hot");
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(
      result.scoreFactors.some((f) => f.id === LEAD_SCORE_FACTOR_IDS.MANUAL_HOT),
    ).toBe(true);
    expect(
      result.scoreFactors.some(
        (f) => f.id === LEAD_SCORE_FACTOR_IDS.FOLLOWUP_TODAY,
      ),
    ).toBe(true);
  });

  it("applies overdue and idle penalties/boosts", () => {
    const overdue = leadScoreV1(
      {
        status: "contacted",
        priority: "warm",
        followUpDate: daysAgoYmd(3, TODAY),
        updatedAt: `${TODAY}T10:00:00+05:30`,
      },
      { todayYmd: TODAY },
    );
    expect(
      overdue.scoreFactors.some(
        (f) => f.id === LEAD_SCORE_FACTOR_IDS.FOLLOWUP_OVERDUE,
      ),
    ).toBe(true);

    const idle = leadScoreV1(
      {
        status: "contacted",
        priority: "warm",
        followUpDate: TODAY,
        updatedAt: `${daysAgoYmd(8, TODAY)}T10:00:00+05:30`,
      },
      { todayYmd: TODAY },
    );
    expect(
      idle.scoreFactors.some((f) => f.id === LEAD_SCORE_FACTOR_IDS.IDLE_7D),
    ).toBe(true);
  });

  it("maps bands via scoreToBand", () => {
    expect(scoreToBand(70)).toBe("hot");
    expect(scoreToBand(40)).toBe("warm");
    expect(scoreToBand(39)).toBe("cold");
  });
});

describe("leadHealthV1 / decideLeadHealthBand", () => {
  it("marks critical for overdue ≥2d", () => {
    const h = leadHealthV1(
      {
        status: "interested",
        followUpDate: daysAgoYmd(2, TODAY),
        updatedAt: `${TODAY}T10:00:00+05:30`,
      },
      TODAY,
    );
    expect(h.health).toBe("critical");
  });

  it("marks watch for missing FU", () => {
    const decided = decideLeadHealthBand({
      overdueDays: 0,
      staleDays: 0,
      missingFollowUp: true,
      manualHot: false,
      isTerminal: false,
    });
    expect(decided.health).toBe("watch");
  });

  it("keeps terminal healthy", () => {
    const h = leadHealthV1(
      { status: "booked", followUpDate: daysAgoYmd(10, TODAY) },
      TODAY,
    );
    expect(h.health).toBe("healthy");
  });
});

describe("nextActionV1", () => {
  it("suggests schedule_visit for interested without siteVisit", () => {
    const { nextAction } = nextActionV1(
      { status: "interested", followUpDate: daysAgoYmd(5, TODAY) },
      { todayYmd: TODAY },
    );
    // overdue FU wins over schedule_visit (priority 4 before... wait table:
    // 3 interested no siteVisit, 4 FU overdue
    // interested + overdue: rule 3 matches first (interested no siteVisit) before FU
    expect(nextAction.type).toBe("schedule_visit");
  });

  it("suggests call for follow-up today", () => {
    const { nextAction } = nextActionV1(
      { status: "contacted", followUpDate: TODAY },
      { todayYmd: TODAY },
    );
    expect(nextAction.type).toBe("call");
    expect(nextAction.channel).toBe("phone");
  });

  it("suggests merge_review for managerial duplicate", () => {
    const { nextAction } = nextActionV1(
      { status: "new" },
      {
        todayYmd: TODAY,
        isManagerial: true,
        duplicateRisk: "confirmed",
      },
    );
    expect(nextAction.type).toBe("merge_review");
  });
});

describe("rankDailyPriorities", () => {
  it("orders critical before healthy and excludes terminal lost/won booked", () => {
    const ranked = rankDailyPriorities(
      [
        {
          id: "a",
          status: "contacted",
          priority: "warm",
          followUpDate: TODAY,
          updatedAt: `${TODAY}T12:00:00+05:30`,
        },
        {
          id: "b",
          status: "interested",
          priority: "hot",
          followUpDate: daysAgoYmd(3, TODAY),
          updatedAt: `${TODAY}T12:00:00+05:30`,
        },
        {
          id: "c",
          status: "booked",
          priority: "hot",
          followUpDate: TODAY,
        },
        {
          id: "d",
          status: "not-interested",
          priority: "cold",
        },
      ],
      { todayYmd: TODAY, limit: 10 },
    );
    expect(ranked.map((r) => r.leadId)).not.toContain("c");
    expect(ranked.map((r) => r.leadId)).not.toContain("d");
    expect(ranked[0].leadId).toBe("b");
    expect(ranked[0].intelligence.health).toBe("critical");
  });
});

describe("computeLeadIntelligence", () => {
  it("returns versioned snapshot with factors and next action", () => {
    const intel = computeLeadIntelligence(
      {
        id: "x1",
        status: "new",
        priority: "warm",
        phone: "9876543210",
        followUpDate: TODAY,
        updatedAt: `${TODAY}T09:00:00+05:30`,
      },
      { todayYmd: TODAY },
    );
    expect(intel.version).toBe(LEAD_SCORE_VERSION_V1);
    expect(intel.nextAction.type).toBe("call");
    expect(intel.summary?.source).toBe("rules");
    expect(intel.scoreFactors.length).toBeGreaterThan(0);
  });
});
