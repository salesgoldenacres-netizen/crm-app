export interface DashboardMetrics {
  callsLoggedToday: number;
  callTarget: number;
  bookingsToday: number;
  bookingTarget: number;
  pipelineStats: {
    newCount: number;
    contactedCount: number;
    interestedCount: number;
    bookedCount: number;
    totalCount: number;
  };
  leaderboard: {
    agentName: string;
    callsCount: number;
    bookingsCount: number;
  }[];
}

export interface ActivityMetrics {
  callsCompleted: number;
  followupsDue: number;
  dialerMinutes: number;
  timelineActivities: {
    id: string;
    type: string;
    timestamp: string;
    description: string;
  }[];
}

export interface LeadPipelineMetrics {
  stages: Record<string, number>;
  totalCount: number;
  unassignedCount: number;
}

export interface BookingMetrics {
  totalBookings: number;
  bookingTarget: number;
  totalReserved: number;
  conversionRate: number;
}

export interface TeamMetrics {
  teamGoals: {
    target: number;
    achieved: number;
    label: string;
  }[];
  rankings: {
    username: string;
    achievementPct: number;
  }[];
}

export interface ProjectMetrics {
  projectId: string;
  projectName: string;
  totalLeads: number;
  bookedCount: number;
  activeTarget: number;
}
