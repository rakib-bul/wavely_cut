import React from "react";
import { 
  Weight, 
  Layers, 
  Scissors, 
  Percent, 
  Cpu, 
  TriangleAlert
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
  };
}

export default function KPICards({ metrics }: KPICardsProps) {
  const kpis = [
    {
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
      title: "Actual Fabric Spread",
      amount: metrics.total_fabric_spread.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Fabric laid after subtracting remnant/roll-end waste",
      icon: Layers,
      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10",
      statusText: "Standard",
      statusColor: "bg-blue-500/15 text-blue-600 border-blue-500/20",
    },
    {
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
      title: "ETE Efficiency Gap",
      amount: metrics.efficiency_gap.toFixed(1),
      unit: "%",
      desc: "Difference between theoretical vs physical efficiency",
      icon: TriangleAlert,
      color: metrics.efficiency_gap > 8 ? "text-[#DC2626] bg-[#DC2626]/10" : "text-[#F59E0B] bg-[#F59E0B]/10",
      statusText: metrics.efficiency_gap > 8 ? "Action Required" : "Stable",
      statusColor: metrics.efficiency_gap > 8 ? "bg-red-500/15 text-red-600 border-red-500/20" : "bg-slate-500/15 text-slate-600 border-slate-500/20",
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        
        // Redesigned with 24px padding (p-6), clean borders, high contrast
        const containerClasses = kpi.highlight
          ? "bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/80 border-2 border-emerald-500/30 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 duration-300 relative overflow-hidden"
          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:-translate-y-0.5 duration-300 relative overflow-hidden";

        return (
          <div key={idx} className={containerClasses} id={`kpi-card-${idx}`}>
            
            {/* Top row: Icon on left, status badge on right */}
            <div className="flex items-center justify-between mb-4.5">
              <div className={`p-3 rounded-xl ${kpi.color}`}>
                <Icon size={20} className="stroke-[2.5]" />
              </div>
              
              {/* Machine/Metric Status Badge */}
              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border tracking-wider ${kpi.statusColor}`}>
                {kpi.statusText}
              </span>
            </div>

            {/* Label and Value */}
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

            {/* Description */}
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-3 leading-relaxed">
              {kpi.desc}
            </p>
            
          </div>
        );
      })}
    </div>
  );
}
