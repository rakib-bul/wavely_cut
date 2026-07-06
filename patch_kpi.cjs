const fs = require('fs');
let code = fs.readFileSync('src/components/KPICards.tsx', 'utf8');

const newTotalKpis = `
    {
      id: "total-fabric-save-loss-pct",
      title: "Cumulative Fabric Save/Loss",
      amount: (metrics.total_fabric_save_loss_percent || 0) >= 0 
        ? "+" + (metrics.total_fabric_save_loss_percent || 0).toFixed(1) 
        : (metrics.total_fabric_save_loss_percent || 0).toFixed(1),
      unit: "%",
      desc: "Overall percentage of fabric saved or lost vs booking consumption",
      icon: Percent,
      color: (metrics.total_fabric_save_loss_percent || 0) < 0 ? "text-rose-600 bg-rose-500/10" : "text-emerald-600 bg-emerald-500/10",
      statusText: (metrics.total_fabric_save_loss_percent || 0) < 0 ? "Loss" : "Save",
      statusColor: (metrics.total_fabric_save_loss_percent || 0) < 0 ? "bg-rose-500/15 text-rose-600 border-rose-500/20" : "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    },
    {
      id: "total-fabric-save-loss-kg",
      title: "Cumulative Fabric Save/Loss",
      amount: (metrics.total_fabric_save_loss_kg || 0) >= 0 
        ? "+" + (metrics.total_fabric_save_loss_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : (metrics.total_fabric_save_loss_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Overall weight of fabric saved or lost vs booking consumption",
      icon: Weight,
      color: (metrics.total_fabric_save_loss_kg || 0) < 0 ? "text-rose-600 bg-rose-500/10" : "text-emerald-600 bg-emerald-500/10",
      statusText: (metrics.total_fabric_save_loss_kg || 0) < 0 ? "Loss" : "Save",
      statusColor: (metrics.total_fabric_save_loss_kg || 0) < 0 ? "bg-rose-500/15 text-rose-600 border-rose-500/20" : "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    },
    {
      id: "today-fabric-save-loss-pct",
      title: "Today's Fabric Save/Loss",
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
      title: "Today's Fabric Save/Loss",
      amount: (metrics.today_fabric_save_loss_kg || 0) >= 0 
        ? "+" + (metrics.today_fabric_save_loss_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : (metrics.today_fabric_save_loss_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      unit: "KG",
      desc: "Today's weight of fabric saved or lost vs booking consumption",
      icon: Weight,
      color: (metrics.today_fabric_save_loss_kg || 0) < 0 ? "text-rose-600 bg-rose-500/10" : "text-emerald-600 bg-emerald-500/10",
      statusText: (metrics.today_fabric_save_loss_kg || 0) < 0 ? "Loss" : "Save",
      statusColor: (metrics.today_fabric_save_loss_kg || 0) < 0 ? "bg-rose-500/15 text-rose-600 border-rose-500/20" : "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    }
  ];`;
  
code = code.replace("  ];\n  // Group filter logic", newTotalKpis + "\n  // Group filter logic");

// Also need to add to dailyKeys
const searchDailyKeys = `"today-reject-qty",`;
const newDailyKeys = `"today-reject-qty",
    "today-fabric-save-loss-pct",
    "today-fabric-save-loss-kg",`;
code = code.replace(searchDailyKeys, newDailyKeys);

// Also add to monthly KPIs:
const searchMonthly = `["month-total", "total-lots", "total-layers", "total-used-inch"].includes(kpi.id)`;
const newMonthly = `["month-total", "total-lots", "total-layers", "total-used-inch", "total-fabric-save-loss-pct", "total-fabric-save-loss-kg"].includes(kpi.id)`;
code = code.replace(searchMonthly, newMonthly);

fs.writeFileSync('src/components/KPICards.tsx', code);
