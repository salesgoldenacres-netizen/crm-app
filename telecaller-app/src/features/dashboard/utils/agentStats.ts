import { Lead, AttendanceRecord } from "@/shared/types";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
}

export interface AgentStats {
  totalCallsCount: number;
  siteVisitsCount: number;
  streak: number;
  badges: Badge[];
}

export function getAgentBadgesAndStats(
  userId: string,
  username: string,
  leads: Lead[],
  allAttendance: AttendanceRecord[]
): AgentStats {
  // 1. Calculate total calls logged by this agent
  let totalCallsCount = 0;
  leads.forEach((lead) => {
    if (lead.callLogs) {
      lead.callLogs.forEach((log) => {
        if (log.agent === username) {
          totalCallsCount++;
        }
      });
    }
  });

  // 2. Calculate site visits secured by this agent
  let siteVisitsCount = 0;
  leads.forEach((lead) => {
    if (lead.assignedTo === userId) {
      if (lead.status === "site-visit-completed" || lead.status === "site-visit-confirmed") {
        siteVisitsCount++;
      }
    }
  });

  // 3. Calculate streak (consecutive attendance check-ins)
  let streak = 0;
  const userAttendance = allAttendance || [];
  const dates = userAttendance
    .map((a) => a.checkIn.split("T")[0])
    .filter((v, i, self) => self.indexOf(v) === i)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (dates.length > 0) {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    if (dates[0] === today || dates[0] === yesterday) {
      streak = 1;
      for (let i = 0; i < dates.length - 1; i++) {
        const current = new Date(dates[i]);
        const next = new Date(dates[i + 1]);
        const diffTime = Math.abs(current.getTime() - next.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  // 4. Calculate bookings closed by this agent
  const bookedLeads = leads.filter(
    (l) => l.assignedTo === userId && (l.status === "booked" || l.status === "reserved")
  ).length;

  // 5. Calculate rejections handled by this agent
  const rejectedLeads = leads.filter(
    (l) => l.assignedTo === userId && (l.status === "not-interested" || l.status === "not_interested")
  ).length;

  // 6. Define achievements and badges
  // icon keys map to Lucide in AgentProfileView (no persistent emoji)
  const badges: Badge[] = [
    {
      id: "welcome",
      name: "Welcome Aboard",
      description: "Completed your first check-in.",
      icon: "hand",
      unlocked: userAttendance.length >= 1,
      progress: userAttendance.length,
      target: 1,
    },
    {
      id: "dialer_pro",
      name: "Dialer Pro",
      description: "Logged 50 calls.",
      icon: "phone",
      unlocked: totalCallsCount >= 50,
      progress: totalCallsCount,
      target: 50,
    },
    {
      id: "phone_warrior",
      name: "Phone Warrior",
      description: "Logged 200 calls.",
      icon: "swords",
      unlocked: totalCallsCount >= 200,
      progress: totalCallsCount,
      target: 200,
    },
    {
      id: "visit_master",
      name: "Visit Master",
      description: "Secured 5 site visits.",
      icon: "map",
      unlocked: siteVisitsCount >= 5,
      progress: siteVisitsCount,
      target: 5,
    },
    {
      id: "first_booking",
      name: "First Booking",
      description: "Closed your first property sale.",
      icon: "trophy",
      unlocked: bookedLeads >= 1,
      progress: bookedLeads,
      target: 1,
    },
    {
      id: "top_closer",
      name: "Top Closer",
      description: "Closed 5 property sales.",
      icon: "crown",
      unlocked: bookedLeads >= 5,
      progress: bookedLeads,
      target: 5,
    },
    {
      id: "rejection_warrior",
      name: "Rejection Warrior",
      description: "Handled 10 not-interested leads.",
      icon: "shield",
      unlocked: rejectedLeads >= 10,
      progress: rejectedLeads,
      target: 10,
    },
    {
      id: "elite_agent",
      name: "Elite Agent",
      description: "Closed 10 property sales.",
      icon: "gem",
      unlocked: bookedLeads >= 10,
      progress: bookedLeads,
      target: 10,
    },
  ];

  return {
    totalCallsCount,
    siteVisitsCount,
    streak,
    badges,
  };
}
