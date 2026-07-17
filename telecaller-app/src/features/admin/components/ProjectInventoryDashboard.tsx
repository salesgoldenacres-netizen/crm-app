import { Map as MapIcon } from "lucide-react";
import { Lead, Project } from "@/shared/types";

interface ProjectInventoryDashboardProps {
  projects: Record<string, Project>;
  leads: Lead[];
}

export default function ProjectInventoryDashboard({
  projects,
  leads,
}: ProjectInventoryDashboardProps) {
  const inventoryData = Object.values(projects).map((project) => {
    const projectLeads = leads.filter((l) => l.projectId === project.id);
    const bookedPlots = projectLeads
      .filter((l) => l.status === "booked")
      .map((l) => l.plotId)
      .filter(Boolean);
    const reservedPlots = projectLeads
      .filter((l) => l.status === "reserved")
      .map((l) => l.plotId)
      .filter(Boolean);
    const uniqueBooked = [...new Set(bookedPlots)].length;
    const uniqueReserved = [...new Set(reservedPlots)].length;
    const totalPlots = parseInt(String(project.totalPlots)) || 0;
    const available = Math.max(0, totalPlots - uniqueBooked - uniqueReserved);

    // Estimate revenue from booked leads
    let estimatedRevenue = 0;
    projectLeads.forEach((l) => {
      if (l.status === "booked" && (l as any).plotRate) {
        estimatedRevenue += parseFloat((l as any).plotRate) || 0;
      }
    });

    return {
      ...project,
      totalPlots,
      booked: uniqueBooked,
      reserved: uniqueReserved,
      available,
      estimatedRevenue,
      totalLeads: projectLeads.length,
    };
  });

  const grandTotal = inventoryData.reduce((a, p) => a + p.totalPlots, 0);
  const grandBooked = inventoryData.reduce((a, p) => a + p.booked, 0);
  const grandReserved = inventoryData.reduce((a, p) => a + p.reserved, 0);
  const grandAvailable = inventoryData.reduce((a, p) => a + p.available, 0);
  const grandRevenue = inventoryData.reduce((a, p) => a + p.estimatedRevenue, 0);

  return (
    <div className="bg-theme-card rounded-xl shadow-sm border border-theme-border p-6 space-y-5">
      <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider flex items-center">
        <MapIcon className="w-4 h-4 mr-2 text-indigo-500" />
        Project Inventory Dashboard
      </h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-gray-55 dark:bg-gray-900/50 rounded-xl p-4 border dark:border-gray-700 text-center">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Plots</div>
          <div className="text-xl font-black text-theme-text mt-1">{grandTotal}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-955/20 rounded-xl p-4 border border-green-100 dark:border-green-900 text-center">
          <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Sold / Booked</div>
          <div className="text-xl font-black text-green-700 dark:text-green-400 mt-1">{grandBooked}</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-955/20 rounded-xl p-4 border border-amber-100 dark:border-amber-900 text-center">
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Reserved</div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">{grandReserved}</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-955/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900 text-center">
          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Available</div>
          <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">{grandAvailable}</div>
        </div>
        <div className="bg-theme-accent-muted dark:bg-indigo-955/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900 text-center">
          <div className="text-[10px] font-bold text-theme-accent uppercase tracking-wider">Revenue (Est.)</div>
          <div className="text-xl font-black text-theme-accent mt-1">
            ₹{(grandRevenue / 100000).toFixed(1)}L
          </div>
        </div>
      </div>

      {/* Per-Project Breakdown */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-theme-border text-xs">
          <thead className="bg-theme-surface">
            <tr>
              <th className="px-4 py-2.5 text-left font-bold text-theme-muted uppercase tracking-wider">
                Project
              </th>
              <th className="px-4 py-2.5 text-center font-bold text-theme-muted uppercase tracking-wider">
                Total Plots
              </th>
              <th className="px-4 py-2.5 text-center font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                Booked
              </th>
              <th className="px-4 py-2.5 text-center font-bold text-theme-warning uppercase tracking-wider">
                Reserved
              </th>
              <th className="px-4 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Available
              </th>
              <th className="px-4 py-2.5 text-center font-bold text-theme-accent uppercase tracking-wider">
                Est. Revenue
              </th>
              <th className="px-4 py-2.5 text-center font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Active Leads
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border">
            {inventoryData.map((project) => {
              const sellPercent =
                project.totalPlots > 0 ? Math.round((project.booked / project.totalPlots) * 100) : 0;
              return (
                <tr key={project.id} className="hover:bg-gray-55 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-theme-text">
                    <div>{project.name}</div>
                    <div className="text-[10px] text-gray-400 font-normal">Location: {project.location || "N/A"}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-theme-text">
                    {project.totalPlots}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-green-700 dark:text-green-400">{project.booked}</span>
                    <span className="text-[10px] text-gray-400 font-medium ml-1">({sellPercent}%)</span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-amber-700 dark:text-amber-400">
                    {project.reserved}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-blue-700 dark:text-blue-400">
                    {project.available}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-theme-accent">
                    ₹{(project.estimatedRevenue / 100000).toFixed(1)}L
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-purple-600 dark:text-purple-400">
                    {project.totalLeads}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
