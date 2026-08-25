import { db } from "@/shared/services/firebase";
import { doc, writeBatch, serverTimestamp, getDoc } from "@/shared/services/firebase/repositories";

export const DEFAULT_SHEET_ID = "1x6lYoLss9CjuZoGJkX9tlPp_i2yO8Ia0FJxo7yivgv4";
export const DEFAULT_GID = "1890011657";

export interface SyncResult {
  success: boolean;
  totalRowsProcessed: number;
  plotsSynced: number;
  bookedPlotsCount: number;
  dealsSynced: number;
  leadsSynced: number;
  lastSyncedAt: string;
  error?: string;
}

export interface SyncMetadata {
  lastSyncedAt?: string;
  totalRowsProcessed?: number;
  plotsSynced?: number;
  bookedPlotsCount?: number;
  dealsSynced?: number;
  leadsSynced?: number;
  spreadsheetId?: string;
  gid?: string;
  status?: string;
}

function parseCleanNum(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^\d.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Simple CSV parser handling quotes
  const parseRow = (line: string): string[] => {
    const row: string[] = [];
    let insideQuote = false;
    let current = "";
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === "," && !insideQuote) {
        row.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    return row;
  };

  const headers = parseRow(lines[0]);
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowValues = parseRow(lines[i]);
    if (rowValues.length === 0 || !rowValues.some((v) => v.length > 0)) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rowValues[idx] || "";
    });
    results.push(rowObj);
  }

  return results;
}

export async function fetchGoogleSheetsMetadata(): Promise<SyncMetadata | null> {
  try {
    const metaRef = doc(db, "system_settings", "google_sheets_sync");
    const snap = await getDoc(metaRef);
    if (snap.exists()) {
      return snap.data() as SyncMetadata;
    }
    return null;
  } catch (err) {
    console.error("Error fetching Google Sheets sync metadata:", err);
    return null;
  }
}

export async function syncGoogleSheetsData(
  sheetId: string = DEFAULT_SHEET_ID,
  gid: string = DEFAULT_GID
): Promise<SyncResult> {
  try {
    const candidateUrls = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/pub?gid=${gid}&single=true&output=csv`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
      )}`,
    ];

    let csvText = "";
    let lastFetchErr = "";

    for (const url of candidateUrls) {
      try {
        const resp = await fetch(url, { cache: "no-cache" });
        if (resp.ok) {
          const text = await resp.text();
          if (text && text.length > 50 && (text.includes("Plot.no") || text.includes("Status") || text.includes(","))) {
            csvText = text;
            break;
          }
        }
      } catch (err: unknown) {
        lastFetchErr = err instanceof Error ? err.message : String(err);
      }
    }

    if (!csvText) {
      throw new Error(`Failed to fetch Google Sheet data. ${lastFetchErr || "Check connection or CORS restrictions."}`);
    }
    const rows = parseCsv(csvText);

    if (rows.length === 0) {
      throw new Error("No data rows found in Google Sheets");
    }

    let plotsCount = 0;
    let bookedCount = 0;
    let dealsCount = 0;
    let leadsCount = 0;

    let batch = writeBatch(db);
    let batchOps = 0;

    const nowIso = new Date().toISOString();

    for (const row of rows) {
      const rawPlotNo = (row["Plot.no"] || "").trim();
      if (!rawPlotNo) continue;

      const plotNo = rawPlotNo;
      const sqft = parseCleanNum(row["Sq.Ft"] || "");
      const priceSqFt = parseCleanNum(row["Price"] || "");
      const totalPrice = parseCleanNum(row["Total Price"] || "");
      const discount = parseCleanNum(row["Discount"] || "");
      const finalPrice = parseCleanNum(row["Final Price"] || "") || totalPrice;
      const rawStatus = (row["Status"] || "").trim();

      let status = "Vacant";
      const sLower = rawStatus.toLowerCase();
      if (sLower.includes("book")) {
        status = "Booked";
      } else if (sLower.includes("reserv") || sLower.includes("hold")) {
        status = "Reserved";
      } else if (sLower.includes("block")) {
        status = "Blocked";
      }

      const salesRep = (row["Sales"] || "").trim();
      const telecaller = (row["Tellecaller"] || "").trim();
      const salesMgr = (row["S.M"] || "").trim();
      const customerName = (row["customer name "] || row["customer name"] || "").trim();
      const advanceDate = (row["Advance Paid Date"] || "").trim();
      const advanceAmount = parseCleanNum(row["Advance Amount"] || "");
      const paymentMode = (row["Mode of Payment"] || "").trim();

      // 1. Update project_plots
      const plotRef = doc(db, "project_plots", `plot_${plotNo}`);
      batch.set(
        plotRef,
        {
          plotNumber: plotNo,
          sqft,
          pricePerSqFt: priceSqFt,
          totalPrice,
          discount,
          finalPrice,
          status,
          salesRep,
          telecaller,
          salesManager: salesMgr,
          customerName,
          advancePaidDate: advanceDate,
          advanceAmount,
          paymentMode,
          lastSyncedAt: serverTimestamp(),
          updatedAt: nowIso,
        },
        { merge: true }
      );
      batchOps++;
      plotsCount++;

      // 2. Update deals & leads if Booked or Reserved
      if ((status === "Booked" || status === "Reserved") && customerName) {
        bookedCount++;

        const dealRef = doc(db, "deals", `deal_sheet_plot_${plotNo}`);
        batch.set(
          dealRef,
          {
            title: `Plot #${plotNo} - ${customerName}`,
            leadName: customerName,
            phone: "",
            plotNumber: plotNo,
            value: finalPrice || totalPrice,
            stage: status === "Booked" ? "closed_won" : "plot_reserved",
            assignedToName: salesRep || salesMgr || "Unassigned",
            expectedCloseDate: advanceDate || nowIso.split("T")[0],
            advanceAmount,
            paymentMode,
            notes: `Synced from Google Sheets GID ${gid}. Telecaller: ${telecaller}`,
            updatedAt: nowIso,
          },
          { merge: true }
        );
        batchOps++;
        dealsCount++;

        const leadRef = doc(db, "leads", `sheet_lead_plot_${plotNo}`);
        batch.set(
          leadRef,
          {
            name: customerName,
            status: status === "Booked" ? "Booked" : "Interested",
            plotNumber: plotNo,
            assignedToName: salesRep || "Unassigned",
            telecallerName: telecaller,
            advancePaidDate: advanceDate,
            advanceAmount,
            paymentMode,
            source: "Google Sheets Import",
            updatedAt: nowIso,
          },
          { merge: true }
        );
        batchOps++;
        leadsCount++;
      }

      if (batchOps >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        batchOps = 0;
      }
    }

    if (batchOps > 0) {
      await batch.commit();
    }

    // Save metadata
    const metaRef = doc(db, "system_settings", "google_sheets_sync");
    await batch.set(
      metaRef,
      {
        lastSyncedAt: nowIso,
        totalRowsProcessed: rows.length,
        plotsSynced: plotsCount,
        bookedPlotsCount: bookedCount,
        dealsSynced: dealsCount,
        leadsSynced: leadsCount,
        spreadsheetId: sheetId,
        gid,
        status: "success",
      },
      { merge: true }
    );

    return {
      success: true,
      totalRowsProcessed: rows.length,
      plotsSynced: plotsCount,
      bookedPlotsCount: bookedCount,
      dealsSynced: dealsCount,
      leadsSynced: leadsCount,
      lastSyncedAt: nowIso,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Google Sheets sync failed:", errorMsg);
    return {
      success: false,
      totalRowsProcessed: 0,
      plotsSynced: 0,
      bookedPlotsCount: 0,
      dealsSynced: 0,
      leadsSynced: 0,
      lastSyncedAt: new Date().toISOString(),
      error: errorMsg,
    };
  }
}
