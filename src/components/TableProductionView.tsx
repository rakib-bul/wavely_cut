import React, { useState, useMemo } from "react";
import { 
  TrendingUp, 
  Layers, 
  Scale, 
  Zap, 
  Activity, 
  Award, 
  Flame, 
  Trophy, 
  Sparkles,
  Percent,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { CuttingEntry } from "../types";

interface TableProductionViewProps {
  entries: CuttingEntry[];
}

interface ProductionStats {
  id: string | number;
  name: string;
  totalLays: number;
  totalPieces: number;
  totalFabricUsedKg: number;
  totalCuttingScrapKg: number;
  avgMarkerEfficiency: number;
  totalEntries: number;
  lastActiveBuyer: string;
  lastActiveJob: string;
  lastActiveDate: string;
  isActive: boolean;
}

// Robust helper to map arbitrary table strings into 1-7 indexes
function getTableIndex(tableNo: string | undefined | null): number | null {
  if (!tableNo) return null;
  const norm = String(tableNo).trim().toLowerCase();
  
  // Try direct matches first
  if (norm === "1" || norm === "tbl-1" || norm === "tbl-01" || norm === "t-1" || norm === "table 1" || norm === "table-1") return 1;
  if (norm === "2" || norm === "tbl-2" || norm === "tbl-02" || norm === "t-2" || norm === "table 2" || norm === "table-2") return 2;
  if (norm === "3" || norm === "tbl-3" || norm === "tbl-03" || norm === "t-3" || norm === "table 3" || norm === "table-3") return 3;
  if (norm === "4" || norm === "tbl-4" || norm === "tbl-04" || norm === "t-4" || norm === "table 4" || norm === "table-4") return 4;
  if (norm === "5" || norm === "tbl-5" || norm === "tbl-05" || norm === "t-5" || norm === "table 5" || norm === "table-5") return 5;
  if (norm === "6" || norm === "tbl-6" || norm === "tbl-06" || norm === "t-6" || norm === "table 6" || norm === "table-6") return 6;
  if (norm === "7" || norm === "tbl-7" || norm === "tbl-07" || norm === "t-7" || norm === "table 7" || norm === "table-7") return 7;

  // Fallback to searching for the digit
  const match = norm.match(/[1-7]/);
  if (match) {
    return parseInt(match[0], 10);
  }
  return null;
}

export default function TableProductionView({ entries }: TableProductionViewProps) {
  const [viewMode, setViewMode] = useState<"table" | "supervisor">("table");
  const [timeFrame, setTimeFrame] = useState<"daily" | "weekly" | "monthly">("daily");

  // Determine all unique dates that have entries, sorted descending
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    entries.forEach(e => {
      if (e.entry_date) {
        dates.add(e.entry_date);
      }
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const [selectedDate, setSelectedDate] = useState<string>("");

  // Determine active selected date: latest available date, or fallback to today
  const activeSelectedDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    if (availableDates.length > 0) return availableDates[0];
    return new Date().toISOString().split("T")[0];
  }, [selectedDate, availableDates]);

  // Navigate dates
  const handlePrevDate = () => {
    if (availableDates.length === 0) {
      const d = new Date(activeSelectedDate);
      d.setDate(d.getDate() - 1);
      setSelectedDate(d.toISOString().split("T")[0]);
      return;
    }
    const currentIndex = availableDates.indexOf(activeSelectedDate);
    if (currentIndex !== -1 && currentIndex < availableDates.length - 1) {
      setSelectedDate(availableDates[currentIndex + 1]);
    } else {
      const d = new Date(activeSelectedDate);
      d.setDate(d.getDate() - 1);
      setSelectedDate(d.toISOString().split("T")[0]);
    }
  };

  const handleNextDate = () => {
    if (availableDates.length === 0) {
      const d = new Date(activeSelectedDate);
      d.setDate(d.getDate() + 1);
      setSelectedDate(d.toISOString().split("T")[0]);
      return;
    }
    const currentIndex = availableDates.indexOf(activeSelectedDate);
    if (currentIndex > 0) {
      setSelectedDate(availableDates[currentIndex - 1]);
    } else {
      const d = new Date(activeSelectedDate);
      d.setDate(d.getDate() + 1);
      setSelectedDate(d.toISOString().split("T")[0]);
    }
  };

  // Dynamically filter entries based on chosen time frame relative to activeSelectedDate
  const filteredEntries = useMemo(() => {
    if (entries.length === 0) return [];
    if (!activeSelectedDate) return entries;

    const refDate = new Date(activeSelectedDate + "T00:00:00");

    return entries.filter(entry => {
      if (!entry.entry_date) return false;
      const entryDate = new Date(entry.entry_date + "T00:00:00");
      const diffTime = refDate.getTime() - entryDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (timeFrame === "daily") {
        return entry.entry_date === activeSelectedDate;
      } else if (timeFrame === "weekly") {
        return diffDays >= 0 && diffDays < 7;
      } else if (timeFrame === "monthly") {
        return diffDays >= 0 && diffDays < 30;
      }
      return true;
    });
  }, [entries, activeSelectedDate, timeFrame]);

  // Format a friendly display range label for user feedback
  const dateRangeLabel = useMemo(() => {
    if (!activeSelectedDate) return "";
    const refDate = new Date(activeSelectedDate + "T00:00:00");
    if (timeFrame === "daily") {
      return `Reporting Date: ${activeSelectedDate}`;
    }
    const days = timeFrame === "weekly" ? 6 : 29;
    const startDate = new Date(refDate.getTime() - days * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    return `Period: ${formatDate(startDate)} to ${activeSelectedDate}`;
  }, [activeSelectedDate, timeFrame]);

  // Process the 7 tables or supervisors and build their scorecards using filtered entries
  const productionStatsList = useMemo<ProductionStats[]>(() => {
    if (viewMode === "table") {
      const stats: ProductionStats[] = Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        name: `Table ${i + 1}`,
        totalLays: 0,
        totalPieces: 0,
        totalFabricUsedKg: 0,
        totalCuttingScrapKg: 0,
        avgMarkerEfficiency: 0,
        totalEntries: 0,
        lastActiveBuyer: "N/A",
        lastActiveJob: "N/A",
        lastActiveDate: "",
        isActive: false
      }));

      // Group filtered entries into tables
      const tableEntriesMap: Record<number, CuttingEntry[]> = {};
      for (let i = 1; i <= 7; i++) {
        tableEntriesMap[i] = [];
      }

      filteredEntries.forEach(entry => {
        const tIdx = getTableIndex(entry.table_no);
        if (tIdx && tIdx >= 1 && tIdx <= 7) {
          tableEntriesMap[tIdx].push(entry);
        }
      });

      // Compute stats for each table
      stats.forEach(stat => {
        const tEntries = tableEntriesMap[stat.id as number];
        if (tEntries.length === 0) return;

        let sumLays = 0;
        let sumPieces = 0;
        let sumFabric = 0;
        let sumScrap = 0;
        let sumEfficiency = 0;
        let validEfficiencyCount = 0;

        // Sort entries by date to find latest active
        const sortedEntries = [...tEntries].sort((a, b) => {
          const dateA = new Date(a.entry_date + "T00:00:00");
          const dateB = new Date(b.entry_date + "T00:00:00");
          return dateB.getTime() - dateA.getTime();
        });

        tEntries.forEach(e => {
          sumLays += Number(e.lay) || 0;
          sumPieces += (Number(e.lay) || 0) * (Number(e.ratio) || 0);
          sumFabric += Number(e.fabric_used_kg) || 0;
          sumScrap += Number(e.cutting_scrap_weight_kg) || 0;
          
          if (e.marker_efficiency_percent) {
            sumEfficiency += Number(e.marker_efficiency_percent);
            validEfficiencyCount++;
          }
        });

        stat.totalLays = sumLays;
        stat.totalPieces = sumPieces;
        stat.totalFabricUsedKg = sumFabric;
        stat.totalCuttingScrapKg = sumScrap;
        stat.totalEntries = tEntries.length;
        stat.avgMarkerEfficiency = validEfficiencyCount > 0 ? (sumEfficiency / validEfficiencyCount) : 0;
        
        const latestEntry = sortedEntries[0];
        if (latestEntry) {
          stat.lastActiveBuyer = latestEntry.buyer || "Unknown";
          stat.lastActiveJob = latestEntry.job_no || "N/A";
          stat.lastActiveDate = latestEntry.entry_date;
          stat.isActive = true;
        }
      });

      return stats;
    } else {
      // Supervisor mode
      const supervisorMap = new Map<string, CuttingEntry[]>();
      filteredEntries.forEach(entry => {
        const sup = (entry.supervisor_name || "Unknown").trim();
        if (!supervisorMap.has(sup)) {
          supervisorMap.set(sup, []);
        }
        supervisorMap.get(sup)!.push(entry);
      });

      const stats: ProductionStats[] = [];
      supervisorMap.forEach((tEntries, supName) => {
        let sumLays = 0;
        let sumPieces = 0;
        let sumFabric = 0;
        let sumScrap = 0;
        let sumEfficiency = 0;
        let validEfficiencyCount = 0;

        const sortedEntries = [...tEntries].sort((a, b) => {
          const dateA = new Date(a.entry_date + "T00:00:00");
          const dateB = new Date(b.entry_date + "T00:00:00");
          return dateB.getTime() - dateA.getTime();
        });

        tEntries.forEach(e => {
          sumLays += Number(e.lay) || 0;
          sumPieces += (Number(e.lay) || 0) * (Number(e.ratio) || 0);
          sumFabric += Number(e.fabric_used_kg) || 0;
          sumScrap += Number(e.cutting_scrap_weight_kg) || 0;
          
          if (e.marker_efficiency_percent) {
            sumEfficiency += Number(e.marker_efficiency_percent);
            validEfficiencyCount++;
          }
        });

        const latestEntry = sortedEntries[0];

        stats.push({
          id: supName,
          name: supName,
          totalLays: sumLays,
          totalPieces: sumPieces,
          totalFabricUsedKg: sumFabric,
          totalCuttingScrapKg: sumScrap,
          avgMarkerEfficiency: validEfficiencyCount > 0 ? (sumEfficiency / validEfficiencyCount) : 0,
          totalEntries: tEntries.length,
          lastActiveBuyer: latestEntry ? (latestEntry.buyer || "Unknown") : "N/A",
          lastActiveJob: latestEntry ? (latestEntry.job_no || "N/A") : "N/A",
          lastActiveDate: latestEntry ? latestEntry.entry_date : "",
          isActive: true
        });
      });
      
      // Sort by total pieces descending
      return stats.sort((a, b) => b.totalPieces - a.totalPieces);
    }
  }, [filteredEntries, viewMode]);

  // Overall metrics & High performers
  const comparativeMetrics = useMemo(() => {
    const populatedTables = productionStatsList.filter(t => t.totalEntries > 0);
    
    // Sort by pieces cut
    const volumeLeader = populatedTables.length > 0 
      ? [...populatedTables].sort((a, b) => b.totalPieces - a.totalPieces)[0]
      : null;

    // Sort by avg efficiency
    const efficiencyLeader = populatedTables.length > 0
      ? [...populatedTables].sort((a, b) => b.avgMarkerEfficiency - a.avgMarkerEfficiency)[0]
      : null;

    // Total pieces across all tables
    const totalOutputPieces = productionStatsList.reduce((acc, t) => acc + t.totalPieces, 0);

    return {
      volumeLeader,
      efficiencyLeader,
      totalOutputPieces
    };
  }, [productionStatsList]);

  return (
    <div className="space-y-8 font-sans animate-fade-in">
      
      {/* Comparative Live Metrics Header / Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Pieces Cut across 7 Tables Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-blue-400">
              Floor Aggregate Output
            </span>
            <div className="text-2xl font-black font-mono">
              {comparativeMetrics.totalOutputPieces.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400">
              {viewMode === "table" ? "Total garments cut across all 7 operational tables" : "Total garments cut across all supervisors"}
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Zap size={20} className="animate-pulse" />
          </div>
        </div>

        {/* Volume Leader Scorecard */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Trophy size={11} /> Volume Leader
            </span>
            <div className="text-lg font-extrabold text-slate-850 dark:text-white max-w-[140px] truncate">
              {comparativeMetrics.volumeLeader ? comparativeMetrics.volumeLeader.name : "N/A"}
            </div>
            <p className="text-xs text-slate-500 font-mono">
              {comparativeMetrics.volumeLeader 
                ? `${comparativeMetrics.volumeLeader.totalPieces.toLocaleString()} Pcs Cut` 
                : "No data captured yet"}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Flame size={20} />
          </div>
        </div>

        {/* Efficiency Leader Scorecard */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <Award size={11} /> Efficiency Leader
            </span>
            <div className="text-lg font-extrabold text-slate-850 dark:text-white max-w-[140px] truncate">
              {comparativeMetrics.efficiencyLeader ? comparativeMetrics.efficiencyLeader.name : "N/A"}
            </div>
            <p className="text-xs text-slate-500 font-mono">
              {comparativeMetrics.efficiencyLeader 
                ? `${comparativeMetrics.efficiencyLeader.avgMarkerEfficiency.toFixed(1)}% Avg CAD` 
                : "No data captured yet"}
            </p>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Sparkles size={20} />
          </div>
        </div>

      </div>

      {/* Production Output Bar Share Distribution */}
      {comparativeMetrics.totalOutputPieces > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
          <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity size={14} className="text-blue-600" /> Output Share Distribution {viewMode === "table" ? "across 7 Tables" : "across Supervisors"}
          </h3>
          <div className="space-y-3">
            <div className="h-4 flex rounded-full overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800">
              {productionStatsList.map((stat, idx) => {
                const percentage = comparativeMetrics.totalOutputPieces > 0 
                  ? (stat.totalPieces / comparativeMetrics.totalOutputPieces) * 100 
                  : 0;
                
                if (percentage === 0) return null;

                const bgColors = [
                  "bg-blue-500", "bg-emerald-500", "bg-indigo-500", 
                  "bg-amber-500", "bg-purple-500", "bg-rose-500", "bg-cyan-500"
                ];

                return (
                  <div 
                    key={stat.id}
                    style={{ width: `${percentage}%` }}
                    className={`${bgColors[idx % bgColors.length]} transition-all duration-500`}
                    title={`${stat.name}: ${stat.totalPieces.toLocaleString()} Pcs (${percentage.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
            
            <div className="flex flex-wrap gap-4 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {productionStatsList.map((stat, idx) => {
                const percentage = comparativeMetrics.totalOutputPieces > 0 
                  ? (stat.totalPieces / comparativeMetrics.totalOutputPieces) * 100 
                  : 0;

                const borderColors = [
                  "border-blue-500", "border-emerald-500", "border-indigo-500", 
                  "border-amber-500", "border-purple-500", "border-rose-500", "border-cyan-500"
                ];

                return (
                  <div key={stat.id} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-xs border-2 ${borderColors[idx % borderColors.length]}`} />
                    <span>{stat.name}: {stat.totalPieces.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Grid of 7 Table Scorecards */}
      <div>
        <div className="border-b border-slate-150 dark:border-slate-800 pb-3 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-blue-500" />
              {viewMode === "table" ? "Operational Table Score Cards" : "Supervisor Performance Score Cards"} (Comparative Ledger)
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Real-time roll aggregation, marker efficiency ratings, and active cutting layouts. {dateRangeLabel && <span className="font-mono font-bold text-blue-600 dark:text-blue-400">({dateRangeLabel})</span>}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* View Mode Selectors */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/60 font-sans shadow-xs">
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Table-Wise
              </button>
              <button
                onClick={() => setViewMode("supervisor")}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "supervisor"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Supervisor-Wise
              </button>
            </div>

            {/* Timeframe Selectors */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/60 font-sans shadow-xs">
              <button
                onClick={() => setTimeFrame("daily")}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeFrame === "daily"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setTimeFrame("weekly")}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeFrame === "weekly"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setTimeFrame("monthly")}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeFrame === "monthly"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Monthly
              </button>
            </div>

            {/* Date Calendar Picker */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/60 h-9 shadow-xs">
              <button
                onClick={handlePrevDate}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer text-slate-600 dark:text-slate-400 flex items-center justify-center w-7 h-7"
                title="Previous Date"
              >
                <ChevronLeft size={14} className="stroke-[2.5]" />
              </button>
              
              <input
                type="date"
                value={activeSelectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs text-slate-900 dark:text-slate-200 font-bold focus:outline-none cursor-pointer px-1 w-28 text-center"
              />

              <button
                onClick={handleNextDate}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer text-slate-600 dark:text-slate-400 flex items-center justify-center w-7 h-7"
                title="Next Date"
              >
                <ChevronRight size={14} className="stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productionStatsList.map((stat) => {
            const hasData = stat.totalEntries > 0;
            const scrapPercent = stat.totalFabricUsedKg > 0 
              ? (stat.totalCuttingScrapKg / stat.totalFabricUsedKg) * 100 
              : 0;

            // Efficiency thresholds for colors
            const getEfficiencyColor = (eff: number) => {
              if (eff >= 82) return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30";
              if (eff >= 78) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30";
              return "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30";
            };

            const getProgressBarColor = (eff: number) => {
              if (eff >= 82) return "bg-emerald-500";
              if (eff >= 78) return "bg-amber-500";
              return "bg-rose-500";
            };

            return (
              <div 
                key={stat.id} 
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs transition-all hover:shadow-md hover:-translate-y-0.5 duration-200 flex flex-col justify-between ${
                  stat.isActive 
                    ? "border-slate-200 dark:border-slate-850" 
                    : "border-slate-100 dark:border-slate-850/40 opacity-75"
                }`}
              >
                <div>
                  {/* Scorecard Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-100 dark:bg-slate-950 rounded-lg flex items-center justify-center font-black text-xs text-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-slate-800">
                        {viewMode === "table" ? stat.id : stat.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-850 dark:text-white leading-none max-w-[140px] truncate">
                          {stat.name}
                        </h4>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider font-mono">
                          {viewMode === "table" ? `ID: TBL-0${stat.id}` : `Role: Supervisor`}
                        </span>
                      </div>
                    </div>

                    {/* Live/Idle indicator */}
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${stat.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-350"}`} />
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${stat.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                        {stat.isActive ? "LIVE" : "IDLE"}
                      </span>
                    </div>
                  </div>

                  {/* Primary Output Metric */}
                  <div className="mb-4">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider block">
                      Total Pieces Cut
                    </span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                      {stat.totalPieces.toLocaleString()}{" "}
                      <span className="text-xs font-extrabold text-slate-400 uppercase">Pcs</span>
                    </div>
                  </div>

                  {/* Secondary stats grid */}
                  <div className="grid grid-cols-2 gap-3 mb-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-semibold block">Total Lay Plies:</span>
                      <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">
                        {stat.totalLays} Lays
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Completed Cuts:</span>
                      <span className="font-mono font-extrabold text-slate-850 dark:text-slate-200">
                        {stat.totalEntries} Cuts
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Fabric Used:</span>
                      <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">
                        {stat.totalFabricUsedKg.toFixed(1)} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Cutting Scrap%:</span>
                      <span className="font-mono font-extrabold text-rose-500">
                        {scrapPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Efficiency gauge / progress bar */}
                  {hasData && (
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-400 uppercase tracking-wide">Marker CAD Efficiency</span>
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${getEfficiencyColor(stat.avgMarkerEfficiency)}`}>
                          {stat.avgMarkerEfficiency.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200/20 dark:border-slate-800">
                        <div 
                          style={{ width: `${stat.avgMarkerEfficiency}%` }} 
                          className={`h-full ${getProgressBarColor(stat.avgMarkerEfficiency)} transition-all duration-300`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Scorecard Footer */}
                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
                  {stat.isActive ? (
                    <div className="text-[10px] leading-tight space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Active Buyer:</span>
                        <span className="font-extrabold text-slate-700 dark:text-slate-300 uppercase max-w-[100px] truncate">
                          {stat.lastActiveBuyer}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Job Order:</span>
                        <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                          {stat.lastActiveJob}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Last Active:</span>
                        <span className="font-mono text-[9px] text-slate-500">
                          {stat.lastActiveDate}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1 py-1 bg-slate-50/50 dark:bg-slate-950/20 rounded-lg border border-slate-100 dark:border-slate-850/50">
                      <AlertCircle size={12} />
                      <span>No active runs in current cycle</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
