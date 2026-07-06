const fs = require('fs');
let code = fs.readFileSync('src/components/KPICards.tsx', 'utf8');

const dailyStart = `    "today-reject-qty",
    "today-fabric-save-loss-pct",
    "today-fabric-save-loss-kg",
    "daily-trend",`;
const dailyRepl = `    "today-reject-qty",
    "today-fabric-save-loss-pct",
    "today-fabric-save-loss-kg",
    "today-booking-vs-marker",
    "today-booking-vs-cut",
    "daily-trend",`;

code = code.replace(dailyStart, dailyRepl);

const cardsLoc = `    {
      id: "today-fabric-save-loss-kg",`;
const newCards = `    {
      id: "today-booking-vs-marker",
      title: "Today's Booking vs Marker",
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
      title: "Today's Booking vs Cut",
      amount: (metrics.today_booking_vs_cut || 0) >= 0
        ? "+" + (metrics.today_booking_vs_cut || 0).toFixed(3)
        : (metrics.today_booking_vs_cut || 0).toFixed(3),
      unit: "KG/Doz",
      desc: "Today's average difference between Booking Consumption and Cutting Consumption",
      icon: Scissors,
      color: (metrics.today_booking_vs_cut || 0) < 0 ? "text-rose-600 bg-rose-500/10" : "text-emerald-600 bg-emerald-500/10",
      statusText: (metrics.today_booking_vs_cut || 0) < 0 ? "Loss" : "Save",
      statusColor: (metrics.today_booking_vs_cut || 0) < 0 ? "bg-rose-500/15 text-rose-600 border-rose-500/20" : "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    },
    {
      id: "today-fabric-save-loss-kg",`;

code = code.replace(cardsLoc, newCards);
fs.writeFileSync('src/components/KPICards.tsx', code);
