import { User, Lead, CustomRole } from "@/shared/types";
import { isManagerial } from "@/shared/utils/roleUtils";

// Import global AI status
import { AI_ENABLED } from "@/shared/ai/types";

/**
 * Enterprise Authorization Service (Wave 8 Phase 2A)
 * Centralizes permission decisions and enforces project/role-scoped gates.
 *
 * Safe-by-design:
 * - Falls back to safe-closed permissions if user or required context is missing.
 * - Project scoping is backwards compatible: if user has no allowedProjects defined,
 *   we assume access to all projects (legacy single-project mode).
 */
export const AuthorizationService = {
  /**
   * Check if a user is authorized to access a specific project.
   */
  isProjectAuthorized(user: User | null, projectId?: string): boolean {
    if (!user) return false;
    // If no project ID is specified or allowedProjects is empty/undefined, allow access by default
    if (!projectId || !user.allowedProjects || user.allowedProjects.length === 0) {
      return true;
    }
    return user.allowedProjects.includes(projectId);
  },

  /**
   * Determine if a user can read a lead record.
   */
  canReadLead(user: User | null, lead: Lead, customRoles: CustomRole[] = []): boolean {
    if (!user) return false;

    // 1. Enforce Project-Scoping Boundary
    if (lead.projectId && !this.isProjectAuthorized(user, lead.projectId)) {
      return false;
    }

    // 2. Enforce Role-based Scoping
    if (isManagerial(user.role, customRoles)) {
      return true;
    }

    // Telecallers can only read leads explicitly assigned to them
    return lead.assignedTo === user.id;
  },

  /**
   * Determine if a user can update a lead record.
   */
  canUpdateLead(user: User | null, lead: Lead, customRoles: CustomRole[] = []): boolean {
    // Reading is a prerequisite for updating
    return this.canReadLead(user, lead, customRoles);
  },

  /**
   * Determine if a user can assign or reassign leads.
   */
  canAssignLead(user: User | null, customRoles: CustomRole[] = []): boolean {
    if (!user) return false;
    return isManagerial(user.role, customRoles);
  },

  /**
   * Determine if a user can access the AI Copilot capability.
   * Implements Layered Feature Flag gates: Global -> Role -> Project -> Capability.
   */
  canUseCopilot(
    user: User | null,
    capabilityId: string = "lead-brief-v1",
    projectId?: string,
    _customRoles: CustomRole[] = []
  ): boolean {
    // Layer 1: Global kill switch
    if (!AI_ENABLED) return false;

    if (!user) return false;

    // Layer 2: Role gating (e.g. only active roles can use it)
    if (user.status === "inactive") return false;

    // Layer 3: Project gating
    if (projectId && !this.isProjectAuthorized(user, projectId)) {
      return false;
    }

    // Layer 4: Capability gating
    const allowedCapabilities = ["lead-brief-v1", "confirm-write"];
    if (!allowedCapabilities.includes(capabilityId)) {
      return false;
    }

    return true;
  },

  /**
   * Determine if a user can view organizational metrics/analytics.
   */
  canViewAnalytics(user: User | null, customRoles: CustomRole[] = []): boolean {
    if (!user) return false;
    return isManagerial(user.role, customRoles);
  },

  /**
   * Determine if a user can manage other accounts/users.
   */
  canManageUsers(user: User | null, _customRoles: CustomRole[] = []): boolean {
    if (!user) return false;
    return user.role === "admin";
  },

  /**
   * Determine if a user can execute an AI proposal.
   */
  canExecuteProposal(
    user: User | null,
    proposalType: string,
    lead: Lead,
    customRoles: CustomRole[] = []
  ): boolean {
    if (!user) return false;

    // User must have update access to the lead first
    if (!this.canUpdateLead(user, lead, customRoles)) {
      return false;
    }

    // Gated reassignments under assignment privileges
    if (proposalType === "RECOMMEND_ASSIGNMENT" && !this.canAssignLead(user, customRoles)) {
      return false;
    }

    return true;
  },
};
