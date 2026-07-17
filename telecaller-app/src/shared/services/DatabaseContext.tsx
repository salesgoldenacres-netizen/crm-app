import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import {
  onSnapshot,
} from "firebase/firestore";
import { User, Lead, Project, CustomRole } from "@/shared/types";
import { logger } from "@/shared/utils/logger";
import { projectsRef, usersRef } from "@/shared/services/firebase/converters";
import { buildRoleScopedLeadsQuery } from "@/shared/contracts";
import { ProjectScopeProvider, useProjectScope } from "./ProjectScopeContext";
import { AuthorizationProvider } from "./AuthorizationContext";
import { AnalyticsProvider } from "./analytics/AnalyticsContext";
import { PerformanceProvider } from "./performance/PerformanceContext";
const PerformanceOverlay = import.meta.env.DEV
  ? React.lazy(() => import("./performance/PerformanceOverlay"))
  : null;

interface DatabaseContextType {
  leads: Lead[];
  isLeadsLoaded: boolean;
  projects: Record<string, Project>;
  isProjectsLoaded: boolean;
  users: User[];
  isUsersLoaded: boolean;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

interface DatabaseProviderProps {
  userId: string | undefined;
  /** Role code for role-scoped leads query. */
  userRole?: string;
  /** Live custom roles for managerial detection. */
  customRoles?: CustomRole[];
  children: ReactNode;
}

function mapLeadDocs(
  snapshot: { forEach: (cb: (d: { id: string; data: () => Record<string, unknown> }) => void) => void },
): Lead[] {
  const newLeads: Lead[] = [];
  snapshot.forEach((d) => {
    newLeads.push({ id: d.id, ...d.data() } as Lead);
  });
  newLeads.sort(
    (a, b) =>
      new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
  );
  return newLeads;
}

export function DatabaseProvider({
  userId,
  userRole,
  customRoles = [],
  children,
}: DatabaseProviderProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLeadsLoaded, setIsLeadsLoaded] = useState(false);
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [isProjectsLoaded, setIsProjectsLoaded] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isUsersLoaded, setIsUsersLoaded] = useState(false);

  // Projects Listener — empty collection stays empty (no demo seed writes)
  useEffect(() => {
    if (!userId) {
      return;
    }
    const unsubscribe = onSnapshot(
      projectsRef,
      (snapshot) => {
        if (snapshot.empty) {
          setProjects({});
          setIsProjectsLoaded(true);
          return;
        }
        const newProjects: Record<string, Project> = {};
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.plots) {
            data.plots = data.plots.map((p) => {
              if (
                p.points &&
                p.points.length > 0 &&
                !Array.isArray(p.points[0])
              ) {
                const pts = p.points as unknown as Array<{ x: number; y: number }>;
                return { ...p, points: pts.map((pt) => [pt.x, pt.y]) };
              }
              return p;
            });
          }
          newProjects[d.id] = data;
        });
        setProjects(newProjects);
        setIsProjectsLoaded(true);
      },
      (err) => logger.error("DatabaseContext", "Error listening to projects", err)
    );
    return () => {
      unsubscribe();
      setProjects({});
      setIsProjectsLoaded(false);
    };
  }, [userId]);

  // Users Listener — empty collection stays empty (no demo seed writes)
  useEffect(() => {
    if (!userId) {
      return;
    }
    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        if (snapshot.empty) {
          setUsers([]);
          setIsUsersLoaded(true);
          return;
        }
        const newUsers: User[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as User & { password?: unknown };
          const { password: _pw, ...safe } = data;
          newUsers.push(safe as User);
        });
        setUsers(newUsers);
        setIsUsersLoaded(true);
      },
      (err) => logger.error("DatabaseContext", "Error listening to users", err)
    );
    return () => {
      unsubscribe();
      setUsers([]);
      setIsUsersLoaded(false);
    };
  }, [userId]);

  const currentUserDoc = useMemo(() => {
    if (!userId) return null;
    const found = users.find((u) => u.id === userId || u.uid === userId);
    if (found) return found;
    return {
      id: userId,
      role: userRole || "telecaller",
      username: "",
      email: "",
    } as User;
  }, [users, userId, userRole]);

  const value = useMemo(
    () => ({
      leads,
      isLeadsLoaded,
      projects,
      isProjectsLoaded,
      users,
      isUsersLoaded,
    }),
    [leads, isLeadsLoaded, projects, isProjectsLoaded, users, isUsersLoaded],
  );

  return (
    <DatabaseContext.Provider value={value}>
      <ProjectScopeProvider user={currentUserDoc} availableProjectIds={Object.keys(projects)}>
        <AuthorizationProvider user={currentUserDoc} customRoles={customRoles}>
          <LeadsListener
            userId={userId}
            userRole={userRole}
            customRoles={customRoles}
            setLeads={setLeads}
            setIsLeadsLoaded={setIsLeadsLoaded}
          />
          <PerformanceProvider>
            <AnalyticsProvider>
              {children}
              {import.meta.env.DEV && PerformanceOverlay && (
                <React.Suspense fallback={null}>
                  <PerformanceOverlay />
                </React.Suspense>
              )}
            </AnalyticsProvider>
          </PerformanceProvider>
        </AuthorizationProvider>
      </ProjectScopeProvider>
    </DatabaseContext.Provider>
  );
}

interface LeadsListenerProps {
  userId: string | undefined;
  userRole: string | undefined;
  customRoles: CustomRole[];
  setLeads: (leads: Lead[]) => void;
  setIsLeadsLoaded: (loaded: boolean) => void;
}

function LeadsListener({
  userId,
  userRole,
  customRoles,
  setLeads,
  setIsLeadsLoaded,
}: LeadsListenerProps) {
  const { activeProjectId } = useProjectScope();

  useEffect(() => {
    if (!userId || !userRole) {
      return;
    }

    const scopedQuery = buildRoleScopedLeadsQuery(userId, userRole, customRoles, {
      orderField: "updatedAt",
      orderDirection: "desc",
      projectId: activeProjectId,
      limit: 500,
    });

    const unsubscribe = onSnapshot(
      scopedQuery,
      (snapshot) => {
        // Empty query result → empty state only. Never seed demo leads into production.
        setLeads(snapshot.empty ? [] : mapLeadDocs(snapshot));
        setIsLeadsLoaded(true);
      },
      (err) => logger.error("DatabaseContext", "Error listening to leads", err)
    );

    return () => {
      unsubscribe();
      setLeads([]);
      setIsLeadsLoaded(false);
    };
  }, [userId, userRole, customRoles, activeProjectId, setLeads, setIsLeadsLoaded]);

  return null;
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
}
