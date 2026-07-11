import React, { useState, useMemo } from "react";
import { CustomDatePicker } from "./common/DatePicker";
import { formatDate } from "../utils/dateUtils";
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
  ChevronRight,
  Coins,
  Activity,
  ArrowRightLeft
} from "lucide-react";
import { PolyEntry, CuttingEntry } from "../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from "recharts";

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
    // Datewise KPIs
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
    // Cumulative/Overall KPIs
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
  polyEntries?: PolyEntry[];
  polyPrice?: number;
  entries?: CuttingEntry[];
}

export default function KPICards({ 
  metrics, 
  group = "all", 
  selectedDate, 
  setSelectedDate, 
  availableDates,
  polyEntries = [],
  polyPrice = 1.50,
  entries = []
}: KPICardsProps) {
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [activeCategory, setActiveCategory] = useState<"fabric" | "efficiency" | "volume">("fabric");

  // Poly Tracking Stats calculation
  const polyStats = useMemo(() => {
    if (!polyEntries || polyEntries.length === 0) {
      return {
        dailyReceived: 0,
        dailyReused: 0,
        dailyEfficiency: 0,
        dailySaved: 0,
        cumulativeReceived: 0,
        cumulativeReused: 0,
        cumulativeEfficiency: 0,
        cumulativeSaved: 0
      };
    }

    // Daily
    const todayPoly = polyEntries.find(e => e.entry_date === selectedDate);
    const dailyReceived = todayPoly ? (Number(todayPoly.total_received_poly) || 0) : 0;
    const dailyReused = todayPoly ? (Number(todayPoly.total_reused_poly) || 0) : 0;
    const dailyEfficiency = dailyReceived > 0 ? (dailyReused / dailyReceived) * 100 : 0;
    const todayPriceVal = todayPoly && todayPoly.price !== undefined ? Number(todayPoly.price) : polyPrice;
    const dailySaved = todayPoly ? (todayPoly.save !== undefined ? Number(todayPoly.save) : (dailyReused * todayPriceVal)) : 0;

    // Cumulative
    let cumulativeReceived = 0;
    let cumulativeReused = 0;
    let cumulativeSaved = 0;

    polyEntries.forEach(entry => {
      const rec = Number(entry.total_received_poly) || 0;
      const reu = Number(entry.total_reused_poly) || 0;
      const prc = entry.price !== undefined ? Number(entry.price) : polyPrice;
      cumulativeReceived += rec;
      cumulativeReused += reu;
      cumulativeSaved += entry.save !== undefined ? Number(entry.save) : (reu * prc);
    });

    const cumulativeEfficiency = cumulativeReceived > 0 ? (cumulativeReused / cumulativeReceived) * 100 : 0;

    return {
      dailyReceived,
      dailyReused,
      dailyEfficiency,
      dailySaved,
      cumulativeReceived,
      cumulativeReused,
      cumulativeEfficiency,
      cumulativeSaved
    };
  }, [polyEntries, selectedDate, polyPrice]);

  // Unified list of all calculated KPIs
  const kpis = useMemo(() => [
    {
      id: "gross-fabric",
      title: "Gross Fabric Weight",
      amount: metrics.total_fabric_used.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Total weight of fabric rolls issued to the tables",
      icon: Weight,
      color: "text-[#3B82F6] bg-[#3B82F6]/10",
      statusText: "Operational",
      statusColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    {
      id: "fabric-spread",
      title: "Total Fabric Spread",
      amount: metrics.total_fabric_spread.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Fabric laid after subtracting remnant / short-roll waste",
      icon: Layers,
      color: "text-indigo-400 bg-indigo-500/10",
      statusText: "Standard",
      statusColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      id: "cutting-scrap",
      title: "Total Cutting Scrap",
      amount: metrics.total_cutting_scrap.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Direct physical scissor scrap collected from cutting tables",
      icon: Scissors,
      color: "text-[#EF4444] bg-[#EF4444]/10",
      statusText: "Scrap Margin",
      statusColor: metrics.total_cutting_scrap > 50 ? "bg-rose-500/15 text-rose-400 border-rose-500/20" : "bg-slate-500/15 text-slate-400 border-slate-500/20",
    },
    {
      id: "cad-eff",
      title: "Marker CAD Efficiency",
      amount: metrics.avg_maker_efficiency_provided.toFixed(1),
      unit: "%",
      desc: "Target CAD layout efficiency (Provided by pattern dept)",
      icon: Cpu,
      color: "text-amber-400 bg-amber-500/10",
      statusText: "Optimized",
      statusColor: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    },
    {
      id: "ete-eff",
      title: "Actual Physical ETE Efficiency",
      amount: metrics.avg_ete_efficiency.toFixed(1),
      unit: "%",
      desc: "End-to-end efficiency calculated from finished physical panel weights",
      icon: Percent,
      color: "text-[#10B981] bg-[#10B981]/10",
      statusText: "Compliant",
      statusColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
      highlight: true,
    },
    {
      id: "eff-gap",
      title: "Efficiency Gap",
      amount: metrics.efficiency_gap.toFixed(1),
      unit: "%",
      desc: "Deviation between theoretical CAD and physical cutting floor efficiency",
      icon: TriangleAlert,
      color: metrics.efficiency_gap > 8 ? "text-[#EF4444] bg-[#EF4444]/10" : "text-[#F59E0B] bg-[#F59E0B]/10",
      statusText: metrics.efficiency_gap > 8 ? "Review Required" : "Stable",
      statusColor: metrics.efficiency_gap > 8 ? "bg-red-500/15 text-red-400 border-red-500/20" : "bg-slate-500/15 text-slate-400 border-slate-500/20",
    },
    {
      id: "today-output",
      title: "Today's Output",
      amount: (metrics.today_cut_qty || 0).toLocaleString(),
      unit: "Pcs",
      desc: "Planned garment parts cut on the latest active date",
      icon: Package,
      color: "text-violet-400 bg-violet-500/10",
      statusText: "Active Run",
      statusColor: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    },
    {
      id: "today-fabric",
      title: "Today's Gross Fabric Weight",
      amount: (metrics.today_fabric_used || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Fabric rolls laid for cutting on the latest active date",
      icon: Weight,
      color: "text-cyan-400 bg-cyan-500/10",
      statusText: "Daily Log",
      statusColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    },
    {
      id: "daily-trend",
      title: "Daily Output Trend",
      amount: metrics.daily_trend_percent !== undefined ? (metrics.daily_trend_percent >= 0 ? "+" : "") + metrics.daily_trend_percent.toFixed(1) : "0.0",
      unit: "%",
      desc: "Comparison of planned parts cut between today vs yesterday",
      icon: metrics.daily_trend_percent !== undefined && metrics.daily_trend_percent >= 0 ? TrendingUp : TrendingDown,
      color: metrics.daily_trend_percent !== undefined && metrics.daily_trend_percent >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10",
      statusText: metrics.daily_trend_percent !== undefined && metrics.daily_trend_percent >= 0 ? "Increasing" : "Decreasing",
      statusColor: metrics.daily_trend_percent !== undefined && metrics.daily_trend_percent >= 0 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-rose-500/15 text-rose-400 border-rose-500/20",
    },
    {
      id: "daily-avg",
      title: "Daily Average Cut",
      amount: (metrics.daily_avg_cut_qty || 0).toLocaleString(),
      unit: "Pcs/Day",
      desc: "Average daily parts cut across active logged history",
      icon: Clock,
      color: "text-teal-400 bg-teal-500/10",
      statusText: "Historic Avg",
      statusColor: "bg-teal-500/15 text-teal-400 border-teal-500/20",
    },
    {
      id: "month-total",
      title: "Monthly Total Cut",
      amount: (metrics.month_cut_qty || 0).toLocaleString(),
      unit: "Pcs",
      desc: "Cumulative planned parts cut in the current active month",
      icon: Calendar,
      color: "text-pink-400 bg-pink-500/10",
      statusText: "Monthly Run",
      statusColor: "bg-pink-500/15 text-pink-400 border-pink-500/20",
    },
    {
      id: "recent-quality",
      title: "Recent 7-Day Quality",
      amount: (metrics.recent_ete_efficiency || 0).toFixed(1),
      unit: "%",
      desc: "Moving average ETE physical efficiency of the last 7 active dates",
      icon: Zap,
      color: "text-emerald-400 bg-emerald-500/10",
      statusText: (metrics.recent_ete_efficiency || 0) > 85 ? "High Yield" : "Standard",
      statusColor: (metrics.recent_ete_efficiency || 0) > 85 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-amber-500/15 text-amber-400 border-amber-500/20",
    },
    {
      id: "size-ratio",
      title: "Average Size Ratio",
      amount: (metrics.avg_size_ratio || 0).toFixed(1),
      unit: "Ratio",
      desc: `Mean size ratio per lot. Latest day's average ratio is ${metrics.today_avg_size_ratio || 0}`,
      icon: Hash,
      color: "text-indigo-400 bg-indigo-500/10",
      statusText: "Size Ratio",
      statusColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    },
    {
      id: "total-lots",
      title: "Total Lots (Cuts)",
      amount: (metrics.total_cutting_lots || 0).toLocaleString(),
      unit: "Cuts",
      desc: `Total lots cut. Weight: ${(metrics.total_fabric_used || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} KG`,
      icon: Scissors,
      color: "text-blue-400 bg-blue-500/10",
      statusText: "All-Time Lots",
      statusColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      id: "total-layers",
      title: "Total Layers Laid",
      amount: (metrics.total_lay_layers || 0).toLocaleString(),
      unit: "Layers",
      desc: `Avg layers: ${Math.round((metrics.total_lay_layers || 0) / (metrics.total_cutting_lots || 1))} per lot`,
      icon: Layers,
      color: "text-emerald-400 bg-emerald-500/10",
      statusText: "Cumulative Layers",
      statusColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    {
      id: "total-qty",
      title: "Total Cut Quantity",
      amount: (metrics.total_cutting_qty || 0).toLocaleString(),
      unit: "Pcs",
      desc: "Cumulative sum of cut garments (Ratio × Lay) across approved lots",
      icon: Hash,
      color: "text-indigo-400 bg-indigo-500/10",
      statusText: "Total Yield",
      statusColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    },
    {
      id: "total-used-inch",
      title: "Total Marker Inches Used",
      amount: (metrics.total_used_fabric_inch || 0).toLocaleString(undefined, { maximumFractionDigits: 1 }),
      unit: "In.",
      desc: "Effective cut inches processed across approved CAD patterns",
      icon: Cpu,
      color: "text-pink-400 bg-pink-500/10",
      statusText: "CAD Metric",
      statusColor: "bg-pink-500/15 text-pink-400 border-pink-500/20",
    },
    {
      id: "today-lay-layers",
      title: "Today's Lay Layers",
      amount: (metrics.today_lay_layers || 0).toLocaleString(),
      unit: "Layers",
      desc: "Total layers laid for cutting on the latest active date",
      icon: Layers,
      color: "text-blue-400 bg-blue-500/10",
      statusText: "Daily Layers",
      statusColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      id: "today-ratio-combined",
      title: "Today's Size Ratios",
      amount: (metrics.today_total_ratio || 0).toFixed(1),
      unit: "Total",
      desc: "Combined view of today's sum of size ratios and mean size ratio",
      icon: Hash,
      color: "text-violet-400 bg-violet-500/10",
      statusText: "Ratio Stats",
      statusColor: "bg-violet-500/15 text-violet-400 border-violet-500/20",
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
      color: "text-indigo-400 bg-indigo-500/10",
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
      color: "text-rose-400 bg-rose-500/10",
      statusText: "Spreading Scrap",
      statusColor: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    },
    {
      id: "today-cutting-scrap",
      title: "Today's Cutting Scrap",
      amount: (metrics.today_cutting_scrap || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Direct physical cutting scrap collected from today's cuts",
      icon: Scissors,
      color: "text-rose-400 bg-rose-500/10",
      statusText: "Cutting Scrap",
      statusColor: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    },
    {
      id: "today-remnants-issued",
      title: "Today's Remnants Issued",
      amount: (metrics.today_remnants_issued || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Total remnant weight returned or re-entered today",
      icon: Weight,
      color: "text-blue-400 bg-blue-500/10",
      statusText: "Issued Remnants",
      statusColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      id: "today-remnants-used",
      title: "Today's Remnants Used",
      amount: (metrics.today_remnants_used_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Remnant fabric successfully utilized on the cutting floor today",
      icon: Layers,
      color: "text-emerald-400 bg-emerald-500/10",
      statusText: "Remnants Used",
      statusColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    {
      id: "today-remnants-scrap",
      title: "Today's Remnants Scrap",
      amount: (metrics.today_remnants_scrap_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Waste or short roll-ends discarded as scrap from remnants today",
      icon: Scissors,
      color: "text-rose-400 bg-rose-500/10",
      statusText: "Remnant Scrap",
      statusColor: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    },
    {
      id: "today-remnants-utilization",
      title: "Remnant Utilization Today",
      amount: (metrics.today_remnants_utilization_percent || 0).toFixed(1),
      unit: "%",
      desc: "Percentage of remnants successfully used versus discarded today",
      icon: Percent,
      color: "text-indigo-400 bg-indigo-500/10",
      statusText: "Utilization Rate",
      statusColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    },
    {
      id: "today-reject-qty",
      title: "Today's Reject Pieces",
      amount: (metrics.today_reject_qty || 0).toLocaleString(),
      unit: "Pcs",
      desc: "Defective panel pieces rejected on the floor today",
      icon: TriangleAlert,
      color: "text-amber-400 bg-amber-500/10",
      statusText: "Rejects Today",
      statusColor: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    },
    {
      id: "total-remnants-issued",
      title: "Cumulative Remnants Issued",
      amount: (metrics.total_remnants_issued || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Total remnants weight issued across approved lots",
      icon: Weight,
      color: "text-blue-400 bg-blue-500/10",
      statusText: "All-Time Issued",
      statusColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      id: "total-remnants-used",
      title: "Cumulative Remnants Used",
      amount: (metrics.total_remnants_used_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Total remnants weight successfully cut/utilized",
      icon: Layers,
      color: "text-emerald-400 bg-emerald-500/10",
      statusText: "Cumulative Used",
      statusColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    {
      id: "total-remnants-scrap",
      title: "Cumulative Remnants Scrap",
      amount: (metrics.total_remnants_scrap_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Total remnants scrap / unusable fragments discarded",
      icon: Scissors,
      color: "text-rose-400 bg-rose-500/10",
      statusText: "Total Scrap",
      statusColor: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    },
    {
      id: "total-remnants-utilization",
      title: "Remnants Utilization Rate",
      amount: (metrics.remnants_utilization_percent || 0).toFixed(1),
      unit: "%",
      desc: "Overall percentage efficiency of remnant fabric utilization",
      icon: Percent,
      color: "text-indigo-400 bg-indigo-500/10",
      statusText: "Total Rate",
      statusColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    },
    {
      id: "total-reject-qty",
      title: "Total Reject Pieces",
      amount: (metrics.total_reject_qty || 0).toLocaleString(),
      unit: "Pcs",
      desc: "Cumulative count of panels or cut garments rejected for flaws",
      icon: TriangleAlert,
      color: "text-amber-400 bg-amber-500/10",
      statusText: "Total Rejects",
      statusColor: "bg-amber-500/15 text-amber-400 border-amber-500/20",
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
      color: (metrics.today_fabric_save_loss_percent || 0) < 0 ? "text-rose-400 bg-rose-500/10" : "text-emerald-400 bg-emerald-500/10",
      statusText: (metrics.today_fabric_save_loss_percent || 0) < 0 ? "Loss" : "Save",
      statusColor: (metrics.today_fabric_save_loss_percent || 0) < 0 ? "bg-rose-500/15 text-rose-400 border-rose-500/20" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
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
      color: (metrics.today_fabric_save_loss_kg || 0) < 0 ? "text-rose-400 bg-rose-500/10" : "text-emerald-400 bg-emerald-500/10",
      statusText: (metrics.today_fabric_save_loss_kg || 0) < 0 ? "Loss" : "Save",
      statusColor: (metrics.today_fabric_save_loss_kg || 0) < 0 ? "bg-rose-500/15 text-rose-400 border-rose-500/20" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    {
      id: "today-booking-vs-marker",
      title: "Booking vs Marker Deviation",
      amount: (metrics.today_booking_vs_marker || 0) >= 0
        ? "+" + (metrics.today_booking_vs_marker || 0).toFixed(3)
        : (metrics.today_booking_vs_marker || 0).toFixed(3),
      unit: "KG/Doz",
      desc: "Today's average difference between booking consumption and marker layout consumption",
      icon: Layers,
      color: (metrics.today_booking_vs_marker || 0) < 0 ? "text-rose-400 bg-rose-500/10" : "text-emerald-400 bg-emerald-500/10",
      statusText: (metrics.today_booking_vs_marker || 0) < 0 ? "Loss" : "Save",
      statusColor: (metrics.today_booking_vs_marker || 0) < 0 ? "bg-rose-500/15 text-rose-400 border-rose-500/20" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    {
      id: "today-booking-vs-cut",
      title: "Booking vs Cut Deviation",
      amount: (metrics.today_booking_vs_cut || 0) >= 0
        ? "+" + (metrics.today_booking_vs_cut || 0).toFixed(3)
        : (metrics.today_booking_vs_cut || 0).toFixed(3),
      unit: "KG/Doz",
      desc: "Today's average difference between booking consumption and real floor cut consumption",
      icon: Scissors,
      color: (metrics.today_booking_vs_cut || 0) < 0 ? "text-rose-400 bg-rose-500/10" : "text-emerald-400 bg-emerald-500/10",
      statusText: (metrics.today_booking_vs_cut || 0) < 0 ? "Loss" : "Save",
      statusColor: (metrics.today_booking_vs_cut || 0) < 0 ? "bg-rose-500/15 text-rose-400 border-rose-500/20" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    {
      id: "total-fabric-save-loss-pct",
      title: "Fabric Save/Loss %",
      amount: (metrics.total_fabric_save_loss_percent || 0) >= 0 
        ? "+" + (metrics.total_fabric_save_loss_percent || 0).toFixed(1)
        : (metrics.total_fabric_save_loss_percent || 0).toFixed(1),
      unit: "%",
      desc: "Overall percentage of fabric saved or lost vs booking consumption across all entries",
      icon: Percent,
      color: (metrics.total_fabric_save_loss_percent || 0) < 0 ? "text-rose-400 bg-rose-500/10" : "text-emerald-400 bg-emerald-500/10",
      statusText: (metrics.total_fabric_save_loss_percent || 0) < 0 ? "Cumulative Loss" : "Cumulative Save",
      statusColor: (metrics.total_fabric_save_loss_percent || 0) < 0 ? "bg-rose-500/15 text-rose-400 border-rose-500/20" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    {
      id: "total-fabric-save-loss-kg",
      title: "Fabric Save/Loss (KG)",
      amount: (metrics.total_fabric_save_loss_kg || 0) >= 0 
        ? "+" + (metrics.total_fabric_save_loss_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : (metrics.total_fabric_save_loss_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Overall weight of fabric saved or lost vs booking consumption",
      icon: Weight,
      color: (metrics.total_fabric_save_loss_kg || 0) < 0 ? "text-rose-400 bg-rose-500/10" : "text-emerald-400 bg-emerald-500/10",
      statusText: (metrics.total_fabric_save_loss_kg || 0) < 0 ? "Cumulative Loss" : "Cumulative Save",
      statusColor: (metrics.total_fabric_save_loss_kg || 0) < 0 ? "bg-rose-500/15 text-rose-400 border-rose-500/20" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    {
      id: "poly-summary",
      title: group === "daily" ? "Today's Poly Re-Use" : "Cumulative Poly Re-Use",
      amount: group === "daily" 
        ? "৳" + polyStats.dailySaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "৳" + polyStats.cumulativeSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      unit: "Saved",
      desc: group === "daily"
        ? `Price: ৳${polyPrice.toFixed(2)}/bag. Received: ${polyStats.dailyReceived} | Re-Used: ${polyStats.dailyReused}`
        : `Price: ৳${polyPrice.toFixed(2)}/bag. Total Received: ${polyStats.cumulativeReceived} | Re-Used: ${polyStats.cumulativeReused}`,
      icon: Coins,
      color: "text-emerald-400 bg-emerald-500/10",
      statusText: group === "daily" 
        ? `${polyStats.dailyEfficiency.toFixed(1)}% Eff`
        : `${polyStats.cumulativeEfficiency.toFixed(1)}% Eff`,
      statusColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
      highlight: true
    }
  ], [metrics, group, polyStats, polyPrice]);

  // ---------------------------------------------
  // HERO KPIs SELECTION (At the top of the view)
  // ---------------------------------------------
  const heroKpis = useMemo(() => {
    if (group === "daily") {
      return [
        {
          title: "Today's Output Volume",
          amount: (metrics.today_cut_qty || 0).toLocaleString(),
          unit: "Pcs",
          desc: "Total planned garment parts cut today",
          icon: Package,
          trend: metrics.daily_trend_percent !== undefined ? {
            value: (metrics.daily_trend_percent >= 0 ? "+" : "") + metrics.daily_trend_percent.toFixed(1) + "%",
            positive: metrics.daily_trend_percent >= 0
          } : undefined
        },
        {
          title: "Today's Fabric Used",
          amount: (metrics.today_fabric_used || 0).toLocaleString(undefined, { maximumFractionDigits: 1 }),
          unit: "KG",
          desc: "Gross fabric weight laid today",
          icon: Weight
        },
        {
          title: "Today's Cutting Scrap",
          amount: (metrics.today_cutting_scrap || 0).toLocaleString(undefined, { maximumFractionDigits: 1 }),
          unit: "KG",
          desc: "Physical waste collected from cuts today",
          icon: Scissors,
          scrapPct: metrics.today_fabric_used && metrics.today_fabric_used > 0 
            ? ((metrics.today_cutting_scrap || 0) / metrics.today_fabric_used * 100).toFixed(1) + "% Rate"
            : undefined
        },
        {
          title: "7-Day Quality ETE",
          amount: (metrics.recent_ete_efficiency || 0).toFixed(1),
          unit: "%",
          desc: "7-day moving physical efficiency average",
          icon: Zap
        },
        {
          title: "Today's Save/Loss",
          amount: (metrics.today_fabric_save_loss_kg || 0) >= 0 
            ? "+" + (metrics.today_fabric_save_loss_kg || 0).toFixed(1)
            : (metrics.today_fabric_save_loss_kg || 0).toFixed(1),
          unit: "KG",
          desc: "Fabric variance vs booking consumption today",
          icon: Coins,
          trend: {
            value: ((metrics.today_fabric_save_loss_percent || 0) >= 0 ? "+" : "") + (metrics.today_fabric_save_loss_percent || 0).toFixed(1) + "%",
            positive: (metrics.today_fabric_save_loss_percent || 0) >= 0
          }
        }
      ];
    } else {
      // Monthly/Cumulative View
      return [
        {
          title: "MTD Production Volume",
          amount: (metrics.month_cut_qty || 0).toLocaleString(),
          unit: "Pcs",
          desc: "Cumulative planned cut quantity for current month",
          icon: Calendar
        },
        {
          title: "Overall Fabric Used",
          amount: metrics.total_fabric_used.toLocaleString(undefined, { maximumFractionDigits: 1 }),
          unit: "KG",
          desc: "Gross weight of fabric processed",
          icon: Weight
        },
        {
          title: "Total Cutting Scrap",
          amount: metrics.total_cutting_scrap.toLocaleString(undefined, { maximumFractionDigits: 1 }),
          unit: "KG",
          desc: "Cumulative scrap weight collected",
          icon: Scissors
        },
        {
          title: "Average CAD Efficiency",
          amount: metrics.avg_maker_efficiency_provided.toFixed(1),
          unit: "%",
          desc: "Mean theoretical marker layout efficiency",
          icon: Cpu
        },
        {
          title: "Cumulative Save/Loss",
          amount: (metrics.total_fabric_save_loss_kg || 0) >= 0 
            ? "+" + (metrics.total_fabric_save_loss_kg || 0).toFixed(1)
            : (metrics.total_fabric_save_loss_kg || 0).toFixed(1),
          unit: "KG",
          desc: "Cumulative booking save/loss variance",
          icon: Coins,
          trend: {
            value: ((metrics.total_fabric_save_loss_percent || 0) >= 0 ? "+" : "") + (metrics.total_fabric_save_loss_percent || 0).toFixed(1) + "%",
            positive: (metrics.total_fabric_save_loss_percent || 0) >= 0
          }
        }
      ];
    }
  }, [metrics, group]);

  // ---------------------------------------------
  // CATEGORIZATION MAP
  // ---------------------------------------------
  const categoryKpiKeys = useMemo(() => {
    if (group === "daily") {
      return {
        fabric: ["today-fabric", "today-fabric-spread", "today-cutting-scrap", "today-spreading-scrap", "today-remnants-utilization", "today-remnants-issued", "today-remnants-used", "today-remnants-scrap"],
        efficiency: ["cad-eff", "recent-quality", "eff-gap", "poly-summary"],
        volume: ["today-output", "today-lay-layers", "today-ratio-combined", "daily-avg", "today-reject-qty", "today-fabric-save-loss-pct", "today-fabric-save-loss-kg", "today-booking-vs-marker", "today-booking-vs-cut"]
      };
    } else {
      return {
        fabric: ["gross-fabric", "fabric-spread", "cutting-scrap", "total-remnants-utilization", "total-remnants-issued", "total-remnants-used", "total-remnants-scrap"],
        efficiency: ["cad-eff", "ete-eff", "eff-gap", "poly-summary"],
        volume: ["month-total", "total-lots", "total-layers", "total-qty", "total-used-inch", "size-ratio", "total-reject-qty", "total-fabric-save-loss-pct", "total-fabric-save-loss-kg"]
      };
    }
  }, [group]);

  const activeCategoryKpis = useMemo(() => {
    const keys = categoryKpiKeys[activeCategory];
    return keys.map(key => kpis.find(k => k.id === key)).filter((k): k is typeof kpis[0] => !!k);
  }, [kpis, activeCategory, categoryKpiKeys]);

  // ---------------------------------------------
  // CHART AGGREGATIONS (Client-Side, Fast, Robust)
  // ---------------------------------------------
  const chartData = useMemo(() => {
    if (!entries || entries.length === 0) return { waste: [], efficiency: [], volume: [] };
    
    // Process only approved or submitted entries
    const target = entries.filter(e => e.status === "approved" || e.status === "submitted");
    const grouped: { [date: string]: { date: string; fabricSum: number; scrapSum: number; cadSum: number; eteSum: number; count: number; volumeSum: number; saveSum: number } } = {};
    
    target.forEach(e => {
      const d = e.entry_date;
      if (!grouped[d]) {
        grouped[d] = { date: d, fabricSum: 0, scrapSum: 0, cadSum: 0, eteSum: 0, count: 0, volumeSum: 0, saveSum: 0 };
      }
      
      const fabric = Number(e.fabric_used_kg) || 0;
      grouped[d].fabricSum += fabric;
      grouped[d].scrapSum += (Number(e.cutting_scrap_weight_kg) || 0) + (Number(e.remnant_weight_kg) || 0);
      
      grouped[d].cadSum += Number(e.marker_efficiency_percent) || 0;
      grouped[d].eteSum += Number(e.actual_physical_marker_efficiency_ete) || 0;
      grouped[d].count++;
      
      const vol = (Number(e.lay) || 0) * (Number(e.ratio) || 0);
      grouped[d].volumeSum += vol;
      
      // Calculate individual Save/Loss
      const bookingCons = (e.booking_consumption !== undefined && e.booking_consumption !== null) ? Number(e.booking_consumption) : null;
      const cuttingCons = vol > 0 ? (fabric / vol) * 12 : null;
      const bookingVsCut = (bookingCons !== null && cuttingCons !== null) ? (bookingCons - cuttingCons) : null;
      const savePct = (bookingCons && bookingVsCut !== null) ? (bookingVsCut / bookingCons) * 100 : null;
      const saveKg = (savePct !== null && fabric) ? fabric * (savePct / 100) : null;
      
      if (saveKg !== null) {
        grouped[d].saveSum += saveKg;
      }
    });

    const list = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
    const last7 = list.slice(-7);

    return {
      waste: last7.map(g => ({
        date: formatDate(g.date),
        "Fabric Weight": parseFloat(g.fabricSum.toFixed(1)),
        "Scrap Weight": parseFloat(g.scrapSum.toFixed(1))
      })),
      efficiency: last7.map(g => ({
        date: formatDate(g.date),
        "CAD Target %": parseFloat((g.cadSum / g.count).toFixed(1)),
        "ETE Actual %": parseFloat((g.eteSum / g.count).toFixed(1))
      })),
      volume: last7.map(g => ({
        date: formatDate(g.date),
        "Cuts Volume (Pcs)": g.volumeSum,
        "Save/Loss (KG)": parseFloat(g.saveSum.toFixed(1))
      }))
    };
  }, [entries]);

  // Handle day toggles
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
    <div className="space-y-6 font-sans">
      
      {/* ---------------------------------------------
          HEADER & INTERACTIVE ACTIONS
          --------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {group === "daily" ? "Daily Operations Dashboard" : "Cumulative Operations Dashboard"}
          </h3>
          {group === "daily" && selectedDate && setSelectedDate && (
            <div className="flex items-center gap-1.5 print:hidden bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-850 h-9 shadow-2xs">
              <button
                onClick={handlePrevDay}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer text-slate-600 dark:text-slate-400 flex items-center justify-center w-7 h-7"
                title="Previous Logged Date"
              >
                <ChevronLeft size={14} className="stroke-[2.5]" />
              </button>
              
              <div className="w-28 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                <CustomDatePicker 
                  selectedDate={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  className="!bg-transparent !border-none !shadow-none !px-0 cursor-pointer"
                />
              </div>

              <button
                onClick={handleNextDay}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer text-slate-600 dark:text-slate-400 flex items-center justify-center w-7 h-7"
                title="Next Logged Date"
              >
                <ChevronRight size={14} className="stroke-[2.5]" />
              </button>
            </div>
          )}
        </div>

        {/* View Toggle (Card vs Table) */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-850 self-start sm:self-auto shadow-2xs">
          <button
            onClick={() => setViewMode("card")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === "card"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-400"
            }`}
          >
            <LayoutGrid size={13} />
            <span>Card Bento</span>
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === "table"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-400"
            }`}
          >
            <Table size={13} />
            <span>Table Ledger</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------
          1. HIGH-IMPACT HERO KPIs SECTION
          --------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {heroKpis.map((hero, idx) => {
          const Icon = hero.icon;
          return (
            <div 
              key={idx} 
              className="bg-slate-900 dark:bg-[#0f172a] text-white border border-slate-800/90 rounded-2xl p-5 shadow-sm hover:scale-[1.01] transition-transform duration-200 flex flex-col justify-between"
              id={`hero-card-${idx}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {hero.title}
                </span>
                <div className="p-2 rounded-lg bg-slate-800 text-indigo-400">
                  <Icon size={16} />
                </div>
              </div>
              
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
                  {hero.amount}
                </span>
                <span className="text-xs font-extrabold text-slate-400 uppercase">
                  {hero.unit}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate max-w-[120px]">{hero.desc}</span>
                {hero.trend && (
                  <span className={`font-mono font-bold px-1.5 py-0.5 rounded-sm ${hero.trend.positive ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                    {hero.trend.value}
                  </span>
                )}
                {hero.scrapPct && (
                  <span className="font-mono font-bold px-1.5 py-0.5 rounded-sm bg-rose-500/15 text-rose-400">
                    {hero.scrapPct}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------------------------------------
          2. THE REDESIGNED CATEGORIZED AREA
          --------------------------------------------- */}
      <div className="space-y-4">
        {/* Modern Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1.5">
          <button
            onClick={() => setActiveCategory("fabric")}
            className={`px-4 py-2.5 font-extrabold text-xs tracking-wider uppercase transition border-b-2 cursor-pointer flex items-center gap-2 ${
              activeCategory === "fabric"
                ? "border-amber-500 text-slate-900 dark:text-white"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <span>🧵</span>
            <span>Fabric & Waste</span>
          </button>
          
          <button
            onClick={() => setActiveCategory("efficiency")}
            className={`px-4 py-2.5 font-extrabold text-xs tracking-wider uppercase transition border-b-2 cursor-pointer flex items-center gap-2 ${
              activeCategory === "efficiency"
                ? "border-indigo-500 text-slate-900 dark:text-white"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <span>📐</span>
            <span>CAD & Efficiency</span>
          </button>

          <button
            onClick={() => setActiveCategory("volume")}
            className={`px-4 py-2.5 font-extrabold text-xs tracking-wider uppercase transition border-b-2 cursor-pointer flex items-center gap-2 ${
              activeCategory === "volume"
                ? "border-violet-500 text-slate-900 dark:text-white"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <span>📊</span>
            <span>Volume & Save/Loss</span>
          </button>
        </div>

        {/* ---------------------------------------------
            BENTO GRID LAYOUT OR PROFESSIONAL TABLE VIEW
            --------------------------------------------- */}
        {viewMode === "card" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* LEFT SIDE: IN-CATEGORY KPI CARDS */}
            <div className={`${activeCategory === "efficiency" ? "lg:col-span-7 grid-cols-1 sm:grid-cols-2" : "lg:col-span-12 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"} grid gap-4`}>
              {activeCategoryKpis.map((kpi) => {
                const Icon = kpi.icon;
                const containerClasses = kpi.highlight
                  ? "bg-slate-900 dark:bg-[#0f172a] text-white border-2 border-emerald-500/40 p-5 rounded-2xl shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between"
                  : "bg-slate-900 dark:bg-[#0f172a] text-white border border-slate-800 p-5 rounded-2xl shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between";

                const kpiItem = kpi as typeof kpi & { secondary?: { title: string; amount: string; unit: string } };

                return (
                  <div key={kpi.id} className={containerClasses} id={`kpi-card-${kpi.id}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-xl ${kpi.color}`}>
                        <Icon size={18} className="stroke-[2.5]" />
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border tracking-wider ${kpi.statusColor}`}>
                        {kpi.statusText}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                        {kpi.title}
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black font-mono tracking-tight">
                          {kpi.amount}
                        </span>
                        <span className="text-xs text-slate-400 font-extrabold uppercase">
                          {kpi.unit}
                        </span>
                      </div>
                    </div>

                    {kpiItem.secondary && (
                      <div className="mt-3 pt-3 border-t border-dashed border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {kpiItem.secondary.title}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-extrabold font-mono text-white leading-none">
                            {kpiItem.secondary.amount}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">
                            {kpiItem.secondary.unit}
                          </span>
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400 mt-3 border-t border-slate-800/50 pt-2.5 leading-relaxed">
                      {kpi.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* RIGHT SIDE: INTEGRATED IN-CONTEXT TREND CHART (Only for efficiency category) */}
            {activeCategory === "efficiency" && (
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Activity size={16} className="text-indigo-500" />
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      CAD vs. ETE Deviation Trend
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Visualize the divergence between pattern CAD efficiency and physical panel output.
                  </p>
                </div>

                <div className="w-full h-56 sm:h-60 mt-4 pr-2">
                  {entries.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                      <TrendingUp size={36} className="text-slate-300 animate-pulse mb-2" />
                      <span className="text-xs font-bold">No Cutting Entries Loaded</span>
                      <span className="text-[11px] mt-1 text-slate-400 max-w-xs">Trend charts populate automatically when entries exist for selected table filters.</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.efficiency} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} domain={[50, 100]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px" }}
                          labelStyle={{ color: "#94a3b8", fontWeight: "bold", fontSize: "11px" }}
                          itemStyle={{ fontSize: "11px", padding: "1px 0" }}
                        />
                        <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />
                        <Line type="monotone" dataKey="CAD Target %" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="ETE Actual %" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

          </div>
        ) : (
          /* Professional Table View for Ledger-Based KPI Analysis */
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-850 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="p-4 pl-5">Metric Name</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Value</th>
                    <th className="p-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 font-medium">
                  {activeCategoryKpis.map((kpi) => {
                    const Icon = kpi.icon;
                    const kpiItem = kpi as typeof kpi & { secondary?: { title: string; amount: string; unit: string } };

                    return (
                      <tr key={kpi.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition">
                        <td className="p-4 pl-5">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${kpi.color} shrink-0`}>
                              <Icon size={16} className="stroke-[2.5]" />
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                                {kpi.title}
                              </div>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold font-mono uppercase">
                                ID: {kpi.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border tracking-wider inline-block ${kpi.statusColor}`}>
                            {kpi.statusText}
                          </span>
                        </td>

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

                        <td className="p-4 text-slate-500 dark:text-slate-400 leading-relaxed font-sans max-w-xs truncate hover:whitespace-normal">
                          {kpi.desc}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
