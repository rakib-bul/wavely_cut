import React, { useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from "recharts";
import { CuttingEntry, Machine } from "../types";
import { Cpu, Scissors, Award, TrendingUp, Layers, HelpCircle, AlertCircle } from "lucide-react";

interface AnalyticsModuleProps {
  entries: CuttingEntry[];
  machines: Machine[];
}

export default function AnalyticsModule({ entries, machines }: AnalyticsModuleProps) {
  // Only compile analytics of committed/approved entries
  const compiledEntries = useMemo(() => entries.filter(e => e.status !== 'draft'), [entries]);

  // COLORS
  const chartColors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

  // ==========================================
  // 1. MACHINE METRICS
  // ==========================================
  const machineMetrics = useMemo(() => {
    return machines.map(m => {
      const match = compiledEntries.filter(e => e.machine_id === m.id);
      const totalUsed = match.reduce((sum, e) => sum + (e.fabric_used_kg || 0), 0);
      const totalRemnant = match.reduce((sum, e) => sum + (e.remnant_weight_kg || 0), 0);
      const cuttingScrape = match.reduce((sum, e) => sum + (e.cutting_scrap_weight_kg || 0), 0);
      const spreadingScrape = match.reduce((sum, e) => sum + (e.spreading_scrap_kg || 0), 0);
      const markerScrap = match.reduce((sum, e) => sum + (e.actual_marker_scrap_kg || 0), 0);
      
      const netSpanned = totalUsed - totalRemnant;
      const totalWaste = cuttingScrape + spreadingScrape + markerScrap;

      const avgEte = match.length > 0
        ? parseFloat((match.reduce((sum, e) => sum + (e.actual_physical_marker_efficiency_ete || 0), 0) / match.length).toFixed(1))
        : 0;

      const scrapRate = totalUsed > 0 
        ? parseFloat(((totalWaste / totalUsed) * 100).toFixed(1))
        : 0;

      return {
        id: m.id,
        name: m.machine_name,
        type: m.machine_type,
        fabricUsed: parseFloat(totalUsed.toFixed(1)),
        scrapWeight: parseFloat(totalWaste.toFixed(1)),
        scrapRate,
        efficiency: avgEte,
        volume: match.length
      };
    });
  }, [compiledEntries, machines]);

  // ==========================================
  // 2. BUYER METRICS
  // ==========================================
  const buyerMetrics = useMemo(() => {
    const map: { [buyer: string]: { name: string; used: number; scrap: number; eteSum: number; count: number } } = {};
    compiledEntries.forEach(e => {
      const b = e.buyer.toUpperCase().trim();
      if (!map[b]) {
        map[b] = { name: b, used: 0, scrap: 0, eteSum: 0, count: 0 };
      }
      const totalWaste = (e.cutting_scrap_weight_kg || 0) + (e.spreading_scrap_kg || 0) + (e.actual_marker_scrap_kg || 0);
      map[b].used += e.fabric_used_kg || 0;
      map[b].scrap += totalWaste;
      map[b].eteSum += e.actual_physical_marker_efficiency_ete || 0;
      map[b].count += 1;
    });

    return Object.values(map).map(item => ({
      name: item.name,
      used: parseFloat(item.used.toFixed(1)),
      scrap: parseFloat(item.scrap.toFixed(1)),
      scrapRate: item.used > 0 ? parseFloat(((item.scrap / item.used) * 100).toFixed(1)) : 0,
      efficiency: item.count > 0 ? parseFloat((item.eteSum / item.count).toFixed(1)) : 0,
      count: item.count
    })).sort((a,b) => b.used - a.used);
  }, [compiledEntries]);

  // ==========================================
  // 3. FABRIC TYPE YIELD METRICS
  // ==========================================
  const fabricMetrics = useMemo(() => {
    const map: { [type: string]: { name: string; used: number; scrap: number; eteSum: number; count: number } } = {};
    compiledEntries.forEach(e => {
      const f = e.fabric_type || "Knit Blend";
      if (!map[f]) {
        map[f] = { name: f, used: 0, scrap: 0, eteSum: 0, count: 0 };
      }
      const totalWaste = (e.cutting_scrap_weight_kg || 0) + (e.spreading_scrap_kg || 0) + (e.actual_marker_scrap_kg || 0);
      map[f].used += e.fabric_used_kg || 0;
      map[f].scrap += totalWaste;
      map[f].eteSum += e.actual_physical_marker_efficiency_ete || 0;
      map[f].count += 1;
    });

    return Object.values(map).map(item => ({
      name: item.name,
      used: parseFloat(item.used.toFixed(1)),
      scrap: parseFloat(item.scrap.toFixed(1)),
      scrapRate: item.used > 0 ? parseFloat(((item.scrap / item.used) * 100).toFixed(1)) : 0,
      efficiency: item.count > 0 ? parseFloat((item.eteSum / item.count).toFixed(1)) : 0,
      count: item.count
    })).sort((a,b) => b.used - a.used);
  }, [compiledEntries]);

  return (
    <div className="space-y-8">
      
      {/* 1. MACHINE METRICS SECTION */}
      <section className="space-y-4">
        <div>
          <h3 className="font-sans font-bold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Cpu size={14} className="text-slate-600" /> Machine cutting analytics comparison
          </h3>
          <p className="text-xs text-slate-500 mt-1">Comparing performance limits: Automatics vs Manual processes.</p>
        </div>

        {/* Machine Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {machineMetrics.map((mc, idx) => (
            <div key={mc.id} className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/50 mb-3.5">
                <span className="font-sans font-bold text-xs text-slate-700 dark:text-slate-300">{mc.name}</span>
                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded px-1.5 py-0.5 font-bold uppercase tracking-wider">{mc.type} Line</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400 dark:text-slate-550 block text-[9px] uppercase tracking-wider font-semibold font-sans mb-0.5">Fabric Cuts</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{mc.volume} Jobs</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-550 block text-[9px] uppercase tracking-wider font-semibold font-sans mb-0.5">Qty Processed</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{mc.fabricUsed} kg</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold font-sans mb-0.5">ETE Efficiency</span>
                  <span className="font-bold text-slate-700">{mc.efficiency}%</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-550 block text-[9px] uppercase tracking-wider font-semibold font-sans mb-0.5">Scrap Yield</span>
                  <span className="font-bold text-rose-500 dark:text-rose-400/90">{mc.scrapRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Machine Visual Comparison Charts */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-xl min-w-0">
          <div className="mb-4">
            <h4 className="font-sans font-semibold text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">Yield % vs Scrap Rate by Machine</h4>
          </div>
          <div className="h-64 min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={machineMetrics} margin={{ top: 10, left: -20, right: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(241, 245, 249, 0.5)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <Tooltip wrapperStyle={{ fontSize: '11px' }} contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px", color: "#f8fafc" }} />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="efficiency" name="ETE Physical Efficiency %" fill="#475569" radius={[4, 4, 0, 0]} />
                <Bar dataKey="scrapRate" name="Actual Total Scrap %" fill="#fda4af" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 2. BUYER ANALYTICS SECTION */}
      <section className="space-y-4">
        <div>
          <h3 className="font-sans font-bold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Award size={14} className="text-slate-600" /> Buyer Accounts Yield Rankings
          </h3>
          <p className="text-xs text-slate-500 mt-1">Yield and scrap rates broken down by business buyers.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Buyer Comparison Bar Chart */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-xl min-w-0">
            <h4 className="font-sans font-semibold text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Total processed volume by partner (KG)</h4>
            <div className="h-64 min-w-0 min-h-0">
              {buyerMetrics.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-550">No entries.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={buyerMetrics} margin={{ top: 10, left: -20, right: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(241, 245, 249, 0.5)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
                    <Tooltip wrapperStyle={{ fontSize: '11px' }} contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px", color: "#f8fafc" }} />
                    <Bar dataKey="used" name="Fabric Processed (KG)" fill="#64748b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Buyer Data Details List Table */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden text-xs">
            <div className="p-4 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/40">
              <span className="font-sans font-semibold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">Yield Summary Grid</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/30 dark:bg-slate-950 text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-3 font-semibold text-[10px] uppercase tracking-wider">Buyer Partner</th>
                  <th className="p-3 font-semibold text-[10px] uppercase tracking-wider">Cuts</th>
                  <th className="p-3 font-semibold text-[10px] uppercase tracking-wider">Total Used</th>
                  <th className="p-3 font-semibold text-[10px] uppercase tracking-wider">Scrap %</th>
                  <th className="p-3 font-semibold text-right text-[10px] uppercase tracking-wider">ETE Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                {buyerMetrics.map((bm,i) => (
                  <tr key={bm.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{bm.name}</td>
                    <td className="p-3 font-mono text-slate-400">{bm.count} jobs</td>
                    <td className="p-3 font-mono font-medium">{bm.used} kg</td>
                    <td className="p-3 font-mono text-rose-500 dark:text-rose-400">{bm.scrapRate}%</td>
                    <td className="p-3 font-mono font-bold text-right text-slate-700">{bm.efficiency}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 3. FABRIC TYPE ANALYTICS */}
      <section className="space-y-4">
        <div>
          <h3 className="font-sans font-bold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Layers size={14} className="text-slate-600" /> Fabric Quality & Stretch Classes
          </h3>
          <p className="text-xs text-slate-500 mt-1">Investigating structural efficiency limits based on fabric blends (modal, fleece, cotton jersey).</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fabric table list */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden text-xs">
            <div className="p-4 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/40">
              <span className="font-sans font-semibold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">Blends & Weaves Statistics</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/30 dark:bg-slate-950 text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-3 font-semibold text-[10px] uppercase tracking-wider">Fabric Blend Type</th>
                  <th className="p-3 font-semibold text-[10px] uppercase tracking-wider">Quantity</th>
                  <th className="p-3 font-semibold text-[10px] uppercase tracking-wider">Scrap Rate %</th>
                  <th className="p-3 font-semibold text-right text-[10px] uppercase tracking-wider">Yield Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                {fabricMetrics.map((fm,i) => (
                  <tr key={fm.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">{fm.name}</td>
                    <td className="p-3 font-mono text-slate-400">{fm.used} kg</td>
                    <td className="p-3 font-mono text-rose-500 dark:text-rose-400">{fm.scrapRate}%</td>
                    <td className="p-3 font-mono font-bold text-right text-slate-700">{fm.efficiency}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fabric Efficiency Radar/Line Chart */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-xl min-w-0">
            <h4 className="font-sans font-semibold text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">ETE yield vs Scrap Rate by knit quality</h4>
            <div className="h-64 min-w-0 min-h-0">
              {fabricMetrics.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-550">No fabric data.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <LineChart data={fabricMetrics} margin={{ top: 10, left: -20, right: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(241, 245, 249, 0.5)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
                    <Tooltip wrapperStyle={{ fontSize: '11px' }} contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px", color: "#f8fafc" }} />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="efficiency" name="Yield Efficiency %" stroke="#475569" activeDot={{ r: 6 }} strokeWidth={2} />
                    <Line type="monotone" dataKey="scrapRate" name="Scrap Rate %" stroke="#ec4899" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
