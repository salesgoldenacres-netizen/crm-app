import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-theme-bg flex items-center justify-center p-6 text-sm font-sans transition-colors duration-300">
      <div className="max-w-md w-full bg-theme-card rounded-theme border border-theme-border shadow-xl overflow-hidden p-6 text-center space-y-6">
        <div className="inline-flex p-4 bg-theme-accent-muted text-theme-accent rounded-theme">
          <AlertCircle className="w-10 h-10" aria-hidden />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-theme-text tracking-tight">
            404
          </h1>
          <h2 className="type-card-title text-base text-theme-text">
            Page Not Found
          </h2>
          <p className="type-secondary text-xs text-theme-muted leading-relaxed">
            The page you are looking for doesn't exist, has been moved, or you don't have access permissions.
          </p>
        </div>

        <Link
          to="/"
          className="w-full inline-flex items-center justify-center px-4 py-2 shadow-sm text-xs font-semibold rounded-theme text-theme-accent-fg bg-theme-accent hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring cursor-pointer border-0 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
