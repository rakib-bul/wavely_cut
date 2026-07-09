import React, { useMemo } from "react";
import { formatDate } from "../utils/dateUtils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { CuttingEntry, Machine } from "../types";

interface DashboardChartsProps {
  entries: CuttingEntry[];
  machines: Machine[];
}

export default function DashboardCharts({ entries, machines }: DashboardChartsProps) {
  // Aggregate only APPROVED or recently submitted items for stable chart representation
  const targetEntries = useMemo(() => entries.filter(e => e.status !== 'draft'), [entries]);

  // --- Aggregate Daily Fabric Usage & Scrap (for last 7 days) ---
  const dailyData = useMemo(() => {
    const dailyDataMap: { [date: string]: { date: string; used: number; scrap: number } } = {};
    targetEntries.forEach(e => {
      const d = e.entry_date;
      if (!dailyDataMap[d]) {
        dailyDataMap[d] = { date: d, used: 0, scrap: 0 };
      }
      dailyDataMap[d].used += e.fabric_used_kg || 0;
      dailyDataMap[d].scrap += e.cutting_scrap_weight_kg || 0;
    });
    return Object.values(dailyDataMap)
      .sort((a,b) => a.date.localeCompare(b.date))
      .slice(-7); // Last 7 cutting dates
  }, [targetEntries]);

  // Helper to parse packed remnants data
  const parseRemarks = (remarks: string) => {
    if (!remarks) return { remnants_weight_kg: 0, reject_qty: 0, remnants_scrap_kg: 0 };
    const parts = remarks.split('|');
    return {
      remnants_weight_kg: parseFloat(parts[0]) || 0,
      reject_qty: parseFloat(parts[1]) || 0,
      remnants_scrap_kg: parseFloat(parts[2]) || 0,
    };
  };

  // --- Aggregate Daily Remnants Issued, Used & Scrap ---
  const remnantDailyData = useMemo(() => {
    const remnantDailyDataMap: { [date: string]: { date: string; issued: number; scrap: number; used: number } } = {};
    targetEntries.forEach(e => {
      const d = e.entry_date;
      if (!remnantDailyDataMap[d]) {
        remnantDailyDataMap[d] = { date: d, issued: 0, scrap: 0, used: 0 };
      }
      const parsed = parseRemarks(e.remarks || "");
      remnantDailyDataMap[d].issued += parsed.remnants_weight_kg;
      remnantDailyDataMap[d].scrap += parsed.remnants_scrap_kg;
      remnantDailyDataMap[d].used += Math.max(0, parsed.remnants_weight_kg - parsed.remnants_scrap_kg);
    });
    return Object.values(remnantDailyDataMap)
      .sort((a,b) => a.date.localeCompare(b.date))
      .slice(-7); // Last 7 cutting dates
  }, [targetEntries]);

  // --- Aggregate Machine Performance ---
  const machinePerformances = useMemo(() => {
    return machines.map(m => {
      const machineEntries = targetEntries.filter(e => e.machine_id === m.id);
      const totalFabric = machineEntries.reduce((sum, e) => sum + (e.fabric_used_kg || 0), 0);
      const totalScrap = machineEntries.reduce((sum, e) => sum + (e.cutting_scrap_weight_kg || 0), 0);
      const avgEteEff = machineEntries.length > 0
        ? parseFloat((machineEntries.reduce((sum, e) => sum + (e.actual_physical_marker_efficiency_ete || 0), 0) / machineEntries.length).toFixed(1))
        : 0;

      return {
        name: m.machine_name.replace(" Machine", "").replace("Cutter", "C."),
        fabricUsed: parseFloat(totalFabric.toFixed(1)),
        scrapRate: totalFabric > 0 ? parseFloat(((totalScrap / totalFabric) * 100).toFixed(2)) : 0,
        efficiency: avgEteEff
      };
    });
  }, [targetEntries, machines]);

  // --- Aggregate Buyer Share ---
  const buyerData = useMemo(() => {
    const buyerDataMap: { [buyer: string]: { name: string; value: number } } = {};
    targetEntries.forEach(e => {
      const b = e.buyer.toUpperCase().trim();
      if (!buyerDataMap[b]) {
        buyerDataMap[b] = { name: b, value: 0 };
      }
      buyerDataMap[b].value += e.fabric_used_kg || 0;
    });
    return Object.values(buyerDataMap).map(b => ({
      name: b.name,
      value: parseFloat(b.value.toFixed(1))
    }));
  }, [targetEntries]);

  const buyerColors = ["#2563EB", "#3B82F6", "#60A5FA", "#1D4ED8", "#93C5FD", "#1E3A8A"];

  // --- Aggregate Fabric Types Analytics ---
  const fabricData = useMemo(() => {
    const fabricDataMap: { [type: string]: { name: string; quantity: number; avgEte: number; count: number } } = {};
    targetEntries.forEach(e => {
      const f = e.fabric_type || "Knit Blend";
      if (!fabricDataMap[f]) {
        fabricDataMap[f] = { name: f, quantity: 0, avgEte: 0, count: 0 };
      }
      fabricDataMap[f].quantity += e.fabric_used_kg || 0;
      fabricDataMap[f].avgEte += e.actual_physical_marker_efficiency_ete || 0;
      fabricDataMap[f].count += 1;
    });
    return Object.values(fabricDataMap).map(f => ({
      name: f.name.length > 18 ? f.name.substring(0, 15) + "..." : f.name,
      quantity: parseFloat(f.quantity.toFixed(1)),
      efficiency: f.count > 0 ? parseFloat((f.avgEte / f.count).toFixed(1)) : 0
    }));
  }, [targetEntries]);

  // Style details for labels to increase contrast:
  // Using slate-700 (#334155) for dark, readable text.
  const axisLabelColor = "#334155";
  const darkAxisLabelColor = "#94A3B8";

  return (
    <div className="space-y-6 font-sans">
      
      {/* Chart Rows: Usage, Machine, Buyer & Fabric Analytics (Flexible grid responsive to 2K/4K high-res monitors) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 3xl:grid-cols-4 gap-6">
        
        {/* Daily Usage BarChart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm min-w-0">
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Fabric Usage Timeline
            </h3>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">Gross Fabric Used vs. Cutting Scrap (KG)</p>
          </div>
          <div className="h-68 min-w-0 min-h-0">
            {dailyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No active entry history to plot.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={dailyData} margin={{ top: 10, left: -15, right: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.7)" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => formatDate(val)}
                    tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} 
                    stroke="#E2E8F0"
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} 
                    stroke="#E2E8F0"
                  />
                  <Tooltip 
                    labelFormatter={(val) => formatDate(val)}
                    contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '12px', color: '#F8FAFC', fontSize: '11px', fontFamily: 'Inter', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px', fontWeight: 500 }} />
                  <Bar dataKey="used" name="Fabric Yield Input (KG)" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="scrap" name="Cutting Scrap (KG)" fill="#DC2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
 
        {/* Machine Comparison bar chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm min-w-0">
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Machine Performance Compare
            </h3>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">Actual End-to-End Yield vs. Scrap Rate (%)</p>
          </div>
          <div className="h-68 min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={machinePerformances} margin={{ top: 10, left: -15, right: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.7)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} 
                  stroke="#E2E8F0"
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} 
                  stroke="#E2E8F0"
                />
                <Tooltip 
                  contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '12px', color: '#F8FAFC', fontSize: '11px', fontFamily: 'Inter', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }} 
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px', fontWeight: 500 }} />
                <Bar dataKey="efficiency" name="ETE Physical Yield (%)" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="scrapRate" name="Scrap Rate (%)" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
 
        {/* Buyer Distribution pie chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm min-w-0">
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Order Volume by Buyer (KG)
            </h3>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">Share of total fabrics processed through cutting floor</p>
          </div>
          <div className="h-68 flex flex-col md:flex-row items-center justify-around min-w-0 min-h-0">
            {buyerData.length === 0 ? (
              <div className="text-xs text-slate-400">No active data.</div>
            ) : (
              <>
                <div className="h-full w-full md:w-1/2 min-w-0 min-h-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={buyerData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {buyerData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={buyerColors[index % buyerColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val) => `${val} KG`} 
                        contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '12px', color: '#F8FAFC', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Legend */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-2 self-start md:self-center">
                  {buyerData.map((item, index) => (
                    <div key={item.name} className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300">
                      <span 
                        className="w-3 h-3 rounded-md inline-block shrink-0" 
                        style={{ backgroundColor: buyerColors[index % buyerColors.length] }} 
                      />
                      <span className="font-semibold truncate max-w-[120px]">{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
 
        {/* Fabric Type Efficiency */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm min-w-0">
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Fabric Type Yield & ETE
            </h3>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">Average actual fabric yields by fabric material</p>
          </div>
          <div className="h-68 min-w-0 min-h-0">
            {fabricData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No active data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={fabricData} layout="vertical" margin={{ top: 10, left: 15, right: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="rgba(226, 232, 240, 0.7)" />
                  <XAxis 
                    type="number" 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} 
                    stroke="#E2E8F0"
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={90} 
                    tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} 
                    stroke="#E2E8F0"
                  />
                  <Tooltip 
                    contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '12px', color: '#F8FAFC', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px', fontWeight: 500 }} />
                  <Bar dataKey="efficiency" name="Yield ETE-Efficiency (%)" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Remnants Performance BarChart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm min-w-0 col-span-1 lg:col-span-2">
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Remnant Fabric Performance Timeline
            </h3>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">Remnants Issued vs. Used vs. Scrap (KG) - Last 7 Active Days</p>
          </div>
          <div className="h-68 min-w-0 min-h-0">
            {remnantDailyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No active remnants history to plot.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={remnantDailyData} margin={{ top: 10, left: -15, right: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.7)" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => formatDate(val)}
                    tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} 
                    stroke="#E2E8F0"
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} 
                    stroke="#E2E8F0"
                  />
                  <Tooltip 
                    labelFormatter={(val) => formatDate(val)}
                    contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '12px', color: '#F8FAFC', fontSize: '11px', fontFamily: 'Inter', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px', fontWeight: 500 }} />
                  <Bar dataKey="issued" name="Remnants Issued (KG)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="used" name="Remnants Fabric Used (KG)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="scrap" name="Remnant Scrap (KG)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
 
      </div>
 
    </div>
  );
}
