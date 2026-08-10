import { describe, it, expect } from "vitest";
import { AuthorizationService } from "./authorizationService";
import { AI_ENABLED } from "@/shared/ai/types";
import { User, Lead, CustomRole } from "@/shared/types";

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

    it("denies any proposal when the user is null (safe-closed)", () => {
      expect(AuthorizationService.canExecuteProposal(null, "STATUS_CHANGE", leadA)).toBe(false);
    });
  });

  const adminUser: User = {
    id: "user-admin",
    username: "admin",
    role: "admin",
    email: "admin@example.com",
    allowedProjects: ["project-a"],
  };

  describe("canManageUsers (admin-only RBAC gate)", () => {
    it("allows only the admin role", () => {
      expect(AuthorizationService.canManageUsers(adminUser)).toBe(true);
    });

    it("denies managers who are not admins", () => {
      expect(AuthorizationService.canManageUsers(managerUser)).toBe(false);
    });

    it("denies agents", () => {
      expect(AuthorizationService.canManageUsers(agentUser)).toBe(false);
    });

    it("denies a null user (safe-closed)", () => {
      expect(AuthorizationService.canManageUsers(null)).toBe(false);
    });
  });

  describe("canViewAnalytics", () => {
    it("allows managerial roles", () => {
      expect(AuthorizationService.canViewAnalytics(managerUser)).toBe(true);
      expect(AuthorizationService.canViewAnalytics(adminUser)).toBe(true);
    });

    it("denies telecallers by default", () => {
      expect(AuthorizationService.canViewAnalytics(agentUser)).toBe(false);
    });

    it("respects custom managerial roles", () => {
      const customRoles: CustomRole[] = [
        { id: "telecaller", name: "Promoted Agent", isManagerial: true },
      ];
      expect(AuthorizationService.canViewAnalytics(agentUser, customRoles)).toBe(true);
    });

    it("denies a null user (safe-closed)", () => {
      expect(AuthorizationService.canViewAnalytics(null)).toBe(false);
    });
  });

  describe("canUseCopilot layered feature-flag gates", () => {
    // Layer 1 is a compile-time global kill switch. These assertions are
    // deterministic across either state of the flag so the test never depends
    // on the build-time value.
    it("denies everything while the global AI kill switch is off", () => {
      if (AI_ENABLED) return; // covered by the enabled-path block below
      expect(AuthorizationService.canUseCopilot(agentUser, "lead-brief-v1", "project-a")).toBe(false);
      expect(AuthorizationService.canUseCopilot(adminUser, "confirm-write", "project-a")).toBe(false);
    });

    it("denies a null user", () => {
      expect(AuthorizationService.canUseCopilot(null)).toBe(false);
    });

    it("denies inactive users regardless of role", () => {
      const inactive: User = { ...agentUser, status: "inactive" };
      expect(AuthorizationService.canUseCopilot(inactive)).toBe(false);
    });

    it("applies role/capability/project layers when AI is enabled", () => {
      if (!AI_ENABLED) return; // kill switch off — asserted above
      const inactive: User = { ...agentUser, status: "inactive" };
      expect(AuthorizationService.canUseCopilot(inactive)).toBe(false);
      expect(AuthorizationService.canUseCopilot(agentUser, "unknown-capability")).toBe(false);
      expect(AuthorizationService.canUseCopilot(agentUser, "lead-brief-v1", "project-c")).toBe(false);
      expect(AuthorizationService.canUseCopilot(agentUser, "lead-brief-v1", "project-a")).toBe(true);
      expect(AuthorizationService.canUseCopilot(agentUser, "confirm-write", "project-b")).toBe(true);
    });
  });

  describe("isProjectAuthorized edge cases", () => {
    it("allows access when no projectId is supplied", () => {
      expect(AuthorizationService.isProjectAuthorized(agentUser)).toBe(true);
    });

    it("allows access when allowedProjects is an empty array (legacy)", () => {
      const openUser: User = { ...agentUser, allowedProjects: [] };
      expect(AuthorizationService.isProjectAuthorized(openUser, "any-project")).toBe(true);
    });
  });

  describe("canUpdateLead mirrors canReadLead", () => {
    it("allows updates on readable leads and denies otherwise", () => {
      expect(AuthorizationService.canUpdateLead(agentUser, leadA)).toBe(true);
      expect(AuthorizationService.canUpdateLead(agentUser, leadB)).toBe(false);
    });
  });
});
