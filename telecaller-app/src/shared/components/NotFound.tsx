import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-sm font-sans transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 text-center space-y-6">
        <div className="inline-flex p-4 bg-amber-50 dark:bg-amber-955/30 text-amber-500 dark:text-amber-400 rounded-full">
          <AlertCircle className="w-10 h-10 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            404
          </h1>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Page Not Found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            The page you are looking for doesn't exist, has been moved, or you don't have access permissions.
          </p>
        </div>

        <Link
          to="/"
          className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none cursor-pointer border-0 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
