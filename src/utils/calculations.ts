import { CuttingEntry } from '../types';

/**
 * Perform automatic industrial calculations on a CuttingEntry.
 * Returns the entry populated with the calculated fields.
 */
export function calculateFields(entry: Omit<CuttingEntry, 'total_length_inch' | 'total_used_fabric_inch' | 'spreading_scrap_kg' | 'scrap_percent_per_marker' | 'cutting_scrap_percent' | 'deviation_percent' | 'efficiency_gap' | 'actual_marker_scrap_kg' | 'actual_marker_scrap_percent' | 'actual_physical_marker_efficiency_ete'>): CuttingEntry {
  const lay = Number(entry.lay) || 0;
  const marker_length_inch = Number(entry.marker_length_inch) || 0;
  const fabric_used_kg = Number(entry.fabric_used_kg) || 0;
  const remnant_weight_kg = Number(entry.remnant_weight_kg) || 0;
  const cutting_scrap_weight_kg = Number(entry.cutting_scrap_weight_kg) || 0;
  const marker_efficiency_percent = Number(entry.marker_efficiency_percent) || 0;

  // 1. Total Length (Inch)
  const total_length_inch = marker_length_inch * lay;

  // 2. Total Used Fabric (Inch)
  const total_used_fabric_inch = total_length_inch;

  // 3. Spreading Scrap (KG)
  // Typically edge scrap, styling margins, or end bits, averagely 2.5% of total fabric used
  const spreading_scrap_kg = parseFloat((fabric_used_kg * 0.025).toFixed(3));

  // 4. Scrap % As Per Marker
  const scrap_percent_per_marker = parseFloat((100 - marker_efficiency_percent).toFixed(2));

  // 5. Cutting Scrap %
  const cutting_scrap_percent = fabric_used_kg > 0
    ? parseFloat(((cutting_scrap_weight_kg / fabric_used_kg) * 100).toFixed(2))
    : 0;

  // 6. Actual Marker Scrap (KG)
  // Leftover fabric inside layout, calculated on net fabric after deducting remnants and spreading scrap
  const net_fabric_kg = Math.max(0, fabric_used_kg - remnant_weight_kg - spreading_scrap_kg);
  const actual_marker_scrap_kg = parseFloat((net_fabric_kg * ((100 - marker_efficiency_percent) / 100)).toFixed(3));

  // 7. Actual Marker Scrap %
  const actual_marker_scrap_percent = fabric_used_kg > 0
    ? parseFloat(((actual_marker_scrap_kg / fabric_used_kg) * 100).toFixed(2))
    : 0;

  // 8. Actual Pattern Garment Weight (usable weight of final pattern cutouts)
  const actual_garment_weight_kg = Math.max(0, net_fabric_kg - actual_marker_scrap_kg - cutting_scrap_weight_kg);

  // 9. Actual Physical Marker Efficiency (ETE - End to End)
  // Ratio of useful garment weight to total fabric processed
  const actual_physical_marker_efficiency_ete = fabric_used_kg > 0
    ? parseFloat(((actual_garment_weight_kg / fabric_used_kg) * 100).toFixed(2))
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
export function compileDashboardKPIs(entries: CuttingEntry[]) {
  const approved = entries.filter(e => e.status === 'approved');
  const targetEntries = approved.length > 0 ? approved : entries; // fallback if none approved

  const total_fabric_used = targetEntries.reduce((acc, current) => acc + (current.fabric_used_kg || 0), 0);
  const total_remnant = targetEntries.reduce((acc, current) => acc + (current.remnant_weight_kg || 0), 0);
  const total_cutting_scrap = targetEntries.reduce((acc, current) => acc + (current.cutting_scrap_weight_kg || 0), 0);
  const total_spreading_scrap = targetEntries.reduce((acc, current) => acc + (current.spreading_scrap_kg || 0), 0);
  const total_marker_scrap = targetEntries.reduce((acc, current) => acc + (current.actual_marker_scrap_kg || 0), 0);

  // Total fabric spread = total used - remnants
  const total_fabric_spread = Math.max(0, total_fabric_used - total_remnant);

  // Remnant utilization = percentage of fabric that wasn't remnants
  const remnant_utilization = total_fabric_used > 0
    ? parseFloat((((total_fabric_used - total_remnant) / total_fabric_used) * 100).toFixed(1))
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

  return {
    total_fabric_used: parseFloat(total_fabric_used.toFixed(1)),
    total_fabric_spread: parseFloat(total_fabric_spread.toFixed(1)),
    total_cutting_scrap: parseFloat(total_cutting_scrap.toFixed(1)),
    total_spreading_scrap: parseFloat(total_spreading_scrap.toFixed(1)),
    total_marker_scrap: parseFloat(total_marker_scrap.toFixed(1)),
    avg_maker_efficiency_provided,
    avg_ete_efficiency,
    remnant_utilization,
    efficiency_gap
  };
}
