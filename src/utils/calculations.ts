import { CuttingEntry } from '../types';

export function getCurrentProductionDateAndShift() {
  const now = new Date();
  const hours = now.getHours();
  let shift = "A"; 
  let prodDate = new Date(now);
  
  if (hours >= 0 && hours < 8) {
    prodDate.setDate(prodDate.getDate() - 1);
    shift = "B";
  } else if (hours >= 20 && hours <= 23) {
    shift = "B";
  }
  
  const year = prodDate.getFullYear();
  const month = String(prodDate.getMonth() + 1).padStart(2, '0');
  const day = String(prodDate.getDate()).padStart(2, '0');
  
  return {
    entry_date: `${year}-${month}-${day}`,
    shift
  };
}

/**
 * Perform automatic industrial calculations on a CuttingEntry.
 * Returns the entry populated with the calculated fields.
 */
export function calculateFields(entry: Omit<CuttingEntry, 'total_length_inch' | 'total_used_fabric_inch' | 'spreading_scrap_kg' | 'scrap_percent_per_marker' | 'cutting_scrap_percent' | 'deviation_percent' | 'efficiency_gap' | 'actual_marker_scrap_kg' | 'actual_marker_scrap_percent' | 'actual_physical_marker_efficiency_ete'>): CuttingEntry {
  const lay = Number(entry.lay) || 0;
  const marker_length_inch = Number(entry.marker_length_inch) || 0;
  const fabric_used_kg = Number(entry.fabric_used_kg) || 0;
  // Remarks field now maps to Remnant Kg
  const remnant_weight_kg = parseFloat(entry.remarks) || 0;
  const cutting_scrap_weight_kg = Number(entry.cutting_scrap_weight_kg) || 0;
  const marker_efficiency_percent = Number(entry.marker_efficiency_percent) || 0;

  // 1. Total Marker Length (inch) = Lay * Marker Length Inch
  const total_length_inch = parseFloat((lay * marker_length_inch).toFixed(2));

  // 2. Total Fabric Used (Inch) = (Lay * Marker Length Inch * Marker Efficiency/100)
  const total_used_fabric_inch = parseFloat((lay * marker_length_inch * (marker_efficiency_percent / 100)).toFixed(2));

  // 3. Spreading Scrap (KG)
  // Maps to the remnant_weight_kg input field (labeled as Spreading Scrap(KG))
  // If empty or 0, fallback to 2.5% estimation
  const spreading_scrap_kg = Number(entry.remnant_weight_kg) > 0
    ? Number(entry.remnant_weight_kg)
    : parseFloat((fabric_used_kg * 0.025).toFixed(3));

  // 4. Scrap % As Per Marker = 100 - Marker Efficiency
  const scrap_percent_per_marker = parseFloat((100 - marker_efficiency_percent).toFixed(2));

  // 5. Cutting Scrap %
  const cutting_scrap_percent = fabric_used_kg > 0
    ? parseFloat(((cutting_scrap_weight_kg / fabric_used_kg) * 100).toFixed(2))
    : 0;

  // 6. Actual Marker Scrap (KG) (Replaced by Remnants)
  const net_fabric_kg = Math.max(0, fabric_used_kg - remnant_weight_kg - spreading_scrap_kg);
  const actual_marker_scrap_kg = remnant_weight_kg;

  // 7. Actual Marker Scrap % (Replaced by Remnants %)
  const actual_marker_scrap_percent = fabric_used_kg > 0
    ? parseFloat(((actual_marker_scrap_kg / fabric_used_kg) * 100).toFixed(2))
    : 0;

  // 8. Actual Pattern Garment Weight (usable weight of final pattern cutouts)
  const actual_garment_weight_kg = Math.max(0, net_fabric_kg - cutting_scrap_weight_kg);

  // 9. Actual Physical Marker Efficiency (ETE - End to End)
  // ETE = 1 - Actual Marker/ Cutting Scrap (KG) divided by Total Fabric Used in KG (in %)
  const actual_physical_marker_efficiency_ete = fabric_used_kg > 0
    ? parseFloat(((1 - (cutting_scrap_weight_kg / fabric_used_kg)) * 100).toFixed(2))
    : 0;

  // 10. Efficiency Gap
  const efficiency_gap = parseFloat((marker_efficiency_percent - actual_physical_marker_efficiency_ete).toFixed(2));

  // 11. Deviation %
  // Deviation represents actual total scrap versus the theoretical scrap rate.
  const total_scrap_weight = spreading_scrap_kg + cutting_scrap_weight_kg + actual_marker_scrap_kg;
  const theoretical_scrap_weight = fabric_used_kg * ((100 - marker_efficiency_percent) / 100);
  const deviation_percent = theoretical_scrap_weight > 0
    ? parseFloat((((total_scrap_weight - theoretical_scrap_weight) / theoretical_scrap_weight) * 100).toFixed(2))
    : 0;

  return {
    ...entry,
    total_length_inch,
    total_used_fabric_inch,
    spreading_scrap_kg,
    scrap_percent_per_marker,
    cutting_scrap_percent,
    actual_marker_scrap_kg,
    actual_marker_scrap_percent,
    actual_physical_marker_efficiency_ete,
    efficiency_gap,
    deviation_percent
  } as CuttingEntry;
}

/**
 * Summarize statistics across multiple CuttingEntries.
 */
export function compileDashboardKPIs(entries: CuttingEntry[], selectedDate?: string) {
  const approved = entries.filter(e => e.status === 'approved');
  const targetEntries = approved.length > 0 ? approved : entries; // fallback if none approved

  const total_fabric_used = targetEntries.reduce((acc, current) => acc + (current.fabric_used_kg || 0), 0);
  const total_remnant = targetEntries.reduce((acc, current) => acc + (parseFloat(current.remarks) || 0), 0);
  const total_cutting_scrap = targetEntries.reduce((acc, current) => acc + (current.cutting_scrap_weight_kg || 0), 0);
  const total_spreading_scrap = targetEntries.reduce((acc, current) => acc + (current.remnant_weight_kg || 0), 0);
  const total_marker_scrap = targetEntries.reduce((acc, current) => acc + (current.actual_marker_scrap_kg || 0), 0);

  // Helper inside to parse packed remnants data
  const parseRemarks = (remarks: string) => {
    if (!remarks) return { remnants_weight_kg: 0, reject_qty: 0, remnants_scrap_kg: 0 };
    const parts = remarks.split('|');
    return {
      remnants_weight_kg: parseFloat(parts[0]) || 0,
      reject_qty: parseFloat(parts[1]) || 0,
      remnants_scrap_kg: parseFloat(parts[2]) || 0,
    };
  };

  // Detailed remnants stats across entries
  let total_remnants_issued = 0;
  let total_remnants_scrap_kg = 0;
  let total_remnants_used_kg = 0;
  let total_reject_qty = 0;

  targetEntries.forEach(e => {
    const parsed = parseRemarks(e.remarks || "");
    total_remnants_issued += parsed.remnants_weight_kg;
    total_remnants_scrap_kg += parsed.remnants_scrap_kg;
    total_remnants_used_kg += Math.max(0, parsed.remnants_weight_kg - parsed.remnants_scrap_kg);
    total_reject_qty += parsed.reject_qty;
  });

  const remnants_issued_percent = total_fabric_used > 0 ? (total_remnants_issued / total_fabric_used) * 100 : 0;
  const remnants_scrap_percent = total_remnants_issued > 0 ? (total_remnants_scrap_kg / total_remnants_issued) * 100 : 0;
  const remnants_utilization_percent = total_remnants_issued > 0 ? (total_remnants_used_kg / total_remnants_issued) * 100 : 100;

  // Total fabric spread = total used - remnants
  const total_fabric_spread = Math.max(0, total_fabric_used - total_remnants_issued);

  // Remnant utilization = percentage of fabric that wasn't remnants
  const remnant_utilization = total_fabric_used > 0
    ? parseFloat((((total_fabric_used - total_remnants_issued) / total_fabric_used) * 100).toFixed(1))
    : 100;

  // Average Theoretical Efficiency
  const avg_maker_efficiency_provided = targetEntries.length > 0
    ? parseFloat((targetEntries.reduce((acc, current) => acc + (current.marker_efficiency_percent || 0), 0) / targetEntries.length).toFixed(1))
    : 0;

  // Average ETE Efficiency
  const avg_ete_efficiency = targetEntries.length > 0
    ? parseFloat((targetEntries.reduce((acc, current) => acc + (current.actual_physical_marker_efficiency_ete || 0), 0) / targetEntries.length).toFixed(1))
    : 0;

  const efficiency_gap = parseFloat((avg_maker_efficiency_provided - avg_ete_efficiency).toFixed(1));

  // --- Date-wise Calculations ---
  const dates = targetEntries.map(e => e.entry_date).filter(Boolean);
  const uniqueSortedDates = Array.from(new Set(dates)).sort();
  const latestDateStr = selectedDate || (uniqueSortedDates.length > 0 ? uniqueSortedDates[uniqueSortedDates.length - 1] : getCurrentProductionDateAndShift().entry_date);
  
  const latestIndex = uniqueSortedDates.indexOf(latestDateStr);
  const yesterdayDateStr = latestIndex > 0 ? uniqueSortedDates[latestIndex - 1] : null;
  const currentMonthYear = latestDateStr.slice(0, 7); // "YYYY-MM"

  // Filter entries
  const todayEntries = targetEntries.filter(e => e.entry_date === latestDateStr);
  const yesterdayEntries = yesterdayDateStr ? targetEntries.filter(e => e.entry_date === yesterdayDateStr) : [];
  const monthEntries = targetEntries.filter(e => e.entry_date && e.entry_date.startsWith(currentMonthYear));

  // Today metrics
  const today_fabric_used = todayEntries.reduce((acc, c) => acc + (c.fabric_used_kg || 0), 0);
  const today_cut_qty = todayEntries.reduce((acc, c) => acc + ((Number(c.lay) || 0) * (Number(c.ratio) || 0)), 0);

  // Yesterday metrics
  const yesterday_cut_qty = yesterdayEntries.reduce((acc, c) => acc + ((Number(c.lay) || 0) * (Number(c.ratio) || 0)), 0);

  // Daily Trend calculation (Today vs Yesterday)
  let daily_trend_percent = 0;
  if (yesterday_cut_qty > 0) {
    daily_trend_percent = parseFloat((((today_cut_qty - yesterday_cut_qty) / yesterday_cut_qty) * 100).toFixed(1));
  } else if (today_cut_qty > 0) {
    daily_trend_percent = 100;
  }

  // Monthly metrics
  const month_cut_qty = monthEntries.reduce((acc, c) => acc + ((Number(c.lay) || 0) * (Number(c.ratio) || 0)), 0);
  const month_fabric_used = monthEntries.reduce((acc, c) => acc + (c.fabric_used_kg || 0), 0);

  // Daily Average Cut Qty
  const total_days = uniqueSortedDates.length || 1;
  const total_overall_cut_qty = targetEntries.reduce((acc, c) => acc + ((Number(c.lay) || 0) * (Number(c.ratio) || 0)), 0);
  const daily_avg_cut_qty = parseFloat((total_overall_cut_qty / total_days).toFixed(0));

  // Recent 7-day average ETE efficiency
  const last7Dates = uniqueSortedDates.slice(-7);
  const recent7DayEntries = targetEntries.filter(e => last7Dates.includes(e.entry_date));
  const recent_ete_efficiency = recent7DayEntries.length > 0
    ? parseFloat((recent7DayEntries.reduce((acc, c) => acc + (c.actual_physical_marker_efficiency_ete || 0), 0) / recent7DayEntries.length).toFixed(1))
    : 0;

  // Today's specific metrics requested for Daily Dashboard group
  const today_lay_layers = todayEntries.reduce((acc, c) => acc + (Number(c.lay) || 0), 0);
  const today_total_ratio = todayEntries.reduce((acc, c) => acc + (Number(c.ratio) || 0), 0);

  let today_remnants_issued = 0;
  let today_remnants_scrap_kg = 0;
  let today_remnants_used_kg = 0;
  let today_reject_qty = 0;

  todayEntries.forEach(e => {
    const parsed = parseRemarks(e.remarks || "");
    today_remnants_issued += parsed.remnants_weight_kg;
    today_remnants_scrap_kg += parsed.remnants_scrap_kg;
    today_remnants_used_kg += Math.max(0, parsed.remnants_weight_kg - parsed.remnants_scrap_kg);
    today_reject_qty += parsed.reject_qty;
  });

  const today_remnants_issued_percent = today_fabric_used > 0 ? (today_remnants_issued / today_fabric_used) * 100 : 0;
  const today_remnants_scrap_percent = today_remnants_issued > 0 ? (today_remnants_scrap_kg / today_remnants_issued) * 100 : 0;
  const today_remnants_utilization_percent = today_remnants_issued > 0 ? (today_remnants_used_kg / today_remnants_issued) * 100 : 100;

  const today_fabric_spread = Math.max(0, today_fabric_used - today_remnants_issued);
  const today_spreading_scrap = todayEntries.reduce((acc, c) => acc + (Number(c.remnant_weight_kg) || 0), 0);
  const today_cutting_scrap = todayEntries.reduce((acc, c) => acc + (Number(c.cutting_scrap_weight_kg) || 0), 0);

  // Overall sums requested for extra KPI cards
  const total_cutting_lots = targetEntries.length;
  const total_lay_layers = targetEntries.reduce((sum, e) => sum + (Number(e.lay) || 0), 0);
  const total_cutting_qty = targetEntries.reduce((sum, e) => sum + ((Number(e.lay) || 0) * (Number(e.ratio) || 0)), 0);
  const total_used_fabric_inch = targetEntries.reduce((acc, c) => acc + (Number(c.total_used_fabric_inch) || (Number(c.lay) || 0) * (Number(c.marker_length_inch) || 0) * ((Number(c.marker_efficiency_percent) || 0) / 100)), 0);

  // --- Fabric Save/Loss Calculations ---
  let total_fabric_save_loss_kg = 0;
  let total_fabric_used_for_save_loss = 0;
  
  let today_fabric_save_loss_kg = 0;
  let today_fabric_used_for_save_loss = 0;
  let today_booking_vs_marker_sum = 0;
  let today_booking_vs_marker_count = 0;
  let today_booking_vs_cut_sum = 0;
  let today_booking_vs_cut_count = 0;

  targetEntries.forEach(e => {
    const totalCutQty = (Number(e.lay) || 0) * (Number(e.ratio) || 0);
    const bookingCons = (e.booking_consumption !== undefined && e.booking_consumption !== null) ? Number(e.booking_consumption) : null;
    const cuttingCons = totalCutQty > 0 ? (Number(e.fabric_used_kg) / totalCutQty) * 12 : null;
    const bookingVsCut = (bookingCons !== null && cuttingCons !== null) ? (bookingCons - cuttingCons) : null;
    const fabricSaveLossPct = (bookingCons && bookingVsCut !== null) ? (bookingVsCut / bookingCons) * 100 : null;
    const fabricSaveLossKg = (fabricSaveLossPct !== null && e.fabric_used_kg) ? Number(e.fabric_used_kg) * (fabricSaveLossPct / 100) : null;

    // Added for Booking vs Marker/Cut average
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

    if (fabricSaveLossKg !== null && e.fabric_used_kg) {
      total_fabric_save_loss_kg += fabricSaveLossKg;
      total_fabric_used_for_save_loss += Number(e.fabric_used_kg);
      
      if (e.entry_date === latestDateStr) {
        today_fabric_save_loss_kg += fabricSaveLossKg;
        today_fabric_used_for_save_loss += Number(e.fabric_used_kg);
      }
    }
  });

  const total_fabric_save_loss_percent = total_fabric_used_for_save_loss > 0 
    ? (total_fabric_save_loss_kg / total_fabric_used_for_save_loss) * 100 
    : 0;
    
  const today_fabric_save_loss_percent = today_fabric_used_for_save_loss > 0 
    ? (today_fabric_save_loss_kg / today_fabric_used_for_save_loss) * 100 
    : 0;

  // Average Size Ratio across all target entries
  const avg_size_ratio = targetEntries.length > 0
    ? parseFloat((targetEntries.reduce((sum, e) => sum + (Number(e.ratio) || 0), 0) / targetEntries.length).toFixed(1))
    : 0;

  // Today's average size ratio
  const today_avg_size_ratio = todayEntries.length > 0
    ? parseFloat((todayEntries.reduce((sum, e) => sum + (Number(e.ratio) || 0), 0) / todayEntries.length).toFixed(1))
    : 0;

  // Today's average marker efficiency (Achieved Marker Efficiency)
  const today_avg_marker_efficiency = todayEntries.length > 0
    ? parseFloat((todayEntries.reduce((sum, e) => sum + (Number(e.marker_efficiency_percent) || 0), 0) / todayEntries.length).toFixed(1))
    : 0;

  return {
    total_fabric_used: parseFloat(total_fabric_used.toFixed(1)),
    total_fabric_spread: parseFloat(total_fabric_spread.toFixed(1)),
    total_cutting_scrap: parseFloat(total_cutting_scrap.toFixed(1)),
    total_spreading_scrap: parseFloat(total_spreading_scrap.toFixed(1)),
    total_marker_scrap: parseFloat(total_marker_scrap.toFixed(1)),
    avg_maker_efficiency_provided,
    avg_ete_efficiency,
    remnant_utilization,
    efficiency_gap,
    // Remnants detailed totals
    total_remnants_issued: parseFloat(total_remnants_issued.toFixed(1)),
    total_remnants_scrap_kg: parseFloat(total_remnants_scrap_kg.toFixed(1)),
    total_remnants_used_kg: parseFloat(total_remnants_used_kg.toFixed(1)),
    total_reject_qty,
    remnants_issued_percent,
    remnants_scrap_percent,
    remnants_utilization_percent,
    // New Datewise KPIs
    latestDateStr,
    today_fabric_used: parseFloat(today_fabric_used.toFixed(1)),
    today_cut_qty,
    yesterday_cut_qty,
    daily_trend_percent,
    month_cut_qty,
    month_fabric_used: parseFloat(month_fabric_used.toFixed(1)),
    daily_avg_cut_qty,
    recent_ete_efficiency,
    // Today-specific detailed metrics
    today_lay_layers,
    today_total_ratio,
    today_remnants: parseFloat(today_remnants_issued.toFixed(1)),
    today_remnants_issued: parseFloat(today_remnants_issued.toFixed(1)),
    today_remnants_scrap_kg: parseFloat(today_remnants_scrap_kg.toFixed(1)),
    today_remnants_used_kg: parseFloat(today_remnants_used_kg.toFixed(1)),
    today_reject_qty,
    today_remnants_issued_percent,
    today_remnants_scrap_percent,
    today_remnants_utilization_percent,
    today_fabric_spread: parseFloat(today_fabric_spread.toFixed(1)),
    today_spreading_scrap: parseFloat(today_spreading_scrap.toFixed(1)),
    today_cutting_scrap: parseFloat(today_cutting_scrap.toFixed(1)),
    today_cutting_lots: todayEntries.length,
    // Overall totals for new KPI cards
    total_cutting_lots,
    total_lay_layers,
    total_cutting_qty,
    total_used_fabric_inch,
    avg_size_ratio,
    today_avg_size_ratio,
    today_avg_marker_efficiency,
    today_booking_vs_marker: today_booking_vs_marker_count > 0 ? today_booking_vs_marker_sum / today_booking_vs_marker_count : 0,
    today_booking_vs_cut: today_booking_vs_cut_count > 0 ? today_booking_vs_cut_sum / today_booking_vs_cut_count : 0,
    total_fabric_save_loss_kg,
    total_fabric_save_loss_percent,
    today_fabric_save_loss_kg,
    today_fabric_save_loss_percent
  };
}
