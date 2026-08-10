import { createContext, useContext, ReactNode, useState, useMemo } from "react";
import { User } from "@/shared/types";
import { AuthorizationService } from "./authorizationService";

interface ProjectScopeContextType {
  activeProjectId: string | null;
  setActiveProjectId: (projectId: string | null) => void;
  allowedProjects: string[];
  isProjectAuthorized: (projectId: string) => boolean;
}

const ProjectScopeContext = createContext<ProjectScopeContextType | null>(null);

interface ProjectScopeProviderProps {
  user: User | null;
  availableProjectIds?: string[];
  children: ReactNode;
}

export function ProjectScopeProvider({
  user,
  availableProjectIds = [],
  children,
}: ProjectScopeProviderProps) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [prevUser, setPrevUser] = useState(user);

  // Reset the active project whenever the user identity changes. Adjusting state
  // during render is React's recommended pattern for deriving from a changed
  // prop — it avoids the set-state-in-effect render cascade.
  if (user !== prevUser) {
    setPrevUser(user);
    setActiveProjectId(null);
  }

  const allowedProjects = useMemo(() => {
    if (!user) return [];
    if (!user.allowedProjects || user.allowedProjects.length === 0) {
      return availableProjectIds;
    }
    return user.allowedProjects;
  }, [user, availableProjectIds]);

  const value = useMemo<ProjectScopeContextType>(() => {
    return {
      activeProjectId,
      setActiveProjectId,
      allowedProjects,
      isProjectAuthorized: (projectId: string) =>
        AuthorizationService.isProjectAuthorized(user, projectId),
    };
  }, [activeProjectId, allowedProjects, user]);

  return (
    <ProjectScopeContext.Provider value={value}>
      {children}
    </ProjectScopeContext.Provider>
  );
}

export function useProjectScope() {
  const context = useContext(ProjectScopeContext);
  if (!context) {
    throw new Error("useProjectScope must be used within a ProjectScopeProvider");
  }
  return context;
}
