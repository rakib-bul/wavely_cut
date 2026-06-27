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
  const chartColors = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6"];

  // ==========================================
  // 1. MACHINE METRICS
  // ==========================================
  const machineMetrics = useMemo(() => {
    return machines.map(m => {
      const match = compiledEntries.filter(e => e.machine_id === m.id);
      const totalUsed = match.reduce((sum, e) => sum + (e.fabric_used_kg || 0), 0);
      const totalRemnant = match.reduce((sum, e) => sum + (parseFloat(e.remarks) || 0), 0);
      const cuttingScrape = match.reduce((sum, e) => sum + (e.cutting_scrap_weight_kg || 0), 0);
      const spreadingScrape = match.reduce((sum, e) => sum + (e.remnant_weight_kg || 0), 0);
      const markerScrap = match.reduce((sum, e) => sum + (e.actual_marker_scrap_kg || 0), 0);
      
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

  // Style details for labels to increase contrast:
  const axisLabelColor = "#334155";

  return (
    <div className="space-y-8 font-sans">
      
      {/* 1. MACHINE METRICS SECTION */}
      <section className="space-y-4">
        <div>
          <h3 className="font-sans font-extrabold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Cpu size={14} className="text-[#2563EB]" /> Machine Cutting Analytics Comparison
          </h3>
          <p className="text-sm text-slate-500 mt-1 font-medium">Comparing performance limits: Automatics vs Manual processes.</p>
        </div>

        {/* Machine Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {machineMetrics.map((mc, idx) => (
            <div key={mc.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/50 mb-4">
                <span className="font-sans font-extrabold text-sm text-slate-800 dark:text-slate-200">{mc.name}</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full px-2.5 py-1 font-extrabold uppercase tracking-wider">{mc.type} Line</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-450 dark:text-slate-500 block text-[9px] uppercase tracking-wider font-extrabold font-sans mb-1">Fabric Cuts</span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{mc.volume} Jobs</span>
                </div>
                <div>
                  <span className="text-slate-455 dark:text-slate-500 block text-[9px] uppercase tracking-wider font-extrabold font-sans mb-1">Processed</span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{mc.fabricUsed} kg</span>
                </div>
                <div>
                  <span className="text-slate-450 block text-[9px] uppercase tracking-wider font-extrabold font-sans mb-1">ETE Efficiency</span>
                  <span className="font-extrabold text-sm text-emerald-600">{mc.efficiency}%</span>
                </div>
                <div>
                  <span className="text-slate-455 dark:text-slate-500 block text-[9px] uppercase tracking-wider font-extrabold font-sans mb-1">Scrap Yield</span>
                  <span className="font-extrabold text-sm text-rose-600">{mc.scrapRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Machine Visual Comparison Charts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm min-w-0">
          <div className="mb-4">
            <h4 className="font-sans font-extrabold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Yield % vs Scrap Rate by Machine</h4>
          </div>
          <div className="h-72 min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={machineMetrics} margin={{ top: 10, left: -15, right: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.7)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} stroke="#E2E8F0" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} stroke="#E2E8F0" />
                <Tooltip wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter' }} contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: "12px", color: "#F8FAFC", boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px', fontWeight: 500 }} />
                <Bar dataKey="efficiency" name="ETE Physical Efficiency %" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="scrapRate" name="Actual Total Scrap %" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 2. BUYER ANALYTICS SECTION */}
      <section className="space-y-4">
        <div>
          <h3 className="font-sans font-extrabold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Award size={14} className="text-[#2563EB]" /> Buyer Accounts Yield Rankings
          </h3>
          <p className="text-sm text-slate-500 mt-1 font-medium">Yield and scrap rates broken down by business buyers.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Buyer Comparison Bar Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm min-w-0">
            <h4 className="font-sans font-extrabold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Total processed volume by partner (KG)</h4>
            <div className="h-72 min-w-0 min-h-0">
              {buyerMetrics.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No entries.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={buyerMetrics} margin={{ top: 10, left: -15, right: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.7)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} stroke="#E2E8F0" />
                    <YAxis tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} stroke="#E2E8F0" />
                    <Tooltip wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter' }} contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: "12px", color: "#F8FAFC" }} />
                    <Bar dataKey="used" name="Fabric Processed (KG)" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Buyer Data Details List Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-sans font-extrabold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Yield Summary Grid</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 font-extrabold text-[10px] uppercase tracking-wider pl-5">Buyer Partner</th>
                    <th className="p-4 font-extrabold text-[10px] uppercase tracking-wider">Cuts</th>
                    <th className="p-4 font-extrabold text-[10px] uppercase tracking-wider">Total Used</th>
                    <th className="p-4 font-extrabold text-[10px] uppercase tracking-wider">Scrap %</th>
                    <th className="p-4 font-extrabold text-right text-[10px] uppercase tracking-wider pr-5">ETE Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                  {buyerMetrics.map((bm,i) => (
                    <tr key={bm.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                      <td className="p-4 font-extrabold text-slate-800 dark:text-slate-200 pl-5">{bm.name}</td>
                      <td className="p-4 font-mono text-slate-500">{bm.count} jobs</td>
                      <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">{bm.used} kg</td>
                      <td className="p-4 font-mono text-rose-600 font-bold">{bm.scrapRate}%</td>
                      <td className="p-4 font-mono font-black text-right text-emerald-600 pr-5">{bm.efficiency}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FABRIC TYPE ANALYTICS */}
      <section className="space-y-4">
        <div>
          <h3 className="font-sans font-extrabold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Layers size={14} className="text-[#2563EB]" /> Fabric Quality & Stretch Classes
          </h3>
          <p className="text-sm text-slate-500 mt-1 font-medium">Investigating structural efficiency limits based on fabric blends (modal, fleece, cotton jersey).</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fabric table list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-sans font-extrabold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Blends & Weaves Statistics</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 font-extrabold text-[10px] uppercase tracking-wider pl-5">Fabric Blend Type</th>
                    <th className="p-4 font-extrabold text-[10px] uppercase tracking-wider">Quantity</th>
                    <th className="p-4 font-extrabold text-[10px] uppercase tracking-wider">Scrap Rate %</th>
                    <th className="p-4 font-extrabold text-right text-[10px] uppercase tracking-wider pr-5">Yield Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                  {fabricMetrics.map((fm,i) => (
                    <tr key={fm.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                      <td className="p-4 font-extrabold text-slate-800 dark:text-slate-200 pl-5">{fm.name}</td>
                      <td className="p-4 font-mono text-slate-500">{fm.used} kg</td>
                      <td className="p-4 font-mono text-rose-600 font-bold">{fm.scrapRate}%</td>
                      <td className="p-4 font-mono font-black text-right text-emerald-600 pr-5">{fm.efficiency}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fabric Efficiency Line Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm min-w-0">
            <h4 className="font-sans font-extrabold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">ETE yield vs Scrap Rate by knit quality</h4>
            <div className="h-72 min-w-0 min-h-0">
              {fabricMetrics.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No fabric data.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <LineChart data={fabricMetrics} margin={{ top: 10, left: -15, right: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.7)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} stroke="#E2E8F0" />
                    <YAxis tick={{ fontSize: 10, fill: axisLabelColor, fontWeight: 600 }} stroke="#E2E8F0" />
                    <Tooltip wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter' }} contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: "12px", color: "#F8FAFC" }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px', fontWeight: 500 }} />
                    <Line type="monotone" dataKey="efficiency" name="Yield Efficiency %" stroke="#2563EB" strokeWidth={3} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="scrapRate" name="Scrap Rate %" stroke="#DC2626" strokeWidth={3} />
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
