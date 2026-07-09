import React, { useState, useMemo } from "react";
import { formatDate, formatDateTime } from "../utils/dateUtils";
import { 
  Calendar, 
  Scissors, 
  Layers, 
  Cpu, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Hash,
  Activity,
  Award,
  FileSpreadsheet,
  Scale,
  Trash2,
  Gauge,
  Printer
} from "lucide-react";
import { CuttingEntry, Machine } from "../types";
import { getCurrentProductionDateAndShift } from "../utils/calculations";

interface DailyReportProps {
  entries: CuttingEntry[];
  machines: Machine[];
  selectedDate?: string;
  setSelectedDate?: (date: string) => void;
}

export default function DailyReport({ 
  entries, 
  machines, 
  selectedDate: propSelectedDate, 
  setSelectedDate: propSetSelectedDate 
}: DailyReportProps) {
  // 1. Find all unique dates that have entries, sorted descending
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    entries.forEach(e => {
      if (e.entry_date) {
        dates.add(e.entry_date);
      }
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  // Get current date string in local timezone (YYYY-MM-DD) as a fallback
  const todayStr = useMemo(() => {
    return getCurrentProductionDateAndShift().entry_date;
  }, []);

  // 2. Default state for selected date: latest available date with entries, or today
  const [internalSelectedDate, setInternalSelectedDate] = useState<string>(() => {
    if (availableDates.length > 0) {
      return availableDates[0];
    }
    return todayStr;
  });

  const selectedDate = propSelectedDate !== undefined ? propSelectedDate : internalSelectedDate;
  const setSelectedDate = propSetSelectedDate !== undefined ? propSetSelectedDate : setInternalSelectedDate;

  // 3. Filter entries for the selected date
  const dayEntries = useMemo(() => {
    return entries.filter(e => e.entry_date === selectedDate);
  }, [entries, selectedDate]);

  // 4. Calculate stats for the selected date
  const stats = useMemo(() => {
    const totalCuttingLots = dayEntries.length;
    const totalLay = dayEntries.reduce((sum, e) => sum + (Number(e.lay) || 0), 0);
    const totalCuttingQty = dayEntries.reduce((sum, e) => sum + ((Number(e.lay) || 0) * (Number(e.ratio) || 0)), 0);
    const totalFabricUsedKg = dayEntries.reduce((sum, e) => sum + (Number(e.fabric_used_kg) || 0), 0);

    // Calculate 19 Overall Fabric Metrics
    const total_used = totalFabricUsedKg;
    const total_remnants_issued = dayEntries.reduce((acc, c) => acc + (parseFloat(c.remarks) || 0), 0);
    const total_cutting_scrap = dayEntries.reduce((acc, c) => acc + (Number(c.cutting_scrap_weight_kg) || 0), 0);
    const total_spreading_scrap = dayEntries.reduce((acc, c) => acc + (Number(c.remnant_weight_kg) || 0), 0);
    const total_marker_scrap_kg = total_cutting_scrap;
    const total_length = dayEntries.reduce((acc, c) => acc + (Number(c.total_length_inch) || 0), 0);
    const total_used_fabric_inch_val = dayEntries.reduce((acc, c) => acc + (Number(c.total_used_fabric_inch) || (Number(c.lay) || 0) * (Number(c.marker_length_inch) || 0) * ((Number(c.marker_efficiency_percent) || 0) / 100)), 0);

    const totalCalculatedMetric = total_used_fabric_inch_val;

    // Derived fields
    const total_spread = Math.max(0, total_used - total_remnants_issued); // Spread fabric

    // Remnant calculations
    let total_remnants_weight_kg = 0;
    let total_remnants_scrap_kg = 0;
    let total_remnants_used_kg = 0;

    dayEntries.forEach(e => {
      if (e.remarks) {
        const parts = e.remarks.split('|');
        const remnants_weight_kg = parseFloat(parts[0]) || 0;
        const remnants_scrap_kg = parseFloat(parts[2]) || 0;
        total_remnants_weight_kg += remnants_weight_kg;
        total_remnants_scrap_kg += remnants_scrap_kg;
        total_remnants_used_kg += Math.max(0, remnants_weight_kg - remnants_scrap_kg);
      }
    });

    const remnants_issued_percent = total_used > 0 ? ((total_remnants_weight_kg / total_used) * 100).toFixed(1) + "%" : "0.0%";
    const remnants_used = total_remnants_used_kg.toFixed(1);
    const remnants_real_scrap = total_remnants_scrap_kg.toFixed(1);
    const remnants_scrap_percent = total_remnants_weight_kg > 0 ? ((total_remnants_scrap_kg / total_remnants_weight_kg) * 100).toFixed(1) + "%" : "0.0%";
    const remnants_utilization_percent = total_remnants_weight_kg > 0 ? ((total_remnants_used_kg / total_remnants_weight_kg) * 100).toFixed(1) + "%" : "100.0%";
    const total_remnants_issued_val = total_remnants_issued.toFixed(1);

    // Direct Scrap % metrics
    const cutting_scrap_percent = total_used > 0 ? (total_cutting_scrap / total_used) * 100 : 0;
    const spreading_scrap_percent = total_used > 0 ? (total_spreading_scrap / total_used) * 100 : 0;
    const actual_marker_scrap_percent = total_used > 0 ? (total_marker_scrap_kg / total_used) * 100 : 0;

    // Weighted marker efficiencies
    let totalWeightedTheoreticalEff = 0;
    let totalWeightedEteEff = 0;
    dayEntries.forEach(e => {
      const usedKg = Number(e.fabric_used_kg) || 0;
      totalWeightedTheoreticalEff += (Number(e.marker_efficiency_percent) || 0) * usedKg;
      totalWeightedEteEff += (Number(e.actual_physical_marker_efficiency_ete) || 0) * usedKg;
    });

    const marker_provided_efficiency_weighted = total_used > 0 ? totalWeightedTheoreticalEff / total_used : 0;
    const actual_ete_efficiency_weighted = total_used > 0 ? (1 - (total_marker_scrap_kg / total_used)) * 100 : 0;
    const efficiency_gap = marker_provided_efficiency_weighted - actual_ete_efficiency_weighted;

    const avg_layers_per_lot = totalLay / (totalCuttingLots || 1);

    return {
      totalCuttingLots,
      totalLay,
      totalCuttingQty,
      totalFabricUsedKg,
      totalCalculatedMetric,
      total_used,
      total_remnants_issued: total_remnants_issued_val,
      total_cutting_scrap,
      total_spreading_scrap,
      total_marker_scrap_kg,
      total_length,
      total_used_fabric_inch_val,
      total_spread,
      remnants_issued_percent,
      remnants_used,
      remnants_real_scrap,
      remnants_scrap_percent,
      remnants_utilization_percent,
      cutting_scrap_percent,
      spreading_scrap_percent,
      actual_marker_scrap_percent,
      marker_provided_efficiency_weighted,
      actual_ete_efficiency_weighted,
      efficiency_gap,
      avg_layers_per_lot
    };
  }, [dayEntries]);

  // 5. Aggregate machine-wise production for the selected date
  const machineProduction = useMemo(() => {
    const productionMap: { 
      [machineId: string]: {
        machineId: string;
        machineName: string;
        machineType: string;
        cutsCount: number;
        laySum: number;
        cuttingQtySum: number;
        fabricUsedSum: number;
        calculatedMetricSum: number;
      }
    } = {};

    // Initialize all machines
    machines.forEach(m => {
      productionMap[m.id] = {
        machineId: m.id,
        machineName: m.machine_name,
        machineType: m.machine_type,
        cutsCount: 0,
        laySum: 0,
        cuttingQtySum: 0,
        fabricUsedSum: 0,
        calculatedMetricSum: 0
      };
    });

    // Populate active entries on selectedDate
    dayEntries.forEach(e => {
      const mId = e.machine_id;
      if (!productionMap[mId]) {
        // Fallback for machines not in database config but in entry
        productionMap[mId] = {
          machineId: mId,
          machineName: `Machine ID: ${mId}`,
          machineType: "Automatic Cutter",
          cutsCount: 0,
          laySum: 0,
          cuttingQtySum: 0,
          fabricUsedSum: 0,
          calculatedMetricSum: 0
        };
      }
      
      const item = productionMap[mId];
      const lay = Number(e.lay) || 0;
      const ratio = Number(e.ratio) || 0;
      const length = Number(e.marker_length_inch) || 0;
      const efficiency = Number(e.marker_efficiency_percent) || 0;

      item.cutsCount += 1;
      item.laySum += lay;
      item.cuttingQtySum += (lay * ratio);
      item.fabricUsedSum += Number(e.fabric_used_kg) || 0;
      item.calculatedMetricSum += (lay * length * (efficiency / 100));
    });

    // Convert to array and filter out machines with zero cuts to focus on active ones
    const allStats = Object.values(productionMap);
    const activeStats = allStats.filter(m => m.cutsCount > 0);
    
    // Sort active ones by cuttingQtySum descending to see top performer
    return activeStats.sort((a, b) => b.cuttingQtySum - a.cuttingQtySum);
  }, [dayEntries, machines]);

  // Navigation handlers for date
  const handlePrevDay = () => {
    if (availableDates.length === 0) return;
    const currentIndex = availableDates.indexOf(selectedDate);
    if (currentIndex !== -1 && currentIndex < availableDates.length - 1) {
      setSelectedDate(availableDates[currentIndex + 1]);
    } else {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 1);
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      setSelectedDate(`${yStr}-${mStr}-${dStr}`);
    }
  };

  const handleNextDay = () => {
    if (availableDates.length === 0) return;
    const currentIndex = availableDates.indexOf(selectedDate);
    if (currentIndex > 0) {
      setSelectedDate(availableDates[currentIndex - 1]);
    } else {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 1);
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      setSelectedDate(`${yStr}-${mStr}-${dStr}`);
    }
  };

  const handleExportCSV = () => {
    if (dayEntries.length === 0) return;

    const {
      total_used,
      total_remnants_issued,
      total_cutting_scrap,
      total_spreading_scrap,
      total_marker_scrap_kg,
      total_length,
      total_used_fabric_inch_val,
      total_spread,
      remnants_issued_percent,
      remnants_used,
      remnants_real_scrap,
      remnants_scrap_percent,
      remnants_utilization_percent,
      cutting_scrap_percent,
      spreading_scrap_percent,
      actual_marker_scrap_percent,
      marker_provided_efficiency_weighted,
      actual_ete_efficiency_weighted,
      efficiency_gap
    } = stats;

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Daily Report</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; }
          table { border-collapse: collapse; margin-bottom: 25px; }
          th, td { border: 1.5pt solid #000000; padding: 6px 10px; font-size: 10pt; vertical-align: middle; }
          
          /* Title Section */
          .report-title { font-size: 16pt; font-weight: bold; color: #1F4E78; text-align: left; border: none; }
          .report-meta { font-size: 10pt; color: #595959; text-align: left; border: none; }
          
          /* Table Section Titles */
          .section-header { font-size: 12pt; font-weight: bold; color: #1F4E78; background-color: #D9E1F2; text-align: left; border: 1.5pt solid #8EA9DB; padding: 8px; }
          
          /* Summary Table Specifics (Matching standard Excel & user's screenshot) */
          .hdr-gray { background-color: #D9D9D9; color: #000000; font-weight: bold; text-align: center; }
          .hdr-blue { background-color: #5B9BD5; color: #FFFFFF; font-weight: bold; text-align: center; }
          .hdr-green { background-color: #E2EFDA; color: #000000; font-weight: bold; text-align: center; }
          .hdr-lavender { background-color: #DDEBF7; color: #000000; font-weight: bold; text-align: center; }
          
          /* Highlights */
          .cell-green { background-color: #A9D08E; color: #000000; font-weight: bold; text-align: center; }
          .cell-blue { background-color: #BDD7EE; color: #000000; font-weight: bold; text-align: center; }
          .cell-default { background-color: #FFFFFF; color: #000000; font-weight: bold; text-align: center; }
          
          /* Detailed Ledger styles */
          .ledger-header { background-color: #2F5597; color: #FFFFFF; font-weight: bold; text-align: center; }
          .ledger-row-even { background-color: #F2F2F2; }
          .ledger-row-odd { background-color: #FFFFFF; }
          
          /* Alignments */
          .align-left { text-align: left; }
          .align-right { text-align: right; }
          .align-center { text-align: center; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="10" class="report-title" style="font-size: 16pt; font-weight: bold; color: #1F4E78;">DAILY OPERATIONAL REPORT</td></tr>
          <tr><td colspan="10" class="report-meta" style="font-size: 10pt; color: #595959;">Wavely Cut Platform | Target Date: ${formatDate(selectedDate)}</td></tr>
          <tr><td colspan="10" class="report-meta" style="font-size: 10pt; color: #595959;">Generated: ${formatDateTime(new Date().toISOString())} | Developer: Rakib Hasan</td></tr>
        </table>

        <table>
          <tr><td colspan="3" class="section-header">SUMMARY STATISTICS KPI</td></tr>
          <thead>
            <tr>
              <th style="background-color: #F2F2F2;">Metric</th>
              <th style="background-color: #F2F2F2;">Value</th>
              <th style="background-color: #F2F2F2;">Unit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="align-left">Total Lay Cut</td>
              <td class="align-right" style="font-weight: bold;">${stats.totalCuttingLots}</td>
              <td class="align-center">Cuts</td>
            </tr>
            <tr>
              <td class="align-left">Total Lay Layers</td>
              <td class="align-right" style="font-weight: bold;">${stats.totalLay}</td>
              <td class="align-center">Layers</td>
            </tr>
            <tr>
              <td class="align-left">Total Cutting Quantity</td>
              <td class="align-right" style="font-weight: bold; color: #2563EB;">${stats.totalCuttingQty}</td>
              <td class="align-center">Pcs</td>
            </tr>
            <tr>
              <td class="align-left">Total Fabric Weight Used</td>
              <td class="align-right" style="font-weight: bold;">${stats.totalFabricUsedKg.toFixed(2)}</td>
              <td class="align-center">KG</td>
            </tr>
            <tr>
              <td class="align-left">Total Processed Length</td>
              <td class="align-right" style="font-weight: bold;">${stats.totalCalculatedMetric.toFixed(2)}</td>
              <td class="align-center">Inches</td>
            </tr>
            <tr>
              <td class="align-left">Average Layers per Lot</td>
              <td class="align-right">${(stats.totalLay / (stats.totalCuttingLots || 1)).toFixed(2)}</td>
              <td class="align-center">Layers/Lot</td>
            </tr>
          </tbody>
        </table>

         <table>
          <tr><td colspan="19" class="section-header">OVERALL FABRIC METRICS SUMMARY</td></tr>
        </table>

        <table>
          <thead>
            <tr>
              <th style="background-color: #7F7F7F; color: #FFFFFF; font-weight: bold; text-align: center; font-size: 10pt; padding: 6px 12px;" colspan="6">General & Efficiency</th>
              <th style="background-color: #2F5597; color: #FFFFFF; font-weight: bold; text-align: center; font-size: 10pt; padding: 6px 12px;" colspan="3">Edge / Spreading Scrap</th>
              <th style="background-color: #375623; color: #FFFFFF; font-weight: bold; text-align: center; font-size: 10pt; padding: 6px 12px;" colspan="6">Remnants Analytics</th>
              <th style="background-color: #7030A0; color: #FFFFFF; font-weight: bold; text-align: center; font-size: 10pt; padding: 6px 12px;" colspan="4">Cutting & Lengths</th>
            </tr>
            <tr>
              <th style="background-color: #D9D9D9; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Total Fabric Used in KG</th>
              <th style="background-color: #D9D9D9; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Total Fabric Spread in KG</th>
              <th style="background-color: #D9D9D9; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Actual Marker/ Cutting Scrap (KG)</th>
              <th style="background-color: #D9D9D9; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Actual Physical Marker Efficiency (ETE)</th>
              <th style="background-color: #D9D9D9; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Marker Provided Eff%(Wtd)</th>
              <th style="background-color: #D9D9D9; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Efficiency Gap</th>

              <th style="background-color: #BDD7EE; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Edge/Spreading Scrap (KG)</th>
              <th style="background-color: #BDD7EE; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Actual Marker/ Cutting Scrap %</th>
              <th style="background-color: #BDD7EE; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Edge/Spreading Scrap%</th>

              <th style="background-color: #E2EFDA; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Remnants Fabric issued (KG)</th>
              <th style="background-color: #E2EFDA; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Remnants Fabric Used (KG)</th>
              <th style="background-color: #E2EFDA; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Remnants Scrap (KG)</th>
              <th style="background-color: #E2EFDA; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Remnants Fabric(Issued ) %</th>
              <th style="background-color: #E2EFDA; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Remnants Scrap%</th>
              <th style="background-color: #E2EFDA; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Remnants Fabric Utilization %</th>

              <th style="background-color: #E1D5E7; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Total Cutting Scrap</th>
              <th style="background-color: #E1D5E7; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Total Cutting Scrap %</th>
              <th style="background-color: #E1D5E7; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Total Length (Inch)</th>
              <th style="background-color: #E1D5E7; color: #000000; font-weight: bold; text-align: center; font-size: 9pt; padding: 6px 12px;">Total Used Fabric (Inch)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="cell-default" style="padding: 6px 12px; text-align: center;">${total_used.toFixed(1)}</td>
              <td class="cell-green" style="padding: 6px 12px; text-align: center;">${total_spread.toFixed(1)}</td>
              <td class="cell-default" style="padding: 6px 12px; text-align: center;">${total_cutting_scrap.toFixed(1)}</td>
              <td class="cell-green" style="padding: 6px 12px; text-align: center;">${actual_ete_efficiency_weighted.toFixed(1)}%</td>
              <td class="cell-default" style="padding: 6px 12px; text-align: center;">${marker_provided_efficiency_weighted.toFixed(1)}%</td>
              <td class="cell-green" style="padding: 6px 12px; text-align: center;">${efficiency_gap.toFixed(1)}%</td>

              <td class="cell-default" style="padding: 6px 12px; text-align: center;">${total_spreading_scrap.toFixed(1)}</td>
              <td class="cell-green" style="padding: 6px 12px; text-align: center;">${cutting_scrap_percent.toFixed(1)}%</td>
              <td class="cell-green" style="padding: 6px 12px; text-align: center;">${spreading_scrap_percent.toFixed(1)}%</td>

              <td class="cell-default" style="padding: 6px 12px; text-align: center;">${total_remnants_issued}</td>
              <td class="cell-green" style="padding: 6px 12px; text-align: center;">${remnants_used}</td>
              <td class="cell-default" style="padding: 6px 12px; text-align: center;">${remnants_real_scrap}</td>
              <td class="cell-green" style="padding: 6px 12px; text-align: center;">${remnants_issued_percent}</td>
              <td class="cell-green" style="padding: 6px 12px; text-align: center;">${remnants_scrap_percent}</td>
              <td class="cell-green" style="padding: 6px 12px; text-align: center;">${remnants_utilization_percent}</td>

              <td class="cell-default" style="padding: 6px 12px; text-align: center;">${total_cutting_scrap.toFixed(1)}</td>
              <td class="cell-green" style="padding: 6px 12px; text-align: center;">${cutting_scrap_percent.toFixed(1)}%</td>
              <td class="cell-default" style="padding: 6px 12px; text-align: center;">${total_length.toLocaleString()}</td>
              <td class="cell-blue" style="padding: 6px 12px; text-align: center;">${total_used_fabric_inch_val.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
            </tr>
          </tbody>
        </table>

        <table>
          <tr><td colspan="8" class="section-header">MACHINE PRODUCTION BREAKDOWN</td></tr>
          <thead>
            <tr>
              <th class="ledger-header">Machine Name</th>
              <th class="ledger-header">Machine Type</th>
              <th class="ledger-header">Cuts (Lots)</th>
              <th class="ledger-header">Total Lay (Layers)</th>
              <th class="ledger-header">Cutting Qty (Pcs)</th>
              <th class="ledger-header">Fabric Weight Used (KG)</th>
              <th class="ledger-header">Effective Inches Processed</th>
              <th class="ledger-header">Production Share (%)</th>
            </tr>
          </thead>
          <tbody>
            ${machineProduction.map((m, idx) => {
              const sharePercent = stats.totalCuttingQty > 0 
                ? Math.round((m.cuttingQtySum / stats.totalCuttingQty) * 100) 
                : 0;
              return `
                <tr class="${idx % 2 === 0 ? 'ledger-row-even' : 'ledger-row-odd'}">
                  <td class="align-left" style="font-weight: bold;">${m.machineName}</td>
                  <td class="align-left">${m.machineType}</td>
                  <td class="align-right">${m.cutsCount}</td>
                  <td class="align-right">${m.laySum}</td>
                  <td class="align-right" style="font-weight: bold; color: #2563EB;">${m.cuttingQtySum}</td>
                  <td class="align-right">${m.fabricUsedSum.toFixed(2)}</td>
                  <td class="align-right">${m.calculatedMetricSum.toFixed(2)}</td>
                  <td class="align-center" style="font-weight: bold;">${sharePercent}%</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>

        <table>
          <tr><td colspan="19" class="section-header">DETAILED OPERATIONAL RECORD LEDGER</td></tr>
          <thead>
            <tr>
              <th class="ledger-header">Job/Order No</th>
              <th class="ledger-header">Cut No</th>
              <th class="ledger-header">Shift</th>
              <th class="ledger-header">Machine Name</th>
              <th class="ledger-header">Buyer</th>
              <th class="ledger-header">Fabric Type</th>
              <th class="ledger-header">Color</th>
              <th class="ledger-header">Item</th>
              <th class="ledger-header">Table No</th>
              <th class="ledger-header">Lay (Layers)</th>
              <th class="ledger-header">Ratio</th>
              <th class="ledger-header">Cutting Qty (Pcs)</th>
              <th class="ledger-header">Fabric Used (KG)</th>
              <th class="ledger-header">Remnant Weight (KG)</th>
              <th class="ledger-header">Scrap Weight (KG)</th>
              <th class="ledger-header">Marker Length (Inch)</th>
              <th class="ledger-header">Marker Efficiency (%)</th>
              <th class="ledger-header">Status</th>
              <th class="ledger-header">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${dayEntries.map((e, idx) => {
              const cuttingQty = (Number(e.lay) || 0) * (Number(e.ratio) || 0);
              const machineName = machines.find(m => m.id === e.machine_id)?.machine_name || e.machine_id;
              return `
                <tr class="${idx % 2 === 0 ? 'ledger-row-even' : 'ledger-row-odd'}">
                  <td class="align-center">${e.job_no}</td>
                  <td class="align-center">${e.cut_no}</td>
                  <td class="align-center">${e.shift === "A" ? "Day" : e.shift === "B" ? "Night" : e.shift}</td>
                  <td class="align-left">${machineName}</td>
                  <td class="align-left">${e.buyer}</td>
                  <td class="align-left">${e.fabric_type}</td>
                  <td class="align-left">${e.color}</td>
                  <td class="align-left">${e.item}</td>
                  <td class="align-center">${e.table_no}</td>
                  <td class="align-right">${e.lay}</td>
                  <td class="align-right">${e.ratio}</td>
                  <td class="align-right" style="font-weight: bold;">${cuttingQty}</td>
                  <td class="align-right">${e.fabric_used_kg}</td>
                  <td class="align-right">${e.remnant_weight_kg}</td>
                  <td class="align-right">${e.cutting_scrap_weight_kg}</td>
                  <td class="align-right">${e.marker_length_inch}</td>
                  <td class="align-right">${e.marker_efficiency_percent}%</td>
                  <td class="align-center" style="font-weight: bold; color: ${e.status === 'approved' ? '#16A34A' : '#D97706'};">${e.status}</td>
                  <td class="align-left">${(e.remarks || "").split('|')[0]}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `WavelyCut_Daily_Report_${formatDate(selectedDate)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm font-sans" id="daily-report-card">
      
      {/* Header and Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Calendar size={18} className="stroke-[2.5]" />
            </span>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Daily Operational Report
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Standard floor metrics, total fabric lays, marker counts, and active machine yields for <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatDate(selectedDate)}</span>.
          </p>
        </div>

        {/* Date Selector & Export Actions Controls */}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            disabled={dayEntries.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs py-2.5 px-4 rounded-xl cursor-pointer shadow-sm shadow-blue-600/15 transition-all shrink-0 h-10"
            title="Print daily operational report from browser"
          >
            <Printer size={15} />
            <span>Print Report</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={dayEntries.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs py-2.5 px-4 rounded-xl cursor-pointer shadow-sm shadow-emerald-600/15 transition-all shrink-0 h-10"
            title="Download formatted daily CSV report (compatible with Excel)"
          >
            <FileSpreadsheet size={15} />
            <span>Export Report (Excel/CSV)</span>
          </button>
        </div>
      </div>

      {/* If no entries for this date */}
      {dayEntries.length === 0 ? (
        <div className="py-12 px-4 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-950/10 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl">
          <Calendar className="text-slate-400 dark:text-slate-600 mb-3" size={36} />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">No Operational Records</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            There are no cutting logs submitted for <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatDate(selectedDate)}</span>. Please use the calendar input above or select an active date from the quick select pills.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Overall Fabric & Operations Efficiency Dashboard */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950/10 shadow-xs p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <span className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                <Gauge size={18} className="stroke-[2.5]" />
              </span>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                Comprehensive Fabric & Operations Efficiency Dashboard
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              
              {/* Group 1: General Production Metrics */}
              <div className="bg-slate-50/40 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/60 p-5 rounded-2xl space-y-3.5 hover:shadow-xs transition-all">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-extrabold text-xs uppercase border-b border-slate-150 dark:border-slate-800/50 pb-2.5">
                  <Scissors size={14} className="text-blue-500" />
                  <span>Production & Yield</span>
                </div>
                <div className="space-y-3 font-sans">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-500 dark:text-slate-400">Total Lay Cut:</span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white">{stats.totalCuttingLots} <span className="text-[10px] text-slate-400 font-bold uppercase">Cuts</span></span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-500 dark:text-slate-400">Total Lay Layers:</span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white">{stats.totalLay.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold uppercase">Lays</span></span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-500 dark:text-slate-400">Total Cutting Qty:</span>
                    <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400">{stats.totalCuttingQty.toLocaleString()} <span className="text-[10px] font-bold uppercase text-slate-400">Pcs</span></span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-500 dark:text-slate-400">Avg Layers per Lot:</span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white">{stats.avg_layers_per_lot.toFixed(2)} <span className="text-[10px] text-slate-400 font-bold uppercase">L/Lot</span></span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-500 dark:text-slate-400">Total Length:</span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white">{stats.total_length.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold uppercase">In.</span></span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium border-t border-dashed border-slate-200 dark:border-slate-800 pt-2.5">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Total Used Fabric:</span>
                    <span className="font-mono font-extrabold text-pink-600 dark:text-pink-400">{stats.totalCalculatedMetric.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-[10px] font-bold uppercase">In.</span></span>
                  </div>
                </div>
              </div>

              {/* Group 2: Fabric Weight & Efficiency */}
              <div className="bg-slate-50/40 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/60 p-5 rounded-2xl space-y-3.5 hover:shadow-xs transition-all">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-extrabold text-xs uppercase border-b border-slate-150 dark:border-slate-800/50 pb-2.5">
                  <Scale size={14} className="text-emerald-500" />
                  <span>Fabric & Efficiency</span>
                </div>
                <div className="space-y-3 font-sans">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-500 dark:text-slate-400">Total Weight Used:</span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white">{stats.total_used.toFixed(1)} <span className="text-[10px] text-slate-400 font-bold uppercase">KG</span></span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-500 dark:text-slate-400">Total Spread Fabric:</span>
                    <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{stats.total_spread.toFixed(1)} <span className="text-[10px] font-bold uppercase">KG</span></span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-500 dark:text-slate-400">Marker Provided Eff (Wtd):</span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white">{stats.marker_provided_efficiency_weighted.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-500 dark:text-slate-400">Physical Eff (ETE):</span>
                    <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{stats.actual_ete_efficiency_weighted.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium border-t border-dashed border-slate-200 dark:border-slate-800 pt-2.5">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Efficiency Gap:</span>
                    <span className={`font-mono font-extrabold ${stats.efficiency_gap > 3 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{stats.efficiency_gap.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Group 3: Scrap & Waste Analytics */}
              <div className="bg-slate-50/40 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/60 p-5 rounded-2xl space-y-3.5 hover:shadow-xs transition-all">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-extrabold text-xs uppercase border-b border-slate-150 dark:border-slate-800/50 pb-2.5">
                  <Trash2 size={14} className="text-rose-500" />
                  <span>Waste & Scrap</span>
                </div>
                <div className="space-y-3 font-sans">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-500 dark:text-slate-400">Edge/Spreading Scrap:</span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white">{stats.total_spreading_scrap.toFixed(1)} <span className="text-[10px] text-slate-400 font-bold uppercase">KG</span></span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-500 dark:text-slate-400">Edge/Spreading Scrap %:</span>
                    <span className="font-mono font-extrabold text-rose-500">{stats.spreading_scrap_percent.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-500 dark:text-slate-400">Total Cutting Scrap:</span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white">{stats.total_cutting_scrap.toFixed(1)} <span className="text-[10px] text-slate-400 font-bold uppercase">KG</span></span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium border-t border-dashed border-slate-200 dark:border-slate-800 pt-2.5">
                    <span className="text-slate-500 dark:text-slate-400">Total Cutting Scrap %:</span>
                    <span className="font-mono font-extrabold text-rose-500">{stats.cutting_scrap_percent.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Machine-Wise Production */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950/10 shadow-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[#2563EB] stroke-[2.5]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Machine Production Breakdown
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono">
                Selected Date: {formatDate(selectedDate)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="p-4 pl-5">Machine Details</th>
                    <th className="p-4 text-center">Cuts (Lots)</th>
                    <th className="p-4 text-right">Total Lay (Layers)</th>
                    <th className="p-4 text-right">Cutting Qty (Ratio × Lay)</th>
                    <th className="p-4 text-right">Total Used Fabric (Inch)</th>
                    <th className="p-4 text-right">Fabric Processed</th>
                    <th className="p-4 pr-5 text-right">Production Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {machineProduction.map((m, index) => {
                    const sharePercent = stats.totalCuttingQty > 0 
                      ? Math.round((m.cuttingQtySum / stats.totalCuttingQty) * 100) 
                      : 0;

                    return (
                      <tr key={m.machineId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                        {/* Machine Details */}
                        <td className="p-4 pl-5">
                          <div className="flex items-center gap-2.5">
                            {index === 0 && (
                              <span className="text-amber-500" title="Top Performing Cutter Today">
                                <Award size={16} />
                              </span>
                            )}
                            <div>
                              <div className="font-extrabold text-slate-800 dark:text-slate-200">
                                {m.machineName}
                              </div>
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                                {m.machineType}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Cuts Count */}
                        <td className="p-4 text-center font-mono font-bold text-slate-750 dark:text-slate-300">
                          {m.cutsCount}
                        </td>

                        {/* Total Lay */}
                        <td className="p-4 text-right font-mono text-slate-705 dark:text-slate-300">
                          {m.laySum.toLocaleString()}
                        </td>

                        {/* Cutting Qty */}
                        <td className="p-4 text-right font-mono font-bold text-[#2563EB]">
                          {m.cuttingQtySum.toLocaleString()}
                        </td>

                        {/* Calculated Metric (Total lay * length * eff %) */}
                        <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {m.calculatedMetricSum.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </td>

                        {/* Fabric Used */}
                        <td className="p-4 text-right font-mono text-slate-600 dark:text-slate-400">
                          {m.fabricUsedSum.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} KG
                        </td>

                        {/* Production Share Visual */}
                        <td className="p-4 pr-5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                              {sharePercent}%
                            </span>
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block shrink-0">
                              <div 
                                className="h-full bg-slate-900 dark:bg-slate-150 rounded-full" 
                                style={{ width: `${sharePercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      )}

    </div>
  );
}
