import { createContext, useContext, ReactNode, useMemo } from "react";
import { User, Lead, CustomRole } from "@/shared/types";
import { AuthorizationService } from "./authorizationService";

interface AuthorizationContextType {
  canReadLead: (lead: Lead) => boolean;
  canUpdateLead: (lead: Lead) => boolean;
  canAssignLead: () => boolean;
  canUseCopilot: (capabilityId?: string, projectId?: string) => boolean;
  canViewAnalytics: () => boolean;
  canManageUsers: () => boolean;
  canExecuteProposal: (proposalType: string, lead: Lead) => boolean;
}

const AuthorizationContext = createContext<AuthorizationContextType | null>(null);

interface AuthorizationProviderProps {
  user: User | null;
  customRoles?: CustomRole[];
  children: ReactNode;
}

export function AuthorizationProvider({ user, customRoles = [], children }: AuthorizationProviderProps) {
  const value = useMemo<AuthorizationContextType>(() => {
    return {
      canReadLead: (lead: Lead) =>
        AuthorizationService.canReadLead(user, lead, customRoles),
      canUpdateLead: (lead: Lead) =>
        AuthorizationService.canUpdateLead(user, lead, customRoles),
      canAssignLead: () =>
        AuthorizationService.canAssignLead(user, customRoles),
      canUseCopilot: (capabilityId?: string, projectId?: string) =>
        AuthorizationService.canUseCopilot(user, capabilityId, projectId, customRoles),
      canViewAnalytics: () =>
        AuthorizationService.canViewAnalytics(user, customRoles),
      canManageUsers: () =>
        AuthorizationService.canManageUsers(user, customRoles),
      canExecuteProposal: (proposalType: string, lead: Lead) =>
        AuthorizationService.canExecuteProposal(user, proposalType, lead, customRoles),
    };
  }, [user, customRoles]);

  return (
    <AuthorizationContext.Provider value={value}>
      {children}
    </AuthorizationContext.Provider>
  );
}

export function useAuthorization() {
  const context = useContext(AuthorizationContext);
  if (!context) {
    throw new Error("useAuthorization must be used within an AuthorizationProvider");
  }
  return context;
}
