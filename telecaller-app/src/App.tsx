import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SplashScreen } from "@capacitor/splash-screen";
import { isManagerial } from "@/shared/utils/roleUtils";
import AppShell, { type AppShellProps } from "./shared/layouts/AppShell";
import { useCustomRolesStore, useBrandingStore } from "./features/admin/hooks/adminStores";
import { DatabaseProvider } from "./shared/services/DatabaseContext";
import { useAuth } from "./features/auth/hooks/useAuth";
import BrandedBootScreen from "@/shared/components/BrandedBootScreen";
import { logger } from "@/shared/utils/logger";

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
import InCallWhatsAppBar from "@/features/calls/components/InCallWhatsAppBar";
import { useAgentOpenLeads } from "@/features/leads/hooks/useAgentOpenLeads";
import ThemeToggle from "@/features/settings/components/ThemeToggle";
import { useNotificationsStore } from "@/features/dashboard/hooks/useNotificationsStore";
import { FeatureAnalyticsProvider } from "@/features/dashboard/components/FeatureAnalyticsProvider";
import { User } from "@/shared/types";

interface AuthenticatedShellProps {
  user: User;
  children: React.ReactNode;
}

function AuthenticatedShell({ user, children }: AuthenticatedShellProps) {
  useThemeStore(user.id);
  useNotificationsStore(user.id);

  const { branding } = useBrandingStore();
  const { openLeads } = useAgentOpenLeads();
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
        openLeads={openLeads}
        branding={branding}
        leadsStore={leadsStore as unknown as AppShellProps["leadsStore"]}
        ivrStore={ivrStore}
        InCallWhatsAppBar={InCallWhatsAppBar}
        themeToggle={<ThemeToggle compact />}
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
const PublicProjectLayout = lazy(
  () => import("./features/plots/pages/PublicProjectLayout")
);
const LeadDetailsPage = lazy(() => import("./features/leads/pages/LeadDetailsPage"));
const DealsPage = lazy(() => import("./features/deals/pages/DealsPage"));
const CalendarPage = lazy(() => import("./features/calendar/pages/CalendarPage"));
const NotFound = lazy(() => import("./shared/components/NotFound"));

function App() {
  const { user, loading, logout: handleLogout } = useAuth();
  const { roles: customRoles } = useCustomRolesStore();
  // Apply Brand Customizer tokens before auth so login + boot screens theme
  const { branding } = useBrandingStore();
  const brandTitle = branding.companyName?.trim() || "Golden Acres";

  useEffect(() => {
    // Hide splash screen as soon as the app mounts
    const hideSplash = async () => {
      try {
        await SplashScreen.hide();
      } catch (e) {
        logger.warn("App", "SplashScreen.hide() failed", e);
      }
    };
    hideSplash();
  }, []);

  const isUserRoleManagerial = (role?: string) => isManagerial(role || "", customRoles);

  if (loading) {
    return (
      <BrandedBootScreen
        title={brandTitle}
        message="Connecting to Firebase..."
      />
    );
  }

  return (
    <BrowserRouter>
      <DatabaseProvider
        userId={user?.id}
        userRole={user?.role}
        customRoles={customRoles}
      >
        <FeatureAnalyticsProvider>
        <Suspense
          fallback={
            <BrandedBootScreen
              title={brandTitle}
              message="Loading page content..."
            />
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
              path="/deals"
              element={
                user ? (
                  <AuthenticatedShell user={user}>
                    <DealsPage user={user} />
                  </AuthenticatedShell>
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/calendar"
              element={
                user ? (
                  <AuthenticatedShell user={user}>
                    <CalendarPage user={user} />
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
            {/* Authenticated share: Firestore projects require auth read; token checked in page */}
            <Route
              path="/public/layout/:projectId"
              element={
                user ? (
                  <AuthenticatedShell user={user}>
                    <PublicProjectLayout />
                  </AuthenticatedShell>
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </FeatureAnalyticsProvider>
      </DatabaseProvider>
    </BrowserRouter>
  );
}

export default App;
