import React from "react";
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
  const targetEntries = entries.filter(e => e.status !== 'draft');

  // --- Aggregate Daily Fabric Usage & Scrap (for last 7 days) ---
  const dailyDataMap: { [date: string]: { date: string; used: number; scrap: number } } = {};
  targetEntries.forEach(e => {
    const d = e.entry_date;
    if (!dailyDataMap[d]) {
      dailyDataMap[d] = { date: d, used: 0, scrap: 0 };
    }
    dailyDataMap[d].used += e.fabric_used_kg || 0;
    dailyDataMap[d].scrap += e.cutting_scrap_weight_kg || 0;
  });
  const dailyData = Object.values(dailyDataMap)
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(-7); // Last 7 cutting dates

  // --- Aggregate Machine Performance ---
  const machinePerformances = machines.map(m => {
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

  // --- Aggregate Buyer Share ---
  const buyerDataMap: { [buyer: string]: { name: string; value: number } } = {};
  targetEntries.forEach(e => {
    const b = e.buyer.toUpperCase().trim();
    if (!buyerDataMap[b]) {
      buyerDataMap[b] = { name: b, value: 0 };
    }
    buyerDataMap[b].value += e.fabric_used_kg || 0;
  });
  const buyerColors = ["#6366f1", "#4f46e5", "#818cf8", "#4338ca", "#a5b4fc", "#312e81"];
  const buyerData = Object.values(buyerDataMap).map(b => ({
    name: b.name,
    value: parseFloat(b.value.toFixed(1))
  }));

  // --- Aggregate Fabric Types Analytics ---
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
  const fabricData = Object.values(fabricDataMap).map(f => ({
    name: f.name.length > 18 ? f.name.substring(0, 15) + "..." : f.name,
    quantity: parseFloat(f.quantity.toFixed(1)),
    efficiency: f.count > 0 ? parseFloat((f.avgEte / f.count).toFixed(1)) : 0
  }));

  return (
    <div className="space-y-6 font-sans">
      
      {/* Chart Row 1: Usage Trend & Machine Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Daily Usage BarChart */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-6 rounded-xl shadow-xs min-w-0">
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 dark:text-slate-555">
              Fabric Usage Timeline
            </h3>
            <p className="text-xs text-slate-500 mt-1">Gross Fabric Used and Scissor Scrap (KG)</p>
          </div>
          <div className="h-64 min-w-0 min-h-0">
            {dailyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No active entry history to plot.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={dailyData} margin={{ top: 10, left: -20, right: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(241, 245, 249, 0.5)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '11px', fontFamily: 'Inter' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="used" name="Fabric Used (KG)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="scrap" name="Cutting Scrap (KG)" fill="#fda4af" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
 
        {/* Machine Comparison line */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-6 rounded-xl shadow-xs min-w-0">
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 dark:text-slate-555">
              Machine Efficiency Compare
            </h3>
            <p className="text-xs text-slate-500 mt-1">Actual End-to-End physical cutting yield efficiency (%)</p>
          </div>
          <div className="h-64 min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={machinePerformances} margin={{ top: 10, left: -20, right: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(241, 245, 249, 0.5)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '11px', fontFamily: 'Inter' }} />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="efficiency" name="ETE Physical Efficiency (%)" fill="#818cf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="scrapRate" name="Scissor Scrap Weight %" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
 
      </div>
 
      {/* Chart Row 2: Buyer Distribution & Fabric Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Buyer Distribution pie chart */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-6 rounded-xl shadow-xs min-w-0">
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 dark:text-slate-555">
              Order Volume by Buyer (KG)
            </h3>
            <p className="text-xs text-slate-500 mt-1">Share of total fabrics processed through cutting floor</p>
          </div>
          <div className="h-64 flex flex-col md:flex-row items-center justify-around min-w-0 min-h-0">
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
                      <Tooltip formatter={(val) => `${val} KG`} contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Legend */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-2 self-start md:self-center">
                  {buyerData.map((item, index) => (
                    <div key={item.name} className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
                      <span 
                        className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" 
                        style={{ backgroundColor: buyerColors[index % buyerColors.length] }} 
                      />
                      <span className="font-medium truncate max-w-[100px]">{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
 
        {/* Fabric Type Efficiency */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-6 rounded-xl shadow-xs min-w-0">
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 dark:text-slate-555">
              Fabric Type Yield & ETE
            </h3>
            <p className="text-xs text-slate-500 mt-1">Average actual fabric yields by fabric material</p>
          </div>
          <div className="h-64 min-w-0 min-h-0">
            {fabricData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No active data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={fabricData} layout="vertical" margin={{ top: 10, left: 10, right: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="rgba(241, 245, 249, 0.5)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis type="category" dataKey="name" width={85} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="efficiency" name="Yield ETE-Efficiency (%)" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={11} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
 
      </div>
 
    </div>
  );
}
