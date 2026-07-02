import React from "react";
import { 
  Weight, 
  Layers, 
  Scissors, 
  Percent, 
  Cpu, 
  TriangleAlert,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Package,
  Zap,
  Hash
} from "lucide-react";

interface KPICardsProps {
  metrics: {
    total_fabric_used: number;
    total_fabric_spread: number;
    total_cutting_scrap: number;
    total_spreading_scrap: number;
    total_marker_scrap: number;
    avg_maker_efficiency_provided: number;
    avg_ete_efficiency: number;
    remnant_utilization: number;
    efficiency_gap: number;
    // New Datewise KPIs
    latestDateStr?: string;
    today_fabric_used?: number;
    today_cut_qty?: number;
    yesterday_cut_qty?: number;
    daily_trend_percent?: number;
    month_cut_qty?: number;
    month_fabric_used?: number;
    daily_avg_cut_qty?: number;
    recent_ete_efficiency?: number;
    // New Cumulative/Overall KPIs
    total_cutting_lots?: number;
    total_lay_layers?: number;
    total_cutting_qty?: number;
    total_used_fabric_inch?: number;
    avg_size_ratio?: number;
    today_avg_size_ratio?: number;
  };
  group?: "daily" | "monthly" | "all";
}

export default function KPICards({ metrics, group = "all" }: KPICardsProps) {
  const kpis = [
    {
      id: "gross-fabric",
      title: "Gross Fabric Used",
      amount: metrics.total_fabric_used.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Total weight of fabric rolls issued to the table",
      icon: Weight,
      color: "text-[#2563EB] bg-[#2563EB]/10",
      statusText: "Operational",
      statusColor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    },
    {
      id: "fabric-spread",
      title: "Total Fabric Spread",
      amount: metrics.total_fabric_spread.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Fabric laid after subtracting remnant/roll-end waste",
      icon: Layers,
      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10",
      statusText: "Standard",
      statusColor: "bg-blue-500/15 text-blue-600 border-blue-500/20",
    },
    {
      id: "cutting-scrap",
      title: "Total Cutting Scrap",
      amount: metrics.total_cutting_scrap.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Direct physical scissor scrap collected from cuts",
      icon: Scissors,
      color: "text-[#DC2626] bg-[#DC2626]/10",
      statusText: "Scrap Alert",
      statusColor: metrics.total_cutting_scrap > 50 ? "bg-rose-500/15 text-rose-600 border-rose-500/20" : "bg-slate-500/15 text-slate-600 border-slate-500/20",
    },
    {
      id: "cad-eff",
      title: "Marker CAD Efficiency",
      amount: metrics.avg_maker_efficiency_provided.toFixed(1),
      unit: "%",
      desc: "Target CAD layout efficiency (Provided by pattern dept)",
      icon: Cpu,
      color: "text-amber-600 bg-amber-500/10",
      statusText: "Optimized",
      statusColor: "bg-amber-500/15 text-amber-600 border-amber-500/20",
    },
    {
      id: "ete-eff",
      title: "Actual Physical ETE Efficiency",
      amount: metrics.avg_ete_efficiency.toFixed(1),
      unit: "%",
      desc: "End-to-end efficiency of finished panel weight",
      icon: Percent,
      color: "text-[#16A34A] bg-[#16A34A]/10",
      statusText: "Compliant",
      statusColor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
      highlight: true,
    },
    {
      id: "eff-gap",
      title: "ETE Efficiency Gap",
      amount: metrics.efficiency_gap.toFixed(1),
      unit: "%",
      desc: "Difference between theoretical vs physical efficiency",
      icon: TriangleAlert,
      color: metrics.efficiency_gap > 8 ? "text-[#DC2626] bg-[#DC2626]/10" : "text-[#F59E0B] bg-[#F59E0B]/10",
      statusText: metrics.efficiency_gap > 8 ? "Action Required" : "Stable",
      statusColor: metrics.efficiency_gap > 8 ? "bg-red-500/15 text-red-600 border-red-500/20" : "bg-slate-500/15 text-slate-600 border-slate-500/20",
    },
    // Datewise KPIs
    {
      id: "today-output",
      title: `Today's Output (${metrics.latestDateStr || "Today"})`,
      amount: (metrics.today_cut_qty || 0).toLocaleString(),
      unit: "Pcs",
      desc: "Planned garment parts cut on the latest active date",
      icon: Package,
      color: "text-violet-600 bg-violet-500/10",
      statusText: "Active Run",
      statusColor: "bg-violet-500/15 text-violet-600 border-violet-500/20",
    },
    {
      id: "today-fabric",
      title: "Today's Fabric Used",
      amount: (metrics.today_fabric_used || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Fabric rolls laid for cutting on the latest active date",
      icon: Weight,
      color: "text-cyan-600 bg-cyan-500/10",
      statusText: "Daily Log",
      statusColor: "bg-cyan-500/15 text-cyan-600 border-cyan-500/20",
    },
    {
      id: "daily-trend",
      title: "Daily Output Trend",
      amount: metrics.daily_trend_percent !== undefined ? (metrics.daily_trend_percent >= 0 ? "+" : "") + metrics.daily_trend_percent.toFixed(1) : "0.0",
      unit: "%",
      desc: "Comparison of planned parts cut between today vs yesterday",
      icon: metrics.daily_trend_percent !== undefined && metrics.daily_trend_percent >= 0 ? TrendingUp : TrendingDown,
      color: metrics.daily_trend_percent !== undefined && metrics.daily_trend_percent >= 0 ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10",
      statusText: metrics.daily_trend_percent !== undefined && metrics.daily_trend_percent >= 0 ? "Increasing" : "Decreasing",
      statusColor: metrics.daily_trend_percent !== undefined && metrics.daily_trend_percent >= 0 ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : "bg-rose-500/15 text-rose-600 border-rose-500/20",
    },
    {
      id: "daily-avg",
      title: "Daily Average Cut",
      amount: (metrics.daily_avg_cut_qty || 0).toLocaleString(),
      unit: "Pcs/Day",
      desc: "Average daily parts cut across active logged history",
      icon: Clock,
      color: "text-teal-600 bg-teal-500/10",
      statusText: "Historic Avg",
      statusColor: "bg-teal-500/15 text-teal-600 border-teal-500/20",
    },
    {
      id: "month-total",
      title: "Monthly Total Cut",
      amount: (metrics.month_cut_qty || 0).toLocaleString(),
      unit: "Pcs",
      desc: "Cumulative planned parts cut in the current active month",
      icon: Calendar,
      color: "text-pink-600 bg-pink-500/10",
      statusText: "Monthly Run",
      statusColor: "bg-pink-500/15 text-pink-600 border-pink-500/20",
    },
    {
      id: "recent-quality",
      title: "Recent 7-Day Quality",
      amount: (metrics.recent_ete_efficiency || 0).toFixed(1),
      unit: "%",
      desc: "Moving average ETE physical efficiency of the last 7 active dates",
      icon: Zap,
      color: "text-emerald-600 bg-emerald-500/10",
      statusText: (metrics.recent_ete_efficiency || 0) > 85 ? "High Yield" : "Standard",
      statusColor: (metrics.recent_ete_efficiency || 0) > 85 ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : "bg-amber-500/15 text-amber-600 border-amber-500/20",
    },
    {
      id: "size-ratio",
      title: "Average Size Ratio",
      amount: (metrics.avg_size_ratio || 0).toFixed(1),
      unit: "Ratio",
      desc: `Mean size/marker ratio per cutting lot. Latest day's average ratio is ${metrics.today_avg_size_ratio || 0}`,
      icon: Hash,
      color: "text-indigo-600 bg-indigo-500/10",
      statusText: "Size Ratio",
      statusColor: "bg-indigo-500/15 text-indigo-600 border-indigo-500/20",
    },
    // Cumulative/Overall KPIs
    {
      id: "total-lots",
      title: "Total Cutting Lots",
      amount: (metrics.total_cutting_lots || 0).toLocaleString(),
      unit: "Lots",
      desc: `Weight: ${(metrics.total_fabric_used || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} KG`,
      icon: Scissors,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
      statusText: "All-Time",
      statusColor: "bg-blue-500/15 text-blue-600 border-blue-500/20",
    },
    {
      id: "total-layers",
      title: "Total Lay Layers",
      amount: (metrics.total_lay_layers || 0).toLocaleString(),
      unit: "Layers",
      desc: `Avg: ${Math.round((metrics.total_lay_layers || 0) / (metrics.total_cutting_lots || 1))} / lot`,
      icon: Layers,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10",
      statusText: "Cumulative",
      statusColor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    },
    {
      id: "total-qty",
      title: "Total Cut Quantity",
      amount: (metrics.total_cutting_qty || 0).toLocaleString(),
      unit: "Pcs",
      desc: "Cumulative sum of cut garments (Ratio × Lay) across all approved lots",
      icon: Hash,
      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10",
      statusText: "Total Yield",
      statusColor: "bg-indigo-500/15 text-indigo-600 border-indigo-500/20",
    },
    {
      id: "total-used-inch",
      title: "Total Used Fabric (Inch)",
      amount: (metrics.total_used_fabric_inch || 0).toLocaleString(undefined, { maximumFractionDigits: 1 }),
      unit: "In.",
      desc: "Effective cut inches processed",
      icon: Cpu,
      color: "text-pink-600 bg-pink-50 dark:bg-pink-500/10",
      statusText: "CAD Length",
      statusColor: "bg-pink-500/15 text-pink-600 border-pink-500/20",
    }
  ];

  // Group filter logic
  const dailyKeys = ["total-qty", "today-output", "today-fabric", "size-ratio", "daily-trend", "daily-avg", "recent-quality"];
  const dailyKpis = dailyKeys.map(key => kpis.find(k => k.id === key)).filter((k): k is typeof kpis[0] => !!k);

  const monthlyKpis = kpis.filter(kpi => 
    ["gross-fabric", "fabric-spread", "cutting-scrap", "cad-eff", "ete-eff", "eff-gap", "month-total", "total-lots", "total-layers", "total-qty", "total-used-inch"].includes(kpi.id)
  );

  const renderCardGrid = (items: typeof kpis) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2k:grid-cols-5 gap-5">
      {items.map((kpi, idx) => {
        const Icon = kpi.icon;
        const containerClasses = kpi.highlight
          ? "bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/80 border-2 border-emerald-500/30 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 duration-300 relative overflow-hidden"
          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:-translate-y-0.5 duration-300 relative overflow-hidden";

        return (
          <div key={kpi.id} className={containerClasses} id={`kpi-card-${kpi.id}`}>
            <div className="flex items-center justify-between mb-4.5">
              <div className={`p-3 rounded-xl ${kpi.color}`}>
                <Icon size={20} className="stroke-[2.5]" />
              </div>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border tracking-wider ${kpi.statusColor}`}>
                {kpi.statusText}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                {kpi.title}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none font-mono">
                  {kpi.amount}
                </span>
                <span className="text-sm text-slate-400 dark:text-slate-500 font-bold uppercase">
                  {kpi.unit}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-3 leading-relaxed">
              {kpi.desc}
            </p>
          </div>
        );
      })}
    </div>
  );

  if (group === "daily") {
    return (
      <div className="space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
          <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Daily Shifts, Trends & Quality KPIs
          </h3>
        </div>
        {renderCardGrid(dailyKpis)}
      </div>
    );
  }

  if (group === "monthly") {
    return (
      <div className="space-y-6 font-sans">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
            <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Monthly Cumulative & Quality Efficiencies
            </h3>
          </div>
          <div className="mt-4">
            {renderCardGrid(monthlyKpis.filter(kpi => ["gross-fabric", "fabric-spread", "cutting-scrap", "cad-eff", "ete-eff", "eff-gap"].includes(kpi.id)))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
            <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Production Volume & Fabric Utilizations
            </h3>
          </div>
          <div className="mt-4">
            {renderCardGrid(monthlyKpis.filter(kpi => ["month-total", "total-lots", "total-layers", "total-used-inch"].includes(kpi.id)))}
          </div>
        </div>
      </div>
    );
  }

  // Fallback / "all"
  return (
    <div className="space-y-6 font-sans">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
          <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Standard operational KPIs
          </h3>
        </div>
        {renderCardGrid(kpis.slice(0, 6))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
          <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Date-wise, Trend & Monthly Analytics
          </h3>
        </div>
        {renderCardGrid(kpis.slice(6, 12))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
          <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Cumulative Physical & CAD Production Totals
          </h3>
        </div>
        {renderCardGrid(kpis.slice(12))}
      </div>
    </div>
  );
}
