import React, { useState } from "react";
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
  Hash,
  LayoutGrid,
  Table,
  ChevronLeft,
  ChevronRight
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
    // Remnants detailed totals
    total_remnants_issued?: number;
    total_remnants_scrap_kg?: number;
    total_remnants_used_kg?: number;
    total_reject_qty?: number;
    remnants_issued_percent?: number;
    remnants_scrap_percent?: number;
    remnants_utilization_percent?: number;
    // Today remnant metrics
    today_remnants_issued?: number;
    today_remnants_scrap_kg?: number;
    today_remnants_used_kg?: number;
    today_reject_qty?: number;
    today_remnants_issued_percent?: number;
    today_remnants_scrap_percent?: number;
    today_remnants_utilization_percent?: number;
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
    today_lay_layers?: number;
    today_total_ratio?: number;
    today_remnants?: number;
    today_fabric_spread?: number;
    today_spreading_scrap?: number;
    today_cutting_scrap?: number;
    // New Cumulative/Overall KPIs
    total_cutting_lots?: number;
    total_lay_layers?: number;
    total_cutting_qty?: number;
    total_used_fabric_inch?: number;
    avg_size_ratio?: number;
    today_avg_size_ratio?: number;
    total_fabric_save_loss_percent?: number;
    total_fabric_save_loss_kg?: number;
    today_fabric_save_loss_percent?: number;
    today_fabric_save_loss_kg?: number;
    today_booking_vs_marker?: number;
    today_booking_vs_cut?: number;
  };
  group?: "daily" | "monthly" | "all";
  selectedDate?: string;
  setSelectedDate?: (date: string) => void;
  availableDates?: string[];
}

export default function KPICards({ 
  metrics, 
  group = "all", 
  selectedDate, 
  setSelectedDate, 
  availableDates 
}: KPICardsProps) {
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
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
    },
    {
      id: "today-lay-layers",
      title: "Total Daily Lay Qty",
      amount: (metrics.today_lay_layers || 0).toLocaleString(),
      unit: "Layers",
      desc: "Total layers laid for cutting on the latest active date",
      icon: Layers,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
      statusText: "Daily Layers",
      statusColor: "bg-blue-500/15 text-blue-600 border-blue-500/20",
    },
    {
      id: "today-ratio-combined",
      title: "Today's Size Ratios",
      amount: (metrics.today_total_ratio || 0).toFixed(1),
      unit: "Total Ratio",
      desc: "Combined view of today's sum of size ratios and mean size ratio",
      icon: Hash,
      color: "text-violet-600 bg-violet-500/10",
      statusText: "Ratio Stats",
      statusColor: "bg-violet-500/15 text-violet-600 border-violet-500/20",
      secondary: {
        title: "Avg Ratio Today",
        amount: (metrics.today_avg_size_ratio || 0).toFixed(1),
        unit: "Avg Ratio"
      }
    },
    {
      id: "today-fabric-spread",
      title: "Today's Spread Fabric",
      amount: (metrics.today_fabric_spread || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Fabric laid today after subtracting remnants and roll-end waste",
      icon: Layers,
      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10",
      statusText: "Spread Weight",
      statusColor: "bg-indigo-500/15 text-indigo-600 border-indigo-500/20",
    },
    {
      id: "today-spreading-scrap",
      title: "Today's Spreading Scrap",
      amount: (metrics.today_spreading_scrap || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Waste weight generated during the spreading phase today",
      icon: Scissors,
      color: "text-rose-600 bg-rose-500/10",
      statusText: "Spreading Scrap",
      statusColor: "bg-rose-500/15 text-rose-600 border-rose-500/20",
    },
    {
      id: "today-cutting-scrap",
      title: "Today's Cutting Scrap",
      amount: (metrics.today_cutting_scrap || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Direct physical scissor cutting scrap collected from today's cuts",
      icon: Scissors,
      color: "text-rose-600 bg-rose-500/10",
      statusText: "Cutting Scrap",
      statusColor: "bg-rose-500/15 text-rose-600 border-rose-500/20",
    },
    {
      id: "today-remnants-issued",
      title: "Today's Remnants Issued",
      amount: (metrics.today_remnants_issued || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Total remnant weight returned or re-entered today",
      icon: Weight,
      color: "text-blue-600 bg-blue-500/10",
      statusText: "Today's Remnants",
      statusColor: "bg-blue-500/15 text-blue-600 border-blue-500/20",
    },
    {
      id: "today-remnants-used",
      title: "Today's Remnants Used",
      amount: (metrics.today_remnants_used_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Remnants fabric successfully utilized on the floor today",
      icon: Layers,
      color: "text-emerald-600 bg-emerald-500/10",
      statusText: "Remnants Used",
      statusColor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    },
    {
      id: "today-remnants-scrap",
      title: "Today's Remnants Scrap",
      amount: (metrics.today_remnants_scrap_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Waste or short roll-ends discarded as scrap from remnants today",
      icon: Scissors,
      color: "text-rose-600 bg-rose-500/10",
      statusText: "Remnant Scrap",
      statusColor: "bg-rose-500/15 text-rose-600 border-rose-500/20",
    },
    {
      id: "today-remnants-utilization",
      title: "Today's Remnants Utilization",
      amount: (metrics.today_remnants_utilization_percent || 0).toFixed(1),
      unit: "%",
      desc: "Percentage rate of remnants successfully used versus discarded today",
      icon: Percent,
      color: "text-indigo-600 bg-indigo-500/10",
      statusText: "Utilization",
      statusColor: "bg-indigo-500/15 text-indigo-600 border-indigo-500/20",
    },
    {
      id: "today-reject-qty",
      title: "Today's Reject Pieces",
      amount: (metrics.today_reject_qty || 0).toLocaleString(),
      unit: "Pcs",
      desc: "Defective panel pieces rejected on the floor today",
      icon: TriangleAlert,
      color: "text-amber-600 bg-amber-500/10",
      statusText: "Rejects Today",
      statusColor: "bg-amber-500/15 text-amber-600 border-amber-500/20",
    },
    // Overall / Monthly Remnants
    {
      id: "total-remnants-issued",
      title: "Cumulative Remnants Issued",
      amount: (metrics.total_remnants_issued || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Total remnants weight issued across approved lots",
      icon: Weight,
      color: "text-blue-600 bg-blue-500/10",
      statusText: "All-Time",
      statusColor: "bg-blue-500/15 text-blue-600 border-blue-500/20",
    },
    {
      id: "total-remnants-used",
      title: "Cumulative Remnants Used",
      amount: (metrics.total_remnants_used_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Total remnants weight successfully cut/utilized",
      icon: Layers,
      color: "text-emerald-600 bg-emerald-500/10",
      statusText: "Total Used",
      statusColor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    },
    {
      id: "total-remnants-scrap",
      title: "Cumulative Remnants Scrap",
      amount: (metrics.total_remnants_scrap_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Total remnants scrap / un-usable fragments discarded",
      icon: Scissors,
      color: "text-rose-600 bg-rose-500/10",
      statusText: "Total Scrap",
      statusColor: "bg-rose-500/15 text-rose-600 border-rose-500/20",
    },
    {
      id: "total-remnants-utilization",
      title: "Remnants Utilization Rate",
      amount: (metrics.remnants_utilization_percent || 0).toFixed(1),
      unit: "%",
      desc: "Overall percentage efficiency of remnant fabric utilization",
      icon: Percent,
      color: "text-indigo-600 bg-indigo-500/10",
      statusText: "Total Rate",
      statusColor: "bg-indigo-500/15 text-indigo-600 border-indigo-500/20",
    },
    {
      id: "total-reject-qty",
      title: "Total Reject Pieces",
      amount: (metrics.total_reject_qty || 0).toLocaleString(),
      unit: "Pcs",
      desc: "Cumulative count of panels or cut garments rejected for flaws",
      icon: TriangleAlert,
      color: "text-amber-600 bg-amber-500/10",
      statusText: "Total Rejects",
      statusColor: "bg-amber-500/15 text-amber-600 border-amber-500/20",
    },
    {
      id: "today-fabric-save-loss-pct",
      title: "Fabric Save/Loss %",
      amount: (metrics.today_fabric_save_loss_percent || 0) >= 0 
        ? "+" + (metrics.today_fabric_save_loss_percent || 0).toFixed(1)
        : (metrics.today_fabric_save_loss_percent || 0).toFixed(1),
      unit: "%",
      desc: "Today's percentage of fabric saved or lost vs booking consumption",
      icon: Percent,
      color: (metrics.today_fabric_save_loss_percent || 0) < 0 ? "text-rose-600 bg-rose-500/10" : "text-emerald-600 bg-emerald-500/10",
      statusText: (metrics.today_fabric_save_loss_percent || 0) < 0 ? "Loss" : "Save",
      statusColor: (metrics.today_fabric_save_loss_percent || 0) < 0 ? "bg-rose-500/15 text-rose-600 border-rose-500/20" : "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    },
    {
      id: "today-fabric-save-loss-kg",
      title: "Fabric Save/Loss (KG)",
      amount: (metrics.today_fabric_save_loss_kg || 0) >= 0 
        ? "+" + (metrics.today_fabric_save_loss_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : (metrics.today_fabric_save_loss_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Today's weight of fabric saved or lost vs booking consumption",
      icon: Weight,
      color: (metrics.today_fabric_save_loss_kg || 0) < 0 ? "text-rose-600 bg-rose-500/10" : "text-emerald-600 bg-emerald-500/10",
      statusText: (metrics.today_fabric_save_loss_kg || 0) < 0 ? "Loss" : "Save",
      statusColor: (metrics.today_fabric_save_loss_kg || 0) < 0 ? "bg-rose-500/15 text-rose-600 border-rose-500/20" : "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    },
    {
      id: "today-booking-vs-marker",
      title: "Booking vs Marker Consumption",
      amount: (metrics.today_booking_vs_marker || 0) >= 0
        ? "+" + (metrics.today_booking_vs_marker || 0).toFixed(3)
        : (metrics.today_booking_vs_marker || 0).toFixed(3),
      unit: "KG/Doz",
      desc: "Today's average difference between Booking Consumption and Marker Consumption",
      icon: Layers,
      color: (metrics.today_booking_vs_marker || 0) < 0 ? "text-rose-600 bg-rose-500/10" : "text-emerald-600 bg-emerald-500/10",
      statusText: (metrics.today_booking_vs_marker || 0) < 0 ? "Loss" : "Save",
      statusColor: (metrics.today_booking_vs_marker || 0) < 0 ? "bg-rose-500/15 text-rose-600 border-rose-500/20" : "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    },
    {
      id: "today-booking-vs-cut",
      title: "Booking vs Cut Consumption",
      amount: (metrics.today_booking_vs_cut || 0) >= 0
        ? "+" + (metrics.today_booking_vs_cut || 0).toFixed(3)
        : (metrics.today_booking_vs_cut || 0).toFixed(3),
      unit: "KG/Doz",
      desc: "Today's average difference between Booking Consumption and Cutting Consumption",
      icon: Scissors,
      color: (metrics.today_booking_vs_cut || 0) < 0 ? "text-rose-600 bg-rose-500/10" : "text-emerald-600 bg-emerald-500/10",
      statusText: (metrics.today_booking_vs_cut || 0) < 0 ? "Loss" : "Save",
      statusColor: (metrics.today_booking_vs_cut || 0) < 0 ? "bg-rose-500/15 text-rose-600 border-rose-500/20" : "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    }
  ];

  // Group filter logic
  const dailyKeys = [
    "today-output",
    "today-lay-layers",
    "today-ratio-combined",
    "today-fabric",
    "today-fabric-spread",
    "today-spreading-scrap",
    "today-cutting-scrap",
    "today-remnants-issued",
    "today-remnants-used",
    "today-remnants-scrap",
    "today-remnants-utilization",
    "today-reject-qty",
    "today-fabric-save-loss-pct",
    "today-fabric-save-loss-kg",
    "today-booking-vs-marker",
    "today-booking-vs-cut",
    "daily-trend",
    "daily-avg",
    "recent-quality"
  ];
  const dailyKpis = dailyKeys.map(key => kpis.find(k => k.id === key)).filter((k): k is typeof kpis[0] => !!k);

  const monthlyKpis = kpis.filter(kpi => 
    [
      "gross-fabric", "fabric-spread", "cutting-scrap", "cad-eff", "ete-eff", "eff-gap",
      "month-total", "total-lots", "total-layers", "total-qty", "total-used-inch",
      "total-fabric-save-loss-pct", "total-fabric-save-loss-kg",
      "total-remnants-issued", "total-remnants-used", "total-remnants-scrap",
      "total-remnants-utilization", "total-reject-qty"
    ].includes(kpi.id)
  );

  const renderCardGrid = (items: typeof kpis) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2k:grid-cols-5 gap-5">
      {items.map((kpi, idx) => {
        const Icon = kpi.icon;
        const containerClasses = kpi.highlight
          ? "bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/80 border-2 border-emerald-500/30 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 duration-300 relative overflow-hidden"
          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:-translate-y-0.5 duration-300 relative overflow-hidden";

        // Cast key to access secondary if present
        const kpiItem = kpi as typeof kpi & { secondary?: { title: string; amount: string; unit: string } };

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

            {kpiItem.secondary && (
              <div className="mt-3.5 pt-3.5 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {kpiItem.secondary.title}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono leading-none">
                    {kpiItem.secondary.amount}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
                    {kpiItem.secondary.unit}
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-3 leading-relaxed">
              {kpi.desc}
            </p>
          </div>
        );
      })}
    </div>
  );

  const renderTableGrid = (items: typeof kpis) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs text-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-505 border-b border-slate-200 dark:border-slate-800 font-extrabold uppercase tracking-wider text-[10px]">
              <th className="p-4 pl-5">Metric Name</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Value</th>
              <th className="p-4">Detailed Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-600 dark:text-slate-300 font-medium">
            {items.map((kpi) => {
              const Icon = kpi.icon;
              const kpiItem = kpi as typeof kpi & { secondary?: { title: string; amount: string; unit: string } };

              return (
                <tr key={kpi.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                  {/* Name + Icon */}
                  <td className="p-4 pl-5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${kpi.color} shrink-0`}>
                        <Icon size={16} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-850 dark:text-slate-100 text-xs">
                          {kpi.title}
                        </div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold font-mono">
                          ID: {kpi.id}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="p-4 text-center">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border tracking-wider inline-block ${kpi.statusColor}`}>
                      {kpi.statusText}
                    </span>
                  </td>

                  {/* Value */}
                  <td className="p-4 text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                          {kpi.amount}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase">
                          {kpi.unit}
                        </span>
                      </div>
                      {kpiItem.secondary && (
                        <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 uppercase tracking-wide">
                          {kpiItem.secondary.title}: {kpiItem.secondary.amount} {kpiItem.secondary.unit}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Description */}
                  <td className="p-4 text-slate-500 dark:text-slate-400 leading-relaxed font-sans max-w-xs md:max-w-md xl:max-w-xl truncate hover:text-clip hover:whitespace-normal transition-all duration-300">
                    {kpi.desc}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (group === "daily") {
    const handlePrevDay = () => {
      if (!availableDates || availableDates.length === 0 || !selectedDate || !setSelectedDate) return;
      const currentIndex = availableDates.indexOf(selectedDate);
      if (currentIndex !== -1 && currentIndex < availableDates.length - 1) {
        setSelectedDate(availableDates[currentIndex + 1]);
      } else {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        const prevDateStr = d.toISOString().split("T")[0];
        setSelectedDate(prevDateStr);
      }
    };

    const handleNextDay = () => {
      if (!availableDates || availableDates.length === 0 || !selectedDate || !setSelectedDate) return;
      const currentIndex = availableDates.indexOf(selectedDate);
      if (currentIndex > 0) {
        setSelectedDate(availableDates[currentIndex - 1]);
      } else {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        const nextDateStr = d.toISOString().split("T")[0];
        setSelectedDate(nextDateStr);
      }
    };

    return (
      <div className="space-y-4 font-sans animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Daily Shifts, Trends & Quality KPIs
            </h3>
            {selectedDate && setSelectedDate && (
              <div className="flex items-center gap-1.5 print:hidden bg-slate-50 dark:bg-slate-950/50 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/60 h-9">
                <button
                  onClick={handlePrevDay}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer text-slate-600 dark:text-slate-400 flex items-center justify-center w-7 h-7"
                  title="Previous Logged Date"
                >
                  <ChevronLeft size={14} className="stroke-[2.5]" />
                </button>
                
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs text-slate-900 dark:text-slate-200 font-bold focus:outline-none cursor-pointer px-1 w-28 text-center"
                />

                <button
                  onClick={handleNextDay}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer text-slate-600 dark:text-slate-400 flex items-center justify-center w-7 h-7"
                  title="Next Logged Date"
                >
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </button>
              </div>
            )}
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/60 self-start sm:self-auto">
            <button
              onClick={() => setViewMode("card")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "card"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <LayoutGrid size={13} />
              <span>Card View</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Table size={13} />
              <span>Table View</span>
            </button>
          </div>
        </div>
        {viewMode === "card" ? renderCardGrid(dailyKpis) : renderTableGrid(dailyKpis)}
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
            {renderCardGrid(monthlyKpis.filter(kpi => ["month-total", "total-lots", "total-layers", "total-used-inch", "total-fabric-save-loss-pct", "total-fabric-save-loss-kg"].includes(kpi.id)))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
            <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Cumulative Remnants Analytics & Quality Rejects
            </h3>
          </div>
          <div className="mt-4">
            {renderCardGrid(monthlyKpis.filter(kpi => ["total-remnants-issued", "total-remnants-used", "total-remnants-scrap", "total-remnants-utilization", "total-reject-qty"].includes(kpi.id)))}
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
