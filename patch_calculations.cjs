const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');

const search = `    if (fabricSaveLossKg !== null && e.fabric_used_kg) {`;
const repl = `    // Added for Booking vs Marker/Cut average
    const markerCons = (e.marker_consumption !== undefined && e.marker_consumption !== null) ? Number(e.marker_consumption) : null;
    const bookingVsMarker = (bookingCons !== null && markerCons !== null) ? (bookingCons - markerCons) : null;
    
    if (e.entry_date === latestDateStr) {
      if (bookingVsMarker !== null) {
        today_booking_vs_marker_sum += bookingVsMarker;
        today_booking_vs_marker_count++;
      }
      if (bookingVsCut !== null) {
        today_booking_vs_cut_sum += bookingVsCut;
        today_booking_vs_cut_count++;
      }
    }

    if (fabricSaveLossKg !== null && e.fabric_used_kg) {`;

code = code.replace(search, repl);

const searchVars = `  let today_fabric_save_loss_kg = 0;
  let today_fabric_used_for_save_loss = 0;`;
const replVars = `  let today_fabric_save_loss_kg = 0;
  let today_fabric_used_for_save_loss = 0;
  let today_booking_vs_marker_sum = 0;
  let today_booking_vs_marker_count = 0;
  let today_booking_vs_cut_sum = 0;
  let today_booking_vs_cut_count = 0;`;

code = code.replace(searchVars, replVars);

const searchExports = `    today_avg_size_ratio,
    total_fabric_save_loss_kg,`;
const replExports = `    today_avg_size_ratio,
    today_booking_vs_marker: today_booking_vs_marker_count > 0 ? today_booking_vs_marker_sum / today_booking_vs_marker_count : 0,
    today_booking_vs_cut: today_booking_vs_cut_count > 0 ? today_booking_vs_cut_sum / today_booking_vs_cut_count : 0,
    total_fabric_save_loss_kg,`;

code = code.replace(searchExports, replExports);

fs.writeFileSync('src/utils/calculations.ts', code);
