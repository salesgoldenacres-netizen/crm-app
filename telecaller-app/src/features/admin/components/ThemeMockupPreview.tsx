import type { CSSProperties } from "react";
import { Sun, Moon, Smartphone, Tablet as TabletIcon, Monitor } from "lucide-react";

interface ThemeMockupPreviewProps {
  brandingForm: any;
  previewMode: string;
  setPreviewMode: (val: string) => void;
  previewDevice: string;
  setPreviewDevice: (val: string) => void;
  previewTab: string;
  setPreviewTab: (val: string) => void;
}

export default function ThemeMockupPreview({
  brandingForm,
  previewMode,
  setPreviewMode,
  previewDevice,
  setPreviewDevice,
  previewTab,
  setPreviewTab,
}: ThemeMockupPreviewProps) {
  const shadowOpacity = (brandingForm.shadowIntensity || 4) / 100;
  const previewStyles = {
    "--primary": brandingForm.primaryColor,
    "--secondary": brandingForm.secondaryColor,
    "--accent": brandingForm.accentColor,
    "--sidebar": brandingForm.sidebarColor,
    "--header": brandingForm.headerColor,
    "--bg": previewMode === "dark" ? "#0f172a" : brandingForm.backgroundColor || "#f8fafc",
    "--card": previewMode === "dark" ? "#1e293b" : brandingForm.cardBackground || "#ffffff",
    "--border": previewMode === "dark" ? "#334155" : brandingForm.borderColor || "#e2e8f0",
    "--text-p": previewMode === "dark" ? "#f8fafc" : brandingForm.textPrimary || "#0f172a",
    "--text-s": previewMode === "dark" ? "#94a3b8" : brandingForm.textSecondary || "#475569",
    "--success": brandingForm.successColor,
    "--warning": brandingForm.warningColor,
    "--danger": brandingForm.dangerColor,
    "--info": brandingForm.infoColor,
    "--font": `'${brandingForm.typography || "Inter"}', sans-serif`,
    "--font-size-px": `${brandingForm.fontSize || 14}px`,
    "--radius-px": brandingForm.roundedCards ? `${brandingForm.borderRadius || 12}px` : "0px",
    "--shadow": `0 4px 6px -1px rgba(0, 0, 0, ${shadowOpacity}), 0 2px 4px -2px rgba(0, 0, 0, ${shadowOpacity})`,
  } as CSSProperties;

  return (
    <div className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b dark:border-gray-700 pb-3 gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-400">
            Interactive Mockup Preview
          </h3>
        </div>

        {/* Device and Theme Mock Toggles */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <div className="flex border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 p-0.5">
            <button
              onClick={() => setPreviewMode("light")}
              className={`p-1.5 rounded-md cursor-pointer border-0 bg-transparent ${
                previewMode === "light" ? "bg-white dark:bg-gray-800 shadow-sm text-amber-500" : "text-gray-500"
              }`}
              title="Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPreviewMode("dark")}
              className={`p-1.5 rounded-md cursor-pointer border-0 bg-transparent ${
                previewMode === "dark" ? "bg-white dark:bg-gray-800 shadow-sm text-indigo-400" : "text-gray-500"
              }`}
              title="Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Device width toggle */}
          <div className="flex border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 p-0.5">
            <button
              onClick={() => setPreviewDevice("mobile")}
              className={`p-1.5 rounded-md cursor-pointer border-0 bg-transparent ${
                previewDevice === "mobile" ? "bg-white dark:bg-gray-800 shadow-sm text-indigo-650" : "text-gray-500"
              }`}
              title="Mobile View"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPreviewDevice("tablet")}
              className={`p-1.5 rounded-md cursor-pointer border-0 bg-transparent ${
                previewDevice === "tablet" ? "bg-white dark:bg-gray-800 shadow-sm text-indigo-600" : "text-gray-500"
              }`}
              title="Tablet View"
            >
              <TabletIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPreviewDevice("desktop")}
              className={`p-1.5 rounded-md cursor-pointer border-0 bg-transparent ${
                previewDevice === "desktop" ? "bg-white dark:bg-gray-800 shadow-sm text-indigo-600" : "text-gray-500"
              }`}
              title="Desktop View"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Preview Tabs Selection */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 border-b dark:border-gray-700/60 text-xs font-bold">
        {[
          { id: "login", label: "Login" },
          { id: "dashboard", label: "Dashboard" },
          { id: "sidebar", label: "Sidebar" },
          { id: "leads", label: "Leads" },
          { id: "details", label: "Details" },
          { id: "kanban", label: "Kanban" },
          { id: "reports", label: "Reports" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPreviewTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg border-0 bg-transparent whitespace-nowrap cursor-pointer transition-colors ${
              previewTab === tab.id
                ? "bg-slate-100 dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 font-bold"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Live Render Area Wrapper */}
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-center min-h-[380px] overflow-hidden transition-all duration-300">
        <div
          className={`w-full bg-[var(--bg)] text-[var(--text-p)] transition-all duration-300 overflow-y-auto border shadow-md relative ${
            previewDevice === "mobile" ? "max-w-[340px] h-[480px]" : previewDevice === "tablet" ? "max-w-[560px] h-[420px]" : "w-full min-h-[360px]"
          }`}
          style={previewStyles}
        >
          {/* Tab 1: Login Screen */}
          {previewTab === "login" && (
            <div className="w-full h-full flex flex-col justify-center items-center p-6 text-center animate-fadeIn" style={{ fontFamily: "var(--font)" }}>
              <div className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-[var(--radius-px)] shadow-[var(--shadow)] w-full max-w-[280px] space-y-4">
                <div className="flex justify-center mb-1">
                  {brandingForm.logoUrl ? (
                    <img src={brandingForm.logoUrl} alt="Logo" className="h-10 object-contain" />
                  ) : (
                    <div className="w-10 h-10 bg-[var(--primary)] text-white rounded-[var(--radius-px)] flex items-center justify-center font-bold text-sm">
                      G
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm" style={{ color: "var(--text-p)" }}>{brandingForm.companyName}</h4>
                  <p className="text-[10px]" style={{ color: "var(--text-s)" }}>{brandingForm.tagline}</p>
                </div>
                <div className="space-y-2 text-left">
                  <div className="w-full h-8 bg-slate-50 dark:bg-slate-950/20 border border-[var(--border)] rounded-[var(--radius-px)] text-[10px] px-2.5 flex items-center text-gray-400">
                    Enter Username...
                  </div>
                  <div className="w-full h-8 bg-slate-50 dark:bg-slate-950/20 border border-[var(--border)] rounded-[var(--radius-px)] text-[10px] px-2.5 flex items-center text-gray-400">
                    Enter Password...
                  </div>
                </div>
                <button
                  type="button"
                  className="w-full text-white py-1.5 rounded-[var(--radius-px)] text-[11px] font-bold cursor-pointer border-0 hover:opacity-90 active:scale-95 transition-all"
                  style={{ backgroundColor: "var(--primary)", fontFamily: "var(--font)" }}
                >
                  Login to CRM
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Dashboard Overview */}
          {previewTab === "dashboard" && (
            <div className="w-full h-full flex flex-col text-xs animate-fadeIn" style={{ fontFamily: "var(--font)" }}>
              {/* Top Header Mockup */}
              <div className="flex justify-between items-center px-4 py-2 bg-[var(--header)] border-b border-[var(--border)] shrink-0">
                <div className="flex items-center gap-2">
                  {brandingForm.logoUrl ? (
                    <img src={brandingForm.logoUrl} alt="Logo" className="h-5 object-contain" />
                  ) : (
                    <span className="w-5 h-5 rounded-[4px] bg-[var(--primary)] text-white flex items-center justify-center font-bold text-[9px]">G</span>
                  )}
                  <span className="font-bold text-[11px]" style={{ color: "var(--text-p)" }}>{brandingForm.companyName}</span>
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[9px] shrink-0 border border-[var(--border)]">PA</div>
              </div>

              <div className={`p-4 flex-1 space-y-4 overflow-y-auto ${brandingForm.compactMode ? "space-y-2.5" : "space-y-4"}`}>
                <div>
                  <h3 className="font-extrabold text-[13px]">Real Estate Lead Analytics</h3>
                  <p className="text-[10px]" style={{ color: "var(--text-s)" }}>Welcome back, PA. Here is your team summary.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { title: "Total Leads", val: "148", desc: "+12.4% MoM", icon: "🔴", color: "var(--primary)" },
                    { title: "Site Visits", val: "32", desc: "4 pending", icon: "🟢", color: "var(--success)" },
                    { title: "Reservations", val: "14", desc: "Requires approval", icon: "🟡", color: "var(--warning)" },
                    { title: "Bookings", val: "₹1.4Cr", desc: "Target Met! 🏆", icon: "🔵", color: "var(--accent)" },
                  ].map((item, idx) => (
                    <div key={idx} className="bg-[var(--card)] border border-[var(--border)] p-3 rounded-[var(--radius-px)] shadow-[var(--shadow)] relative overflow-hidden">
                      <div className="text-[9px] font-bold" style={{ color: "var(--text-s)" }}>{item.title}</div>
                      <div className="text-sm font-extrabold mt-1" style={{ color: "var(--text-p)" }}>{item.val}</div>
                      <div className="text-[8px] mt-1" style={{ color: item.color }}>{item.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Quick chart / widget visual mockup */}
                <div className="bg-[var(--card)] border border-[var(--border)] p-3 rounded-[var(--radius-px)] shadow-[var(--shadow)] flex justify-between items-center gap-4">
                  <div className="space-y-1 w-2/3">
                    <div className="font-bold text-[10px]" style={{ color: "var(--text-p)" }}>Campaign Broadcast Metrics</div>
                    <div className="text-[8px]" style={{ color: "var(--text-s)" }}>WhatsApp broadcasts successfully sent to 125 leads today.</div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2">
                      <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--primary)", width: "70%" }} />
                    </div>
                  </div>
                  <button className="px-2.5 py-1 text-[9px] font-bold text-white rounded-[var(--radius-px)] cursor-pointer border-0 shrink-0 self-center" style={{ backgroundColor: "var(--primary)" }}>
                    View Analytics
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Sidebar Header mockup */}
          {previewTab === "sidebar" && (
            <div className="w-full h-full flex animate-fadeIn" style={{ fontFamily: "var(--font)" }}>
              <div
                className="w-52 border-r border-[var(--border)] flex flex-col h-full overflow-y-auto"
                style={{ backgroundColor: brandingForm.darkSidebar ? "#0f172a" : "var(--card)", color: brandingForm.darkSidebar ? "#f8fafc" : "var(--text-p)" }}
              >
                {/* Header */}
                <div className="p-3 border-b flex items-center space-x-2" style={{ borderColor: "var(--border)" }}>
                  {brandingForm.logoUrl ? (
                    <img src={brandingForm.logoUrl} alt="Logo" className="h-5 object-contain" />
                  ) : (
                    <div className="w-5 h-5 rounded-[4px] bg-[var(--primary)] text-white flex items-center justify-center font-bold text-[9px]">G</div>
                  )}
                  <span className="font-extrabold text-[11px] truncate">
                    {brandingForm.companyName}
                  </span>
                </div>

                {/* Navigation */}
                <div className="flex-1 p-2 space-y-1">
                  <div className="flex items-center space-x-2 p-1.5 rounded-[var(--radius-px)] text-[10px] font-bold cursor-pointer" style={{ backgroundColor: `${brandingForm.primaryColor}1a`, color: brandingForm.primaryColor }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
                    <span>Active Dashboard</span>
                  </div>
                  {["Leads Workspace", "Project Layout Maps", "Agent Rosters", "Analytics", "Settings"].map((nav, idx) => (
                    <div key={idx} className="flex items-center space-x-2 p-1.5 rounded-[var(--radius-px)] text-[10px] font-semibold opacity-70 hover:opacity-100 cursor-pointer">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                      <span>{nav}</span>
                    </div>
                  ))}
                </div>

                {/* Bottom Status panel */}
                <div className="p-2.5 border-t flex justify-between items-center text-[8px] font-bold tracking-wider opacity-85 uppercase" style={{ borderColor: "var(--border)" }}>
                  <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: "var(--success)" }} /> Booked</span>
                  <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: "var(--warning)" }} /> Reserved</span>
                  <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: "var(--danger)" }} /> Sold Out</span>
                </div>
              </div>

              <div className="flex-1 bg-slate-55 dark:bg-slate-950 p-6 flex flex-col justify-center text-center font-bold">
                <span className="text-[28px] opacity-20">📂</span>
                <h5 className="font-bold mt-2" style={{ color: "var(--text-p)" }}>Sidebar Preview Mode</h5>
                <p className="text-[10px] max-w-[160px] mx-auto mt-1 font-medium" style={{ color: "var(--text-s)" }}>
                  Shows sidebar rendering in {brandingForm.darkSidebar ? "Forced Dark" : "Matching Card"} theme.
                </p>
              </div>
            </div>
          )}

          {/* Tab 4: Leads Page Table */}
          {previewTab === "leads" && (
            <div className="w-full h-full flex flex-col p-4 space-y-3 animate-fadeIn" style={{ fontFamily: "var(--font)", fontSize: "var(--font-size-px)" }}>
              <div className="flex justify-between items-center shrink-0">
                <h4 className="font-bold text-xs" style={{ color: "var(--text-p)" }}>Leads Directory</h4>
                <button className="px-2.5 py-1 text-[9px] font-bold text-white rounded-[var(--radius-px)] border-0 cursor-pointer" style={{ backgroundColor: "var(--primary)" }}>
                  + Add Lead
                </button>
              </div>

              <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-px)] shadow-[var(--shadow)] overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border)] text-[10px] text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 font-bold" style={{ color: "var(--text-s)" }}>
                    <tr>
                      <th className="px-3 py-1.5">Lead #</th>
                      <th className="px-3 py-1.5">Customer</th>
                      <th className="px-3 py-1.5">Mobile</th>
                      <th className="px-3 py-1.5">Status</th>
                      <th className="px-3 py-1.5">Follow Up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-semibold" style={{ color: "var(--text-p)" }}>
                    {[
                      { id: "L-2901", name: "Rahul Sharma", phone: "9876543210", status: "site-visit-confirmed", badge: "Site Visit ⏳", color: "var(--warning)" },
                      { id: "L-2902", name: "Aditi Rao", phone: "9123456789", status: "booked", badge: "Booked ✅", color: "var(--success)" },
                      { id: "L-2903", name: "Vikram Sen", phone: "9988776655", status: "new", badge: "New Info 🔵", color: "var(--info)" },
                    ].map((lead, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="px-3 py-2 font-mono font-bold">{lead.id}</td>
                        <td className="px-3 py-2 font-bold">{lead.name}</td>
                        <td className="px-3 py-2" style={{ color: "var(--text-s)" }}>{lead.phone}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold text-white" style={{ backgroundColor: lead.color }}>
                            {lead.badge}
                          </span>
                        </td>
                        <td className="px-3 py-2" style={{ color: "var(--text-s)" }}>2026-07-09</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: Customer Details log */}
          {previewTab === "details" && (
            <div className="w-full h-full flex flex-col p-4 space-y-3 animate-fadeIn" style={{ fontFamily: "var(--font)", fontSize: "var(--font-size-px)" }}>
              {/* Profil summary header */}
              <div className="bg-[var(--card)] border border-[var(--border)] p-3 rounded-[var(--radius-px)] shadow-[var(--shadow)] flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white font-extrabold flex items-center justify-center text-xs shrink-0">AR</div>
                  <div>
                    <h4 className="font-bold text-xs" style={{ color: "var(--text-p)" }}>Aditi Rao</h4>
                    <span className="text-[9px] font-bold" style={{ color: "var(--success)" }}>Premium Lead • Booked</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold" style={{ color: "var(--text-s)" }}>#L-2902</span>
              </div>

              {/* Body columns */}
              <div className="grid grid-cols-3 gap-3 flex-1 overflow-y-auto">
                {/* Left: profile parameters */}
                <div className="col-span-1 space-y-2">
                  {[
                    { label: "Mobile", val: "+91 91234 56789" },
                    { label: "Email", val: "aditi.rao@gmail.com" },
                    { label: "Interest", val: "Meadows #P12" },
                  ].map((item, idx) => (
                    <div key={idx} className="bg-[var(--card)] border border-[var(--border)] p-2 rounded-[var(--radius-px)]">
                      <div className="text-[8px] font-semibold uppercase" style={{ color: "var(--text-s)" }}>{item.label}</div>
                      <div className="text-[9px] font-bold mt-0.5 truncate" style={{ color: "var(--text-p)" }}>{item.val}</div>
                    </div>
                  ))}
                </div>

                {/* Right: call logs timeline */}
                <div className="col-span-2 bg-[var(--card)] border border-[var(--border)] p-3 rounded-[var(--radius-px)] shadow-[var(--shadow)] space-y-2">
                  <div className="font-bold text-[9px] uppercase border-b pb-1" style={{ color: "var(--text-s)", borderColor: "var(--border)" }}>Interaction Log History</div>
                  <div className="space-y-2 overflow-y-auto max-h-[140px]">
                    {[
                      { agent: "PA (Pre-sales)", note: "Site visit completed! Client loved plot P12 and agreed to book.", date: "Today, 10:14 AM" },
                      { agent: "System Bot", note: "Discount of ₹50,000 requested by admin approved.", date: "Yesterday, 3:30 PM" },
                    ].map((log, idx) => (
                      <div key={idx} className="text-[9px] space-y-0.5 border-l-2 pl-2" style={{ borderColor: "var(--primary)" }}>
                        <div className="flex justify-between items-center">
                          <span className="font-bold" style={{ color: "var(--text-p)" }}>{log.agent}</span>
                          <span className="text-[7px]" style={{ color: "var(--text-s)" }}>{log.date}</span>
                        </div>
                        <p className="italic text-[8px]" style={{ color: "var(--text-s)" }}>"{log.note}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Kanban Pipeline View */}
          {previewTab === "kanban" && (
            <div className="w-full h-full flex flex-col p-4 space-y-3 animate-fadeIn" style={{ fontFamily: "var(--font)" }}>
              <h4 className="font-bold text-xs" style={{ color: "var(--text-p)" }}>Pipeline Stages</h4>
              <div className="grid grid-cols-3 gap-2 flex-1 items-start">
                {/* Columns */}
                {[
                  { title: "New Info", count: 2, bg: "var(--info)", list: [{ name: "Vikram Sen", loc: "Meadows #B2" }] },
                  { title: "Site Visit", count: 1, bg: "var(--warning)", list: [{ name: "Rahul Sharma", loc: "Balaji Nagar #P08" }] },
                  { title: "Booked", count: 3, bg: "var(--success)", list: [{ name: "Aditi Rao", loc: "OMR Meadows #12" }] },
                ].map((col, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-900/60 border border-[var(--border)] p-2 rounded-[var(--radius-px)] space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: col.bg }} />{col.title}</span>
                      <span className="bg-slate-200 dark:bg-slate-800 text-[8px] px-1 rounded">{col.count}</span>
                    </div>
                    <div className="space-y-1.5">
                      {col.list.map((item, itemIdx) => (
                        <div key={itemIdx} className="bg-[var(--card)] border border-[var(--border)] p-2 rounded-[var(--radius-px)] shadow-sm space-y-1 font-semibold">
                          <div className="font-bold text-[9px]" style={{ color: "var(--text-p)" }}>{item.name}</div>
                          <div className="text-[7px]" style={{ color: "var(--text-s)" }}>{item.loc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 7: Reports Charts */}
          {previewTab === "reports" && (
            <div className="w-full h-full flex flex-col p-4 space-y-3 animate-fadeIn" style={{ fontFamily: "var(--font)" }}>
              <h4 className="font-bold text-xs" style={{ color: "var(--text-p)" }}>Acquisition Source Report</h4>
              <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-[var(--radius-px)] shadow-[var(--shadow)] space-y-4">
                <div className="text-[10px]" style={{ color: "var(--text-s)" }}>Distribution of customer acquisition channels (MTD)</div>
                <div className="space-y-3 text-[10px]">
                  {[
                    { source: "Google Ads", pct: 45, val: "54 leads", color: "var(--primary)" },
                    { source: "Meta Ads", pct: 30, val: "36 leads", color: "var(--accent)" },
                    { source: "Direct Call / Walk-in", pct: 15, val: "18 leads", color: "var(--success)" },
                    { source: "Referrals", pct: 10, val: "12 leads", color: "var(--warning)" },
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center font-bold">
                        <span style={{ color: "var(--text-p)" }}>{item.source}</span>
                        <span className="font-extrabold text-slate-700 dark:text-slate-300">{item.val} ({item.pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all duration-500" style={{ backgroundColor: item.color, width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sticky bottom banner for custom tags/styles preview */}
          <div
            className="absolute inset-x-0 bottom-0 h-1"
            style={{
              background: `linear-gradient(to right, var(--primary), var(--secondary))`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
