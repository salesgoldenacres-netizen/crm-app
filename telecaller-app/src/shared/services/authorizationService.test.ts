import { describe, it, expect } from "vitest";
import { AuthorizationService } from "./authorizationService";
import { User, Lead } from "@/shared/types";

describe("AuthorizationService", () => {
  const managerUser: User = {
    id: "user-mgr",
    username: "manager",
    role: "middle_management",
    email: "mgr@example.com",
    allowedProjects: ["project-a"],
  };

  const legacyUser: User = {
    id: "user-leg",
    username: "legacy",
    role: "telecaller",
    email: "leg@example.com",
    // allowedProjects is undefined (legacy mode)
  };

  const agentUser: User = {
    id: "user-agent",
    username: "agent",
    role: "telecaller",
    email: "agent@example.com",
    allowedProjects: ["project-a", "project-b"],
  };

  const leadA: Lead = {
    id: "lead-a",
    name: "Lead A",
    phone: "12345",
    status: "new",
    projectId: "project-a",
    assignedTo: "user-agent",
  };

  const leadB: Lead = {
    id: "lead-b",
    name: "Lead B",
    phone: "67890",
    status: "new",
    projectId: "project-b",
    assignedTo: "user-other",
  };

  const leadC: Lead = {
    id: "lead-c",
    name: "Lead C",
    phone: "54321",
    status: "new",
    projectId: "project-c",
    assignedTo: "user-agent",
  };

  describe("isProjectAuthorized", () => {
    it("denies access if user is null", () => {
      expect(AuthorizationService.isProjectAuthorized(null, "project-a")).toBe(false);
    });

    it("allows access under legacy mode (no allowedProjects restrictions)", () => {
      expect(AuthorizationService.isProjectAuthorized(legacyUser, "project-a")).toBe(true);
      expect(AuthorizationService.isProjectAuthorized(legacyUser, "project-b")).toBe(true);
    });

    it("restricts access to authorized projects only", () => {
      expect(AuthorizationService.isProjectAuthorized(agentUser, "project-a")).toBe(true);
      expect(AuthorizationService.isProjectAuthorized(agentUser, "project-c")).toBe(false);
    });
  });

  describe("canReadLead", () => {
    it("allows managers to read any lead inside their allowed projects", () => {
      expect(AuthorizationService.canReadLead(managerUser, leadA)).toBe(true);
      expect(AuthorizationService.canReadLead(managerUser, leadB)).toBe(false); // different project
    });

    it("allows agents to read only assigned leads in allowed projects", () => {
      expect(AuthorizationService.canReadLead(agentUser, leadA)).toBe(true); // assigned + allowed
      expect(AuthorizationService.canReadLead(agentUser, leadB)).toBe(false); // unassigned + allowed
      expect(AuthorizationService.canReadLead(agentUser, leadC)).toBe(false); // assigned + disallowed project
    });

    it("permits access to all projects under legacy fallback", () => {
      const assignedLegacyLead: Lead = { ...leadB, assignedTo: "user-leg" };
      expect(AuthorizationService.canReadLead(legacyUser, assignedLegacyLead)).toBe(true);
    });
  });

  describe("canAssignLead", () => {
    it("allows managers to assign leads", () => {
      expect(AuthorizationService.canAssignLead(managerUser)).toBe(true);
    });

    it("denies agents from assigning leads", () => {
      expect(AuthorizationService.canAssignLead(agentUser)).toBe(false);
    });
  });

  describe("canExecuteProposal", () => {
    it("allows execution for updates on owned leads", () => {
      expect(AuthorizationService.canExecuteProposal(agentUser, "STATUS_CHANGE", leadA)).toBe(true);
    });

    it("denies execution for updates on unowned leads", () => {
      expect(AuthorizationService.canExecuteProposal(agentUser, "STATUS_CHANGE", leadB)).toBe(false);
    });

    it("denies assignment proposals for agents even if they own the lead", () => {
      expect(AuthorizationService.canExecuteProposal(agentUser, "RECOMMEND_ASSIGNMENT", leadA)).toBe(false);
    });

    it("allows assignment proposals for managers on owned projects", () => {
      expect(AuthorizationService.canExecuteProposal(managerUser, "RECOMMEND_ASSIGNMENT", leadA)).toBe(true);
    });
  });
});
