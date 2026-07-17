/**
 * performanceUtils.ts
 * Deterministic helpers for calculating agent performance points,
 * stats, and badge unlocks. Kept out of React components to keep
 * rendering code clean and logic easily unit-testable.
 */

import { User, Lead } from "@/shared/types";

export interface AgentPerformance {
  points: number;
  callsCount: number;
  bookingsCount: number;
  interestedCount: number;
  badges: string[];
}

/**
 * Calculates full performance metrics for a single telecaller agent.
 */
export function getAgentPoints(telecaller: User, leads: Lead[]): AgentPerformance {
  let points = 0;
  let callsCount = 0;
  let bookingsCount = 0;
  let interestedCount = 0;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const agentLeads = leads.filter((l) => l.assignedTo === telecaller.id);
  const assignedLeadsCount = agentLeads.length;

  const userLogs: { date?: string; status?: string; agent?: string }[] = [];
  leads.forEach((l) => {
    if (l.assignedTo === telecaller.id) {
      if (l.status === "interested") {
        points += 10;
        interestedCount++;
      } else if (["booked", "reserved"].includes(l.status)) {
        points += 50;
        bookingsCount++;
      }
    }
    (l.callLogs || []).forEach((log) => {
      if (log.agent === telecaller.username) {
        points += 1;
        callsCount++;
        userLogs.push(log);
      }
    });
  });

  // Current month calls
  const currentMonthCalls = userLogs.filter((log) => {
    if (!log.date) return false;
    const d = new Date(log.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  // Max calls in a single day
  const callsByDay: Record<string, number> = {};
  userLogs.forEach((log) => {
    if (!log.date) return;
    const dayStr = log.date.split("T")[0];
    callsByDay[dayStr] = (callsByDay[dayStr] || 0) + 1;
  });
  const maxCallsInADay =
    Object.values(callsByDay).length > 0
      ? Math.max(...Object.values(callsByDay))
      : 0;

  // Weekly calls count (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklyCalls = userLogs.filter((log) => {
    if (!log.date) return false;
    const d = new Date(log.date);
    return d >= sevenDaysAgo;
  }).length;

  // Site visits secured
  const siteVisits = agentLeads.filter(
    (l) =>
      ["site-visit-completed", "site-visit-confirmed"].includes(l.status) ||
      (l as any).siteVisit
  ).length;

  // Current month bookings
  const currentMonthBookings = agentLeads.filter((l) => {
    if (!["booked", "reserved"].includes(l.status)) return false;
    const bookingLogs = (l.callLogs || []).filter(
      (log) =>
        ["booked", "reserved"].includes(log.status) &&
        log.agent === telecaller.username
    );
    if (bookingLogs.length > 0) {
      return bookingLogs.some((log) => {
        if (!log.date) return false;
        const d = new Date(log.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    } else {
      const d = new Date(l.updatedAt || l.createdAt || "");
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }
  }).length;

  // Rejections
  const rejections = agentLeads.filter(
    (l) => l.status === "not-interested"
  ).length;

  // Badge unlocks
  const badges: string[] = [];
  if (assignedLeadsCount >= 1) badges.push("Welcome Aboard 🤝");
  if (bookingsCount >= 1) badges.push("First Booking 🏆");
  if (currentMonthBookings >= 5) badges.push("Top Closer 👑");
  if (currentMonthCalls >= 7500) badges.push("Dialer Pro 📞");
  if (maxCallsInADay >= 200) badges.push("Phone Warrior 🔥");
  if (siteVisits >= 5) badges.push("Visit Master 📅");
  if (rejections >= 10) badges.push("Rejection Warrior 💪");
  if (weeklyCalls >= 1500) badges.push("Elite Agent 💎");

  return { points, callsCount, bookingsCount, interestedCount, badges };
}
