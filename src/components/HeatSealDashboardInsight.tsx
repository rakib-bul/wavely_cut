import React, { useMemo } from "react";
import { formatDate } from "../utils/dateUtils";
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Clock,
  AlertTriangle,
  Award,
  ArrowRight,
  Sparkles,
  BarChart2,
  Calendar
} from "lucide-react";
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
  Line,
  Cell
} from "recharts";
import { HeatSealEntry, HourlyHeatSealData } from "../types";

interface HeatSealDashboardInsightProps {
  entries: HeatSealEntry[];
  selectedDate: string;
  availableDates?: string[];
}

export default function HeatSealDashboardInsight({
  entries = [],
  selectedDate,
  availableDates = []
}: HeatSealDashboardInsightProps) {
  // Aggregate data for the selected day
  const selectedDayEntries = useMemo(() => {
    return entries.filter(e => e.entry_date === selectedDate);
  }, [entries, selectedDate]);

  // Calculate stats for the selected day
  const dayStats = useMemo(() => {
    let totalTarget = 0;
    let totalProduction = 0;
    let totalShortfall = 0;
    const operatorsSet = new Set<string>();

    selectedDayEntries.forEach(entry => {
      operatorsSet.add(entry.operator_name || entry.operator_id);
      entry.hourly_data?.forEach(hour => {
        totalTarget += Number(hour.target) || 0;
        totalProduction += Number(hour.production) || 0;
        totalShortfall += Number(hour.shortfall) || 0;
      });
    });

    const efficiency = totalTarget > 0 ? (totalProduction / totalTarget) * 100 : 0;
    
    return {
      totalTarget,
      totalProduction,
      totalShortfall,
      operatorCount: operatorsSet.size,
      efficiency
    };
  }, [selectedDayEntries]);

  // Aggregate hourly production across all operators for the selected day
  const hourlyChartData = useMemo(() => {
    const hoursMap: { [slot: string]: { hour: string; target: number; production: number } } = {};
    
    selectedDayEntries.forEach(entry => {
      entry.hourly_data?.forEach(hour => {
        const slot = hour.hour_slot;
        if (!hoursMap[slot]) {
          hoursMap[slot] = { hour: slot, target: 0, production: 0 };
        }
        hoursMap[slot].target += Number(hour.target) || 0;
        hoursMap[slot].production += Number(hour.production) || 0;
      });
    });

    // Sort order for slots logically (e.g. 8-9 AM, 9-10 AM, etc.)
    const slotOrder = [
      "8-9 AM", "9-10 AM", "10-11 AM", "11-12 PM", "12-1 PM", 
      "1-2 PM", "2-3 PM", "3-4 PM", "4-5 PM", "5-6 PM", "6-7 PM", "7-8 PM",
      "8-9 PM", "9-10 PM", "10-11 PM", "11-12 AM", "12-1 AM",
      "1-2 AM", "2-3 AM", "3-4 AM", "4-5 AM", "5-6 AM", "6-7 AM", "7-8 AM"
    ];

    return Object.values(hoursMap).sort((a, b) => {
      const idxA = slotOrder.indexOf(a.hour);
      const idxB = slotOrder.indexOf(b.hour);
      if (idxA === -1 && idxB === -1) return a.hour.localeCompare(b.hour);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [selectedDayEntries]);

  // Operator leaderboard for the selected day
  const operatorLeaderboard = useMemo(() => {
    const opsMap: { [name: string]: { name: string; production: number; target: number } } = {};

    selectedDayEntries.forEach(entry => {
      const name = entry.operator_name || "Unknown Operator";
      if (!opsMap[name]) {
        opsMap[name] = { name, production: 0, target: 0 };
      }
      entry.hourly_data?.forEach(hour => {
        opsMap[name].production += Number(hour.production) || 0;
        opsMap[name].target += Number(hour.target) || 0;
      });
    });

    return Object.values(opsMap)
      .map(op => ({
        ...op,
        efficiency: op.target > 0 ? (op.production / op.target) * 100 : 0
      }))
      .sort((a, b) => b.production - a.production);
  }, [selectedDayEntries]);

  // 7-day Historical Heat Seal Trend Data
  const historyTrendData = useMemo(() => {
    const dateMap: { [date: string]: { date: string; production: number; target: number } } = {};
    
    entries.forEach(entry => {
      const d = entry.entry_date;
      if (!dateMap[d]) {
        dateMap[d] = { date: d, production: 0, target: 0 };
      }
      entry.hourly_data?.forEach(hour => {
        dateMap[d].production += Number(hour.production) || 0;
        dateMap[d].target += Number(hour.target) || 0;
      });
    });

    return Object.values(dateMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7) // Last 7 active heat seal dates
      .map(d => ({
        ...d,
        efficiency: d.target > 0 ? parseFloat(((d.production / d.target) * 100).toFixed(1)) : 0
      }));
  }, [entries]);

  // Generate dynamic actionable insights based on selected day's data
  const generatedInsights = useMemo(() => {
    if (selectedDayEntries.length === 0) return [];

    const insightsList: {
      type: "success" | "warning" | "info" | "achievement";
      title: string;
      message: string;
    }[] = [];

    // 1. Overall efficiency check
    const eff = dayStats.efficiency;
    if (eff >= 95) {
      insightsList.push({
        type: "achievement",
        title: "Peak Operational Efficiency Achieved",
        message: `Outstanding floor coordination! Daily Heat Seal efficiency has reached ${eff.toFixed(1)}%, surpassing the optimal target threshold of 90%.`
      });
    } else if (eff < 80 && eff > 0) {
      insightsList.push({
        type: "warning",
        title: "Low Efficiency Warning",
        message: `Daily efficiency is currently underperforming at ${eff.toFixed(1)}%. Inspect the line for delayed fabric feed or heater system calibration lags.`
      });
    } else {
      insightsList.push({
        type: "success",
        title: "Stable Floor Output",
        message: `Daily output is holding steady at ${eff.toFixed(1)}% efficiency. Production parameters are within the standard control limits.`
      });
    }

    // 2. Identify fatigue hour slot or productivity dip
    if (hourlyChartData.length > 0) {
      let lowestSlot = "";
      let lowestRatio = 100;
      let highestSlot = "";
      let highestProd = 0;

      hourlyChartData.forEach(d => {
        const hourEff = d.target > 0 ? (d.production / d.target) : 1;
        if (hourEff < lowestRatio && d.target > 10) {
          lowestRatio = hourEff;
          lowestSlot = d.hour;
        }
        if (d.production > highestProd) {
          highestProd = d.production;
          highestSlot = d.hour;
        }
      });

      if (lowestSlot && lowestRatio < 0.85) {
        insightsList.push({
          type: "warning",
          title: "Critical Hourly Productivity Dip",
          message: `Hourly performance dropped to ${(lowestRatio * 100).toFixed(1)}% during the '${lowestSlot}' slot. This indicates high fatigue or conveyor bottle-necks. Consider scheduling staggered breaks.`
        });
      }

      if (highestSlot) {
        insightsList.push({
          type: "info",
          title: "Peak Hourly Throughput",
          message: `The highest volume segment occurred at '${highestSlot}' with ${highestProd.toLocaleString()} Pcs heat-sealed. Leverage setup standards from this hour block.`
        });
      }
    }

    // 3. Operator spotlight / outlier
    if (operatorLeaderboard.length > 0) {
      const bestOp = operatorLeaderboard[0];
      const lowestOp = [...operatorLeaderboard].sort((a, b) => a.efficiency - b.efficiency)[0];

      if (bestOp && bestOp.efficiency >= 95) {
        insightsList.push({
          type: "achievement",
          title: `Operator Spotlight: ${bestOp.name}`,
          message: `Top performance registered by ${bestOp.name}, reaching ${bestOp.efficiency.toFixed(1)}% efficiency with a total of ${bestOp.production} pieces processed.`
        });
      }

      if (lowestOp && lowestOp.efficiency < 75 && lowestOp.name !== bestOp.name) {
        insightsList.push({
          type: "warning",
          title: "Operator Training Recommended",
          message: `${lowestOp.name} is running at ${lowestOp.efficiency.toFixed(1)}% efficiency today. Active supervisor side-by-side training or equipment checkout is recommended.`
        });
      }
    }

    // 4. Shortfall check
    if (dayStats.totalShortfall > 150) {
      insightsList.push({
        type: "warning",
        title: "Outstanding Production Deficit",
        message: `An aggregate daily shortfall of ${dayStats.totalShortfall.toLocaleString()} pieces detected. Allocate premium auxiliary operators to prevent shipment packing bottlenecks.`
      });
    }

    return insightsList;
  }, [selectedDayEntries, dayStats, hourlyChartData, operatorLeaderboard]);

  const axisLabelColor = "#334155";

  return (
    <div className="space-y-6 font-sans">
      {/* Title block with sparkles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center border border-amber-500/20 shadow-xs">
            <Flame size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-400 uppercase">
                Heat Seal Intelligence
              </span>
              <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={8} /> Floor Analytics
              </span>
            </div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
              Daily Heat Seal Analysis & Insights
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-500 max-w-md md:text-right">
          Interactive daily performance timeline, shortfall statistics, and operator metrics for active heat seal lines.
        </p>
      </div>

      {selectedDayEntries.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 p-8 rounded-2xl text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mx-auto border border-slate-200/50">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">No Heat Seal Logs for {formatDate(selectedDate)}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no active heat seal operator entries recorded on this date. Select another date or check standard reports.
            </p>
          </div>
          {availableDates.length > 0 && (
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Available heat seal dates: {availableDates.slice(0, 5).map(d => formatDate(d)).join(", ")}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Mini Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Daily Throughput
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono leading-none">
                  {dayStats.totalProduction.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 uppercase font-bold">Pcs</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Total panel count processed today
              </p>
              <div className="absolute right-4 top-4 p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                <Flame size={16} />
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Daily Targets Sum
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono leading-none">
                  {dayStats.totalTarget.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 uppercase font-bold">Pcs</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Total floor target scheduled
              </p>
              <div className="absolute right-4 top-4 p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                <Target size={16} />
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Overall Efficiency
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono leading-none">
                  {dayStats.efficiency.toFixed(1)}%
                </span>
              </div>
              <p className={`text-[10px] font-bold mt-2 flex items-center gap-1 ${
                dayStats.efficiency >= 90 ? "text-emerald-600" : dayStats.efficiency >= 80 ? "text-amber-600" : "text-rose-600"
              }`}>
                {dayStats.efficiency >= 90 ? "Optimal Yield" : dayStats.efficiency >= 80 ? "Acceptable Yield" : "Yield Shortfall"}
              </p>
              <div className="absolute right-4 top-4 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <TrendingUp size={16} />
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl relative overflow-hidden">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Deficit / Shortfall
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className={`text-2xl font-black font-mono leading-none ${
                  dayStats.totalShortfall > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {dayStats.totalShortfall.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 uppercase font-bold">Pcs</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Missed target piece count
              </p>
              <div className={`absolute right-4 top-4 p-2.5 rounded-xl ${
                dayStats.totalShortfall > 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
              }`}>
                <AlertTriangle size={16} />
              </div>
            </div>
          </div>

          {/* Core Analytics Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Hourly Trend (Left/Main Column) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs lg:col-span-8 space-y-4">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Hourly Production vs Target Timeline
                </h3>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                  Aggregated Output vs. Operational Target Hour-by-Hour
                </p>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyChartData} margin={{ top: 10, left: -20, right: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                    <XAxis 
                      dataKey="hour" 
                      tick={{ fontSize: 9, fill: axisLabelColor, fontWeight: 600 }} 
                      stroke="#E2E8F0"
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} 
                      stroke="#E2E8F0"
                    />
                    <Tooltip 
                      contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '12px', color: '#F8FAFC', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="production" name="Actual Production" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target" name="Target Target" fill="#3B82F6" radius={[4, 4, 0, 0]} opacity={0.65} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Operator Leaderboard (Right/Side Column) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs lg:col-span-4 space-y-4 flex flex-col">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Award size={14} className="text-amber-500" /> Operator Leaderboard
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ranked by total daily throughput volume
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 overflow-y-auto max-h-72 flex-1 space-y-3.5 pr-1">
                {operatorLeaderboard.map((op, index) => (
                  <div key={op.name} className="flex items-center justify-between pt-3.5 first:pt-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] ${
                        index === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200" :
                        index === 1 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/50" :
                        "bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500"
                      }`}>
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                          {op.name}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          Target: {op.target.toLocaleString()} Pcs
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white font-mono">
                        {op.production.toLocaleString()} Pcs
                      </div>
                      <div className={`text-[9px] font-black uppercase ${
                        op.efficiency >= 95 ? "text-emerald-500" : op.efficiency >= 80 ? "text-amber-500" : "text-rose-500"
                      }`}>
                        {op.efficiency.toFixed(1)}% Eff
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actionable Floor Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Floor Insights Alerts Block */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" /> Intelligent Floor Alerts
                </h3>
                <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Real-Time
                </span>
              </div>

              <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                {generatedInsights.length === 0 ? (
                  <p className="text-xs text-slate-400">No outlier conditions or active issues analyzed for today's run.</p>
                ) : (
                  generatedInsights.map((insight, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3.5 rounded-xl border flex gap-3 ${
                        insight.type === "warning" ? "bg-rose-50/40 border-rose-100 dark:bg-rose-950/10 dark:border-rose-950/30 text-rose-800 dark:text-rose-400" :
                        insight.type === "achievement" ? "bg-amber-50/40 border-amber-100 dark:bg-amber-950/10 dark:border-amber-950/30 text-amber-800 dark:text-amber-400" :
                        insight.type === "success" ? "bg-emerald-50/40 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-950/30 text-emerald-800 dark:text-emerald-400" :
                        "bg-slate-50/40 border-slate-100 dark:bg-slate-950/20 dark:border-slate-850 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {insight.type === "warning" && <AlertTriangle size={15} className="text-rose-500" />}
                        {insight.type === "achievement" && <Award size={15} className="text-amber-500" />}
                        {insight.type === "success" && <TrendingUp size={15} className="text-emerald-500" />}
                        {insight.type === "info" && <Clock size={15} className="text-blue-500" />}
                      </div>
                      <div className="space-y-0.5 text-left">
                        <h4 className="font-extrabold text-xs leading-snug">
                          {insight.title}
                        </h4>
                        <p className="text-[11px] leading-relaxed opacity-90">
                          {insight.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 7-Day Historical Efficiency Progression */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <BarChart2 size={14} className="text-blue-500" /> Historical Performance Trend
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  7-Day moving average efficiency and output logs
                </p>
              </div>

              <div className="h-60">
                {historyTrendData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">Not enough history to map trend lines.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyTrendData} margin={{ top: 10, left: -20, right: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => formatDate(val)}
                        tick={{ fontSize: 9, fill: axisLabelColor, fontWeight: 600 }} 
                        stroke="#E2E8F0"
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} 
                        stroke="#E2E8F0"
                      />
                      <Tooltip 
                        labelFormatter={(val) => formatDate(val)}
                        contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '12px', color: '#F8FAFC', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }} 
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="efficiency" name="Operational Efficiency (%)" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
