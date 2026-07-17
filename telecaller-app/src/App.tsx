import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SplashScreen } from "@capacitor/splash-screen";
import { isManagerial } from "@/shared/utils/roleUtils";
import AppShell from "./shared/layouts/AppShell";
import { useCustomRolesStore, useBrandingStore } from "./features/admin/hooks/adminStores";
import { DatabaseProvider } from "./shared/services/DatabaseContext";
import { useAuth } from "./features/auth/hooks/useAuth";

// Import Modal Registry and Feature components/stores
import { ModalRegistryContext } from "@/shared/layouts/ModalRegistryContext";
import TemplateCenterModal from "@/features/leads/components/TemplateCenterModal";
import DialPadDrawer from "@/features/calls/components/DialPadDrawer";
import CallLogModal from "@/features/calls/components/CallLogModal";
import DialerOverlay from "@/features/calls/components/DialerOverlay";

import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useLeadsStore } from "@/features/leads/hooks/useLeadsStore";
import { useIVRStore } from "@/features/calls/hooks/useIVRStore";
import { useThemeStore } from "@/features/settings/hooks/useThemeStore";
import { useNotificationsStore } from "@/features/dashboard/hooks/useNotificationsStore";
import { User } from "@/shared/types";

interface AuthenticatedShellProps {
  user: User;
  children: React.ReactNode;
}

function AuthenticatedShell({ user, children }: AuthenticatedShellProps) {
  // Call hooks at composition root
  useThemeStore(user.id);
  useNotificationsStore(user.id);
  useBrandingStore(); // apply branding fonts/colors app-wide

  const projectsStore = useProjectsStore();
  const leadsStore = useLeadsStore();
  const ivrStore = useIVRStore(user.id);

  return (
    <ModalRegistryContext.Provider
      value={{
        TemplateCenterModal,
        DialPadDrawer,
        DialerOverlay,
        CallLogModal,
      }}
    >
      <AppShell
        user={user}
        projects={projectsStore.projects}
        leadsStore={leadsStore}
        ivrStore={ivrStore}
      >
        {children}
      </AppShell>
    </ModalRegistryContext.Provider>
  );
}

const Login = lazy(() => import("./features/auth/pages/Login"));
const Dashboard = lazy(() => import("./features/dashboard/pages/Dashboard"));
const ProjectMap = lazy(() => import("./features/plots/pages/ProjectMap"));
const Admin = lazy(() => import("./features/admin/pages/Admin"));
const AdminMapEditor = lazy(() => import("./features/plots/pages/AdminMapEditor"));
const LeadDetailsPage = lazy(() => import("./features/leads/pages/LeadDetailsPage"));
const NotFound = lazy(() => import("./shared/components/NotFound"));

function App() {
  const { user, loading, logout: handleLogout } = useAuth();
  const { roles: customRoles } = useCustomRolesStore();

  useEffect(() => {
    // Hide splash screen as soon as the app mounts
    const hideSplash = async () => {
      try {
        await SplashScreen.hide();
      } catch (e) {
        console.warn("SplashScreen.hide() failed", e);
      }
    };
    hideSplash();
  }, []);

  const isUserRoleManagerial = (role?: string) => isManagerial(role || "", customRoles);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Golden Acres
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              Connecting to Firebase...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <DatabaseProvider
        userId={user?.id}
        userRole={user?.role}
        customRoles={customRoles}
      >
        <Suspense
          fallback={
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    Golden Acres
                  </h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                    Loading page content...
                  </p>
                </div>
              </div>
            </div>
          }
        >
          <Routes>
            <Route
              path="/login"
              element={!user ? <Login /> : <Navigate to="/" />}
            />
            {/* All authenticated routes share a single AppShell for global modals */}
            <Route
              path="/"
              element={
                user ? (
                  <AuthenticatedShell user={user}>
                    <Dashboard user={user} onLogout={handleLogout} />
                  </AuthenticatedShell>
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/project/:id"
              element={
                user ? (
                  <AuthenticatedShell user={user}>
                    <ProjectMap user={user} />
                  </AuthenticatedShell>
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/lead/:id"
              element={
                user ? (
                  <AuthenticatedShell user={user}>
                    <LeadDetailsPage user={user} />
                  </AuthenticatedShell>
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/admin"
              element={
                isUserRoleManagerial(user?.role) ? (
                  <AuthenticatedShell user={user!}>
                    <Admin user={user!} />
                  </AuthenticatedShell>
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route
              path="/admin/project/:id/edit"
              element={
                isUserRoleManagerial(user?.role) ? (
                  <AuthenticatedShell user={user!}>
                    <AdminMapEditor user={user!} />
                  </AuthenticatedShell>
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </DatabaseProvider>
    </BrowserRouter>
  );
}

export default App;
