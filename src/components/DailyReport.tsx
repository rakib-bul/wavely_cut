import React, { useState, useMemo } from "react";
import { 
  Calendar, 
  Scissors, 
  Layers, 
  Cpu, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Hash,
  Activity,
  Award,
  FileSpreadsheet
} from "lucide-react";
import { CuttingEntry, Machine } from "../types";

interface DailyReportProps {
  entries: CuttingEntry[];
  machines: Machine[];
}

export default function DailyReport({ entries, machines }: DailyReportProps) {
  // 1. Find all unique dates that have entries, sorted descending
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    entries.forEach(e => {
      if (e.entry_date) {
        dates.add(e.entry_date);
      }
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  // Get current date string in local timezone (YYYY-MM-DD) as a fallback
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // 2. Default state for selected date: latest available date with entries, or today
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (availableDates.length > 0) {
      return availableDates[0];
    }
    return todayStr;
  });

  // 3. Filter entries for the selected date
  const dayEntries = useMemo(() => {
    return entries.filter(e => e.entry_date === selectedDate);
  }, [entries, selectedDate]);

  // 4. Calculate stats for the selected date
  const stats = useMemo(() => {
    const totalCuttingLots = dayEntries.length;
    const totalLay = dayEntries.reduce((sum, e) => sum + (Number(e.lay) || 0), 0);
    const totalCuttingQty = dayEntries.reduce((sum, e) => sum + ((Number(e.lay) || 0) * (Number(e.ratio) || 0)), 0);
    const totalFabricUsedKg = dayEntries.reduce((sum, e) => sum + (Number(e.fabric_used_kg) || 0), 0);
    const totalCalculatedMetric = dayEntries.reduce((sum, e) => {
      const lay = Number(e.lay) || 0;
      const length = Number(e.marker_length_inch) || 0;
      const efficiency = Number(e.marker_efficiency_percent) || 0;
      return sum + (lay * length * (efficiency / 100));
    }, 0);

    return {
      totalCuttingLots,
      totalLay,
      totalCuttingQty,
      totalFabricUsedKg,
      totalCalculatedMetric
    };
  }, [dayEntries]);

  // 5. Aggregate machine-wise production for the selected date
  const machineProduction = useMemo(() => {
    const productionMap: { 
      [machineId: string]: {
        machineId: string;
        machineName: string;
        machineType: string;
        cutsCount: number;
        laySum: number;
        cuttingQtySum: number;
        fabricUsedSum: number;
        calculatedMetricSum: number;
      }
    } = {};

    // Initialize all machines
    machines.forEach(m => {
      productionMap[m.id] = {
        machineId: m.id,
        machineName: m.machine_name,
        machineType: m.machine_type,
        cutsCount: 0,
        laySum: 0,
        cuttingQtySum: 0,
        fabricUsedSum: 0,
        calculatedMetricSum: 0
      };
    });

    // Populate active entries on selectedDate
    dayEntries.forEach(e => {
      const mId = e.machine_id;
      if (!productionMap[mId]) {
        // Fallback for machines not in database config but in entry
        productionMap[mId] = {
          machineId: mId,
          machineName: `Machine ID: ${mId}`,
          machineType: "Automatic Cutter",
          cutsCount: 0,
          laySum: 0,
          cuttingQtySum: 0,
          fabricUsedSum: 0,
          calculatedMetricSum: 0
        };
      }
      
      const item = productionMap[mId];
      const lay = Number(e.lay) || 0;
      const ratio = Number(e.ratio) || 0;
      const length = Number(e.marker_length_inch) || 0;
      const efficiency = Number(e.marker_efficiency_percent) || 0;

      item.cutsCount += 1;
      item.laySum += lay;
      item.cuttingQtySum += (lay * ratio);
      item.fabricUsedSum += Number(e.fabric_used_kg) || 0;
      item.calculatedMetricSum += (lay * length * (efficiency / 100));
    });

    // Convert to array and filter out machines with zero cuts to focus on active ones
    const allStats = Object.values(productionMap);
    const activeStats = allStats.filter(m => m.cutsCount > 0);
    
    // Sort active ones by cuttingQtySum descending to see top performer
    return activeStats.sort((a, b) => b.cuttingQtySum - a.cuttingQtySum);
  }, [dayEntries, machines]);

  // Navigation handlers for date
  const handlePrevDay = () => {
    if (availableDates.length === 0) return;
    const currentIndex = availableDates.indexOf(selectedDate);
    if (currentIndex !== -1 && currentIndex < availableDates.length - 1) {
      setSelectedDate(availableDates[currentIndex + 1]);
    } else {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 1);
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      setSelectedDate(`${yStr}-${mStr}-${dStr}`);
    }
  };

  const handleNextDay = () => {
    if (availableDates.length === 0) return;
    const currentIndex = availableDates.indexOf(selectedDate);
    if (currentIndex > 0) {
      setSelectedDate(availableDates[currentIndex - 1]);
    } else {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 1);
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      setSelectedDate(`${yStr}-${mStr}-${dStr}`);
    }
  };

  const handleExportCSV = () => {
    if (dayEntries.length === 0) return;

    const csvRows: string[][] = [];

    // Helper to escape values
    const escape = (val: any) => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // 1. Header & Title Section
    csvRows.push(["DAILY OPERATIONAL REPORT", "WAVELY CUT PLATFORM"]);
    csvRows.push(["Selected Date", selectedDate]);
    csvRows.push(["Report Exported At", new Date().toLocaleString()]);
    csvRows.push(["Developer", "Rakib Hasan"]);
    csvRows.push([]); // Empty row

    // 2. Summary Statistics KPI Section
    csvRows.push(["SUMMARY STATISTICS"]);
    csvRows.push(["Metric", "Value", "Unit"]);
    csvRows.push(["Total Cutting Lots", String(stats.totalCuttingLots), "Lots"]);
    csvRows.push(["Total Lay Layers", String(stats.totalLay), "Layers"]);
    csvRows.push(["Total Cutting Quantity", String(stats.totalCuttingQty), "Pcs"]);
    csvRows.push(["Total Fabric Weight Used", stats.totalFabricUsedKg.toFixed(2), "KG"]);
    csvRows.push(["Total Processed Length", stats.totalCalculatedMetric.toFixed(2), "Inches"]);
    csvRows.push(["Average Layers per Lot", (stats.totalLay / (stats.totalCuttingLots || 1)).toFixed(2), "Layers/Lot"]);
    csvRows.push([]); // Empty row

    // 3. Machine Performance Breakdown
    csvRows.push(["MACHINE PRODUCTION BREAKDOWN"]);
    csvRows.push([
      "Machine Name",
      "Machine Type",
      "Cuts (Lots)",
      "Total Lay (Layers)",
      "Cutting Qty (Pcs)",
      "Fabric Weight Used (KG)",
      "Effective Inches Processed",
      "Production Share (%)"
    ]);

    machineProduction.forEach(m => {
      const sharePercent = stats.totalCuttingQty > 0 
        ? Math.round((m.cuttingQtySum / stats.totalCuttingQty) * 100) 
        : 0;

      csvRows.push([
        m.machineName,
        m.machineType,
        String(m.cutsCount),
        String(m.laySum),
        String(m.cuttingQtySum),
        m.fabricUsedSum.toFixed(2),
        m.calculatedMetricSum.toFixed(2),
        `${sharePercent}%`
      ]);
    });
    csvRows.push([]); // Empty row

    // 4. Detailed Entry Ledger
    csvRows.push(["DETAILED OPERATIONAL RECORD LEDGER"]);
    csvRows.push([
      "Job/Order No",
      "Cut No",
      "Shift",
      "Machine ID",
      "Buyer",
      "Fabric Type",
      "Color",
      "Item",
      "Table No",
      "Lay (Layers)",
      "Ratio",
      "Cutting Qty (Pcs)",
      "Fabric Used (KG)",
      "Remnant Weight (KG)",
      "Scrap Weight (KG)",
      "Marker Length (Inch)",
      "Marker Efficiency (%)",
      "Status",
      "Remarks"
    ]);

    dayEntries.forEach(e => {
      const cuttingQty = (Number(e.lay) || 0) * (Number(e.ratio) || 0);
      csvRows.push([
        e.job_no,
        e.cut_no,
        e.shift === "A" ? "Day" : e.shift === "B" ? "Night" : e.shift,
        e.machine_id,
        e.buyer,
        e.fabric_type,
        e.color,
        e.item,
        e.table_no,
        String(e.lay),
        String(e.ratio),
        String(cuttingQty),
        String(e.fabric_used_kg),
        String(e.remnant_weight_kg),
        String(e.cutting_scrap_weight_kg),
        String(e.marker_length_inch),
        String(e.marker_efficiency_percent),
        e.status,
        e.remarks
      ]);
    });

    // Generate CSV string
    const csvContent = csvRows.map(row => row.map(escape).join(",")).join("\n");

    // Add BOM for Microsoft Excel UTF-8 compatibility
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `WavelyCut_Daily_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm font-sans" id="daily-report-card">
      
      {/* Header and Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Calendar size={18} className="stroke-[2.5]" />
            </span>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Daily Operational Report
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Standard floor metrics, total fabric lays, marker counts, and active machine yields.
          </p>
        </div>

        {/* Date Selector & Export Actions Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevDay}
              className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-xs h-10"
              title="Previous Logged Date"
            >
              <ChevronLeft size={16} />
            </button>
            
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs h-10"
            />

            <button
              onClick={handleNextDay}
              className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-xs h-10"
              title="Next Logged Date"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={dayEntries.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs py-2.5 px-4 rounded-xl cursor-pointer shadow-sm shadow-emerald-600/15 transition-all shrink-0 h-10"
            title="Download formatted daily CSV report (compatible with Excel)"
          >
            <FileSpreadsheet size={15} />
            <span>Export Report (Excel/CSV)</span>
          </button>
        </div>
      </div>

      {/* Quick Access Dates Pills */}
      {availableDates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">Quick Select:</span>
          {availableDates.slice(0, 5).map(dateStr => (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono transition font-bold cursor-pointer border ${
                selectedDate === dateStr
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
              }`}
            >
              {dateStr}
            </button>
          ))}
        </div>
      )}

      {/* If no entries for this date */}
      {dayEntries.length === 0 ? (
        <div className="py-12 px-4 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-950/10 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl">
          <Calendar className="text-slate-400 dark:text-slate-600 mb-3" size={36} />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">No Operational Records</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            There are no cutting logs submitted for <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedDate}</span>. Please use the calendar input above or select an active date from the quick select pills.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Main KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI: Total Cutting Lots */}
            <div className="bg-slate-50/55 dark:bg-[#0B1220]/50 border border-slate-200 dark:border-slate-800/60 p-5 rounded-2xl flex items-center justify-between hover:shadow-xs transition-all">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Total Cutting Lots
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                    {stats.totalCuttingLots}
                  </span>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Lots</span>
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-2 font-medium">
                  Weight: <b className="font-mono font-bold text-slate-850 dark:text-slate-200">{stats.totalFabricUsedKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} KG</b>
                </span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Scissors size={20} className="stroke-[2.5]" />
              </div>
            </div>

            {/* KPI: Total Lay Layers */}
            <div className="bg-slate-50/55 dark:bg-[#0B1220]/50 border border-slate-200 dark:border-slate-800/60 p-5 rounded-2xl flex items-center justify-between hover:shadow-xs transition-all">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Total Lay Layers
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                    {stats.totalLay.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Layers</span>
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-2 font-medium">
                  Avg: <b className="font-mono font-bold text-slate-850 dark:text-slate-200">{Math.round(stats.totalLay / (stats.totalCuttingLots || 1))} / lot</b>
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Layers size={20} className="stroke-[2.5]" />
              </div>
            </div>

            {/* KPI: Cutting Qty (Marker Ratio * Lay) */}
            <div className="bg-slate-50/55 dark:bg-[#0B1220]/50 border border-slate-200 dark:border-slate-800/60 p-5 rounded-2xl flex items-center justify-between hover:shadow-xs transition-all">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Cutting Qty (Ratio × Lay)
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                    {stats.totalCuttingQty.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Pcs</span>
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-2 font-medium">
                  Usable cut-out panels
                </span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Hash size={20} className="stroke-[2.5]" />
              </div>
            </div>

            {/* KPI: Total (Lay * Length * Eff / 100) */}
            <div className="bg-slate-50/55 dark:bg-[#0B1220]/50 border border-slate-200 dark:border-slate-800/60 p-5 rounded-2xl flex items-center justify-between hover:shadow-xs transition-all">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Total Fabric Used (Inch)
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                    {stats.totalCalculatedMetric.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">In.</span>
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-2 font-medium">
                  Effective cut inches processed
                </span>
              </div>
              <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400">
                <Cpu size={20} className="stroke-[2.5]" />
              </div>
            </div>

          </div>

          {/* Machine-Wise Production */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950/10 shadow-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[#2563EB] stroke-[2.5]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Machine Production Breakdown
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono">
                Selected Date: {selectedDate}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="p-4 pl-5">Machine Details</th>
                    <th className="p-4 text-center">Cuts (Lots)</th>
                    <th className="p-4 text-right">Total Lay (Layers)</th>
                    <th className="p-4 text-right">Cutting Qty (Ratio × Lay)</th>
                    <th className="p-4 text-right">Total Lay × Length × Eff %</th>
                    <th className="p-4 text-right">Fabric Processed</th>
                    <th className="p-4 pr-5 text-right">Production Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {machineProduction.map((m, index) => {
                    const sharePercent = stats.totalCuttingQty > 0 
                      ? Math.round((m.cuttingQtySum / stats.totalCuttingQty) * 100) 
                      : 0;

                    return (
                      <tr key={m.machineId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                        {/* Machine Details */}
                        <td className="p-4 pl-5">
                          <div className="flex items-center gap-2.5">
                            {index === 0 && (
                              <span className="text-amber-500" title="Top Performing Cutter Today">
                                <Award size={16} />
                              </span>
                            )}
                            <div>
                              <div className="font-extrabold text-slate-800 dark:text-slate-200">
                                {m.machineName}
                              </div>
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                                {m.machineType}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Cuts Count */}
                        <td className="p-4 text-center font-mono font-bold text-slate-750 dark:text-slate-300">
                          {m.cutsCount}
                        </td>

                        {/* Total Lay */}
                        <td className="p-4 text-right font-mono text-slate-705 dark:text-slate-300">
                          {m.laySum.toLocaleString()}
                        </td>

                        {/* Cutting Qty */}
                        <td className="p-4 text-right font-mono font-bold text-[#2563EB]">
                          {m.cuttingQtySum.toLocaleString()}
                        </td>

                        {/* Calculated Metric (Total lay * length * eff %) */}
                        <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {m.calculatedMetricSum.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </td>

                        {/* Fabric Used */}
                        <td className="p-4 text-right font-mono text-slate-600 dark:text-slate-400">
                          {m.fabricUsedSum.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} KG
                        </td>

                        {/* Production Share Visual */}
                        <td className="p-4 pr-5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                              {sharePercent}%
                            </span>
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block shrink-0">
                              <div 
                                className="h-full bg-slate-900 dark:bg-slate-150 rounded-full" 
                                style={{ width: `${sharePercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      )}

    </div>
  );
}
