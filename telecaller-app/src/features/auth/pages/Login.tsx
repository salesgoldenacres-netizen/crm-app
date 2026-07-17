import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, Eye, EyeOff, Compass } from "lucide-react";
import ThemeToggle from "@/shared/components/ThemeToggle";
import {
  loginWithEmailAndPassword,
  loginWithGoogle,
  resetPassword,
} from "@/shared/services/auth";
import { logAnalyticsEvent } from "@/shared/utils/analytics";
import Button from "@/shared/components/ui/Button";
import {
  FIELD_CONTROL_CLASS,
  FIELD_CONTROL_ERROR_CLASS,
  FIELD_HELPER_CLASS,
  FIELD_LABEL_CLASS,
} from "@/shared/components/ui/formField";

const LOGIN_ERROR_ID = "login-form-error";
const LOGIN_INFO_ID = "login-form-info";
const LOGIN_USERNAME_HINT_ID = "login-username-hint";

interface FirebaseError extends Error {
  code?: string;
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      await loginWithEmailAndPassword(username, password);
      logAnalyticsEvent("login", { method: "email_password" });
      // App.jsx will automatically handle auth state change and navigate
      navigate("/");
    } catch (err: any) {
      console.error("Login failed:", err);
      const errorObj = err as FirebaseError;
      // Handle both old and new Firebase Auth error codes
      // Firebase v12 merged auth/user-not-found + auth/wrong-password → auth/invalid-credential
      if (
        errorObj.code === "auth/wrong-password" ||
        errorObj.code === "auth/invalid-credential" ||
        errorObj.code === "auth/invalid-login-credentials"
      ) {
        setError("Invalid username or password. Please try again.");
      } else if (errorObj.code === "auth/user-not-found") {
        setError("No account found with this username or email.");
      } else if (errorObj.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (errorObj.code === "auth/too-many-requests") {
        setError(
          "Too many failed attempts. Please wait a moment and try again."
        );
      } else {
        setError(
          errorObj.message ||
            "Authentication failed. Please check your credentials."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setInfoMessage("");
    setLoading(true);
    try {
      await loginWithGoogle();
      logAnalyticsEvent("login", { method: "google" });
      navigate("/");
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      setError(err.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!username) {
      setError("Please enter your username or email first to reset password.");
      return;
    }
    setError("");
    setInfoMessage("");
    setLoading(true);
    try {
      await resetPassword(username);
      setInfoMessage("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      console.error("Password reset failed:", err);
      const errorObj = err as FirebaseError;
      if (errorObj.code === "auth/user-not-found") {
        setError("No registered account found for this username or email.");
      } else {
        setError(errorObj.message || "Failed to send password reset email.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex app-canvas transition-colors duration-300">
      {/* LEFT COLUMN: Login Form */}
      <div className="w-full md:w-[50%] lg:w-[45%] xl:w-[40%] flex flex-col justify-between min-h-screen p-6 sm:p-12 lg:p-16 relative">
        {/* Top Header Row */}
        <div className="flex justify-between items-center w-full login-header-safe">
          {/* Brand visible on Mobile */}
          <div className="flex items-center space-x-2 md:hidden">
            <div className="p-2 bg-brand-gradient rounded-xl shadow-sm">
              <Compass className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-sm tracking-wider text-brand-gradient">
              GOLDEN ACRES
            </span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Form Centered Container */}
        <div className="my-auto w-full max-w-md mx-auto py-8">
          <div className="space-y-2 mb-8">
            <h2 className="text-3xl font-semibold tracking-tight text-theme-text font-display-premium">
              Welcome back
            </h2>
            <p className="text-sm text-theme-muted">
              Golden Acres Real Estate Portal
            </p>
          </div>

          {/* Form Card */}
          <div className="card-premium p-6 sm:p-8 relative overflow-hidden">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className={FIELD_LABEL_CLASS}
                >
                  Username or Email
                  <span className="text-theme-danger ml-0.5" aria-hidden="true">
                    *
                  </span>
                </label>
                <div className="relative rounded-theme shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-theme-muted" aria-hidden="true" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`${FIELD_CONTROL_CLASS} !pl-10 !pr-3 ${error ? FIELD_CONTROL_ERROR_CLASS : ""}`}
                    placeholder="admin, telecaller or email"
                    autoComplete="username"
                    disabled={loading}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={
                      [
                        error ? LOGIN_ERROR_ID : null,
                        infoMessage ? LOGIN_INFO_ID : null,
                        !error ? LOGIN_USERNAME_HINT_ID : null,
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                  />
                </div>
                {!error && (
                  <span id={LOGIN_USERNAME_HINT_ID} className={FIELD_HELPER_CLASS}>
                    Use your portal username or registered email
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="password"
                    className={FIELD_LABEL_CLASS}
                  >
                    Password
                    <span className="text-theme-danger ml-0.5" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-semibold text-theme-accent hover:opacity-80 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
                    disabled={loading}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative rounded-theme shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-theme-muted" aria-hidden="true" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${FIELD_CONTROL_CLASS} !pl-10 !pr-10 ${error ? FIELD_CONTROL_ERROR_CLASS : ""}`}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? LOGIN_ERROR_ID : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-theme-muted hover:text-theme-accent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
                    disabled={loading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  id={LOGIN_ERROR_ID}
                  role="alert"
                  className="p-3.5 bg-theme-danger/10 text-theme-danger border border-theme-danger/25 rounded-theme text-sm leading-tight"
                >
                  {error}
                </div>
              )}

              {infoMessage && (
                <div
                  id={LOGIN_INFO_ID}
                  role="status"
                  className="p-3.5 bg-theme-success/10 text-theme-success border border-theme-success/25 rounded-theme text-sm leading-tight"
                >
                  {infoMessage}
                </div>
              )}

              <div>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Processing..." : "Sign in"}
                </Button>
              </div>

              <div className="relative flex items-center justify-center my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-theme-border"></div>
                </div>
                <span className="relative px-3 bg-theme-card type-label text-theme-muted uppercase tracking-widest">
                  Or continue with
                </span>
              </div>

              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full gap-2.5"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Sign in with Google
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer branding */}
        <div className="text-center text-xs text-theme-muted md:text-left">
          Golden Acres Management Console &bull; Secure Connection
        </div>
      </div>

      {/* RIGHT COLUMN: Brand Media Panel (Desktop Only) */}
      <div className="hidden md:flex md:w-[50%] lg:w-[55%] xl:w-[60%] sidebar-brand-rail relative overflow-hidden flex-col justify-between p-12 lg:p-16 text-white border-l border-white/10">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#0f5c4c]/40 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#c9a227]/20 rounded-full blur-[120px] animate-pulse duration-[6000ms]"></div>

        <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="relative z-10 flex items-center space-x-2">
          <div className="p-2.5 bg-brand-gradient rounded-xl shadow-md">
            <Compass className="h-6 w-6 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-wider text-white">
            GOLDEN ACRES
          </span>
        </div>

        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-none text-white font-display-premium">
            Manage plots and leads with intelligence.
          </h1>
          <p className="text-base text-white/70 font-light leading-relaxed">
            A high-performance portal designed specifically for Golden Acres
            sales teams, telecallers, and administrators to track real-time plot
            bookings and customer pipelines.
          </p>

          <div className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex items-start space-x-3">
              <div className="mt-1 p-1 bg-[#c9a227]/15 rounded border border-[#c9a227]/30">
                <svg
                  className="w-3.5 h-3.5 text-[#e8c84a]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Interactive Plot Map
                </h4>
                <p className="text-xs text-white/50">
                  Visualize plot bookings and details in real-time.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="mt-1 p-1 bg-[#c9a227]/15 rounded border border-[#c9a227]/30">
                <svg
                  className="w-3.5 h-3.5 text-[#e8c84a]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Smart Lead Management
                </h4>
                <p className="text-xs text-white/50">
                  Seamlessly assign, log call reports, and track follow-ups.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/40">
          &copy; {new Date().getFullYear()} Golden Acres Developers. All rights
          reserved.
        </div>
      </div>
    </div>
  );
}
