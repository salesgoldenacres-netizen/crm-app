import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import {
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  type DocumentSnapshot,
  type QuerySnapshot,
} from "firebase/firestore";
import { User, Lead, Project, CustomRole } from "@/shared/types";
import { logger } from "@/shared/utils/logger";
import { projectsRef, usersRef } from "@/shared/services/firebase/converters";
import { buildRoleScopedLeadsQuery } from "@/shared/contracts";
import { ProjectScopeProvider, useProjectScope } from "./ProjectScopeContext";
import { AuthorizationProvider } from "./AuthorizationContext";
import { AnalyticsProvider } from "./analytics/AnalyticsContext";
import { PerformanceProvider } from "./performance/PerformanceContext";
import { isManagerial } from "@/shared/utils/roleUtils";
import { AGENT_OPEN_LEADS_REALTIME_BOUND } from "@/shared/services/leads/leadQueryConstants";

const PerformanceOverlay = import.meta.env.DEV
  ? React.lazy(() => import("./performance/PerformanceOverlay"))
  : null;

interface DatabaseContextType {
  /**
   * Bounded reference leads for non-list surfaces (agent open queue / legacy rollback).
   * NOT the source of truth for lead list UIs — use LeadQueryService.
   */
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
}: DatabaseProviderProps) {  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLeadsLoaded, setIsLeadsLoaded] = useState(false);
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [isProjectsLoaded, setIsProjectsLoaded] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isUsersLoaded, setIsUsersLoaded] = useState(false);
  const [currentUserDoc, setCurrentUserDoc] = useState<User | null>(null);

  // 1. Current User Profile Listener (real-time presence / profile checks)
  useEffect(() => {
    if (!userId) {
      Promise.resolve().then(() => {
        setCurrentUserDoc(null);
      });
      return;
    }
    const qUid = query(usersRef, where("uid", "==", userId));
    const unsubscribe = onSnapshot(
      qUid,
      (snapshot: QuerySnapshot) => {
        if (snapshot.empty) {
          // fallback direct doc ID lookup
          getDoc(doc(usersRef, userId)).then((d: DocumentSnapshot) => {
            if (d.exists()) {
              const safe = { ...d.data() };
              delete safe.password;
              setCurrentUserDoc(safe as User);
            } else {
              setCurrentUserDoc({
                id: userId,
                role: userRole || "telecaller",
                username: "",
                email: "",
              } as User);
            }
          }).catch((err: unknown) => {
            logger.error("DatabaseContext", "Error fetching user doc", err);
          });
          return;
        }
        const docSnap = snapshot.docs[0];
        const safe = { ...docSnap.data() };
        delete safe.password;
        setCurrentUserDoc(safe as User);
      },
      (err: Error) => logger.error("DatabaseContext", "Error listening to current user", err)
    );
    return () => {
      unsubscribe();
      setCurrentUserDoc(null);
    };
  }, [userId, userRole]);

  // 2. Projects cached/one-time fetch on startup
  useEffect(() => {
    if (!userId) {
      Promise.resolve().then(() => {
        setProjects({});
        setIsProjectsLoaded(false);
      });
      return;
    }
    let active = true;
    getDocs(projectsRef).then((snapshot: QuerySnapshot) => {
      if (!active) return;
      if (snapshot.empty) {
        setProjects({});
        setIsProjectsLoaded(true);
        return;
      }
      const newProjects: Record<string, Project> = {};
      snapshot.forEach((d) => {
        const data = d.data() as Project;
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
    }).catch((err: unknown) => {
      logger.error("DatabaseContext", "Error fetching projects", err);
      if (active) setIsProjectsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  // 3. Users cached/one-time fetch on startup (restricted to managerial roles for rosters)
  useEffect(() => {
    if (!userId || !currentUserDoc) {
      Promise.resolve().then(() => {
        setUsers([]);
        setIsUsersLoaded(false);
      });
      return;
    }
    
    const managerial = isManagerial(currentUserDoc.role, customRoles);
    if (!managerial) {
      Promise.resolve().then(() => {
        setUsers([currentUserDoc]);
        setIsUsersLoaded(true);
      });
      return;
    }

    let active = true;
    getDocs(usersRef).then((snapshot: QuerySnapshot) => {
      if (!active) return;
      const newUsers: User[] = [];
      snapshot.forEach((d) => {
        const safe = { ...d.data() };
        delete safe.password;
        newUsers.push(safe as User);
      });
      setUsers(newUsers);
      setIsUsersLoaded(true);
    }).catch((err: unknown) => {
      logger.error("DatabaseContext", "Error fetching all users", err);
      if (active) setIsUsersLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [userId, currentUserDoc, customRoles]);

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

/**
 * Phase B/F realtime policy:
 * - Default: NO company-wide leads listener (list SoT is LeadQueryService).
 * - Agents: optional narrow realtime of assigned leads, hard-bounded
 *   (AGENT_OPEN_LEADS_REALTIME_BOUND) for dashboard / dialer convenience.
 * - Managers: empty openLeads array (use LeadQueryService for lists).
 * - Legacy VITE_LEGACY_LEADS_SNAPSHOT rollback removed in Phase F.
 */
function LeadsListener({
  userId,
  userRole,
  customRoles,
  setLeads,
  setIsLeadsLoaded,
}: LeadsListenerProps) {
  const { activeProjectId } = useProjectScope();
  const managerial =
    !!userRole && isManagerial(userRole, customRoles);

  useEffect(() => {
    if (!userId || !userRole) {
      return;
    }

    // Managers: no company-wide realtime.
    if (managerial) {
      let cancelled = false;
      queueMicrotask(() => {
        if (cancelled) return;
        setLeads([]);
        setIsLeadsLoaded(true);
      });
      return () => {
        cancelled = true;
      };
    }

    const bound = AGENT_OPEN_LEADS_REALTIME_BOUND;

    const scopedQuery = buildRoleScopedLeadsQuery(userId, userRole, customRoles, {
      orderField: "updatedAt",
      orderDirection: "desc",
      projectId: activeProjectId,
      limit: bound,
      omitLimit: false,
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
  }, [
    userId,
    userRole,
    customRoles,
    activeProjectId,
    setLeads,
    setIsLeadsLoaded,
    managerial,
  ]);

  return null;
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
}
