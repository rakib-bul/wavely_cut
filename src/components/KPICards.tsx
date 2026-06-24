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
      highlight: false,
    },
    {
      title: "Actual Fabric Spread",
      amount: metrics.total_fabric_spread.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Fabric laid after subtracting remnant/roll-end waste",
      icon: Layers,
      highlight: false,
    },
    {
      title: "Total Cutting Scrap",
      amount: metrics.total_cutting_scrap.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Direct physical scissor scrap collected from cuts",
      icon: Scissors,
      highlight: false,
    },
    {
      title: "Marker CAD Efficiency",
      amount: metrics.avg_maker_efficiency_provided.toFixed(1),
      unit: "%",
      desc: "Target CAD layout efficiency (Provided by pattern dept)",
      icon: Cpu,
      highlight: false,
    },
    {
      title: "Actual Physical ETE Efficiency",
      amount: metrics.avg_ete_efficiency.toFixed(1),
      unit: "%",
      desc: "End-to-end efficiency of finished panel weight",
      icon: Percent,
      highlight: true, // Special highlighted card
    },
    {
      title: "ETE Efficiency Gap",
      amount: metrics.efficiency_gap.toFixed(1),
      unit: "%",
      desc: "Difference between theoretical vs physical efficiency",
      icon: TriangleAlert,
      highlight: false,
      valueColor: metrics.efficiency_gap > 8 ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        
        // Handle custom styling for highlighted vs standard cards
        const containerClasses = kpi.highlight
          ? "bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-slate-800 p-5 rounded-xl border shadow-sm transition-transform hover:-translate-y-0.5 duration-200"
          : "bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 p-5 rounded-xl border shadow-xs transition-transform hover:-translate-y-0.5 duration-200";

        const titleClasses = kpi.highlight
          ? "text-[10px] uppercase tracking-wider font-semibold text-slate-800 dark:text-slate-200 mb-1"
          : "text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1";

        const valueClasses = kpi.highlight
          ? "text-2xl font-bold font-mono text-slate-900 dark:text-white"
          : `text-2xl font-bold font-mono ${kpi.valueColor || "text-slate-900 dark:text-slate-100"}`;

        const unitClasses = kpi.highlight
          ? "text-sm text-slate-500 dark:text-slate-400 font-medium mb-1"
          : "text-sm text-slate-400 dark:text-slate-500 font-medium mb-1";

        const iconWrapperClasses = kpi.highlight
          ? "p-2 rounded-lg bg-slate-900 dark:bg-slate-800 text-white"
          : "p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400";

        return (
          <div key={idx} className={containerClasses} id={`kpi-card-${idx}`}>
            <div className="flex items-center justify-between mb-3">
              <p className={titleClasses}>{kpi.title}</p>
              <div className={iconWrapperClasses}>
                <Icon size={15} />
              </div>
            </div>
            
            <div className="flex items-end gap-1.5">
              <h3 className={valueClasses}>{kpi.amount}</h3>
              <span className={unitClasses}>{kpi.unit}</span>
            </div>
            
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2.5 leading-relaxed">
              {kpi.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}
