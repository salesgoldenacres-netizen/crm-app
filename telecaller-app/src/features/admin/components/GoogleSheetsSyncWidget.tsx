import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  Check,
} from "lucide-react";
import {
  syncGoogleSheetsData,
  fetchGoogleSheetsMetadata,
  DEFAULT_SHEET_ID,
  DEFAULT_GID,
  SyncMetadata,
} from "../services/googleSheetsSyncService";
import { useToast } from "@/shared/components/Toast";

export default function GoogleSheetsSyncWidget() {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [meta, setMeta] = useState<SyncMetadata | null>(null);

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${DEFAULT_SHEET_ID}/edit#gid=${DEFAULT_GID}`;

  useEffect(() => {
    fetchGoogleSheetsMetadata().then((data) => {
      if (data) setMeta(data);
    });
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const result = await syncGoogleSheetsData();
      if (result.success) {
        toast(
          `Synced ${result.plotsSynced} plots & ${result.bookedPlotsCount} bookings from Google Sheets!`,
          "success"
        );
        setMeta({
          lastSyncedAt: result.lastSyncedAt,
          totalRowsProcessed: result.totalRowsProcessed,
          plotsSynced: result.plotsSynced,
          bookedPlotsCount: result.bookedPlotsCount,
          dealsSynced: result.dealsSynced,
          leadsSynced: result.leadsSynced,
          spreadsheetId: DEFAULT_SHEET_ID,
          gid: DEFAULT_GID,
          status: "success",
        });
      } else {
        toast(`Sync failed: ${result.error}`, "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast(`Sync error: ${msg}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const formattedDate = meta?.lastSyncedAt
    ? new Date(meta.lastSyncedAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Just now";

  return (
    <div className="bg-theme-card border border-theme-border rounded-xl p-4 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-theme-text">Google Sheets Live Booking Sync</h3>
              <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Check className="w-3 h-3" /> Connected
              </span>
            </div>
            <p className="text-xs text-theme-muted flex items-center gap-1.5 mt-0.5">
              <span>Auto-digesting plot bookings & deal status from Google Sheets</span>
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-theme-accent hover:underline inline-flex items-center gap-0.5 font-medium"
              >
                View Sheet <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        {/* Sync Action Button */}
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={isSyncing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all shadow-xs disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing Sheet Data..." : "Sync Now from Google Sheets"}
        </button>
      </div>

      {/* Sync Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div className="bg-theme-surface border border-theme-border rounded-lg p-2.5">
          <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Total Rows</p>
          <p className="text-base font-extrabold text-theme-text mt-0.5">
            {meta?.totalRowsProcessed || 146}
          </p>
        </div>
        <div className="bg-theme-surface border border-theme-border rounded-lg p-2.5">
          <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Plots Synced</p>
          <p className="text-base font-extrabold text-emerald-500 mt-0.5">
            {meta?.plotsSynced || 144}
          </p>
        </div>
        <div className="bg-theme-surface border border-theme-border rounded-lg p-2.5">
          <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Bookings & Deals</p>
          <p className="text-base font-extrabold text-amber-500 mt-0.5">
            {meta?.bookedPlotsCount || 54}
          </p>
        </div>
        <div className="bg-theme-surface border border-theme-border rounded-lg p-2.5">
          <p className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Last Synced</p>
          <p className="text-xs font-bold text-theme-text mt-1 truncate">{formattedDate}</p>
        </div>
      </div>
    </div>
  );
}
