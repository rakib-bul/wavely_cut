import React, { useState, useMemo } from "react";
import { formatDate, formatDateTime } from "../utils/dateUtils";
import { CustomDatePicker } from "./common/DatePicker";
import { 
  Download, 
  Search, 
  Calendar, 
  Bot, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  User, 
  Cpu, 
  Printer, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  BarChart,
  FileSpreadsheet,
  AlertTriangle,
  Send,
  Lock
} from "lucide-react";
import { CuttingEntry, Machine, Profile, UserRole, Buyer } from "../types";

interface ReportsModuleProps {
  entries: CuttingEntry[];
  machines: Machine[];
  profiles: Profile[];
  currentProfile: Profile;
  onApproveEntry: (id: string) => void;
  onDeleteEntry: (id: string) => void;
  onSelectEditEntry?: (entry: CuttingEntry) => void;
  buyers?: Buyer[];
  onSubmitDraft?: (entry: CuttingEntry) => void;
  onRefresh?: () => void;
}

// Helpers for parsing/formatting "remarks" with packed remnants used data
export interface RemnantsUsedData {
  remnants_weight_kg: number;
  reject_qty: number;
  remnants_scrap_kg: number;
}

export function parseRemarksRemnants(remarks: string): RemnantsUsedData {
  if (!remarks) {
    return { remnants_weight_kg: 0, reject_qty: 0, remnants_scrap_kg: 0 };
  }
  const parts = remarks.split('|');
  const remnants_weight_kg = parseFloat(parts[0]) || 0;
  const reject_qty = parseFloat(parts[1]) || 0;
  const remnants_scrap_kg = parseFloat(parts[2]) || 0;
  return { remnants_weight_kg, reject_qty, remnants_scrap_kg };
}

export function formatRemarksRemnants(remnants_weight_kg: number, reject_qty: number, remnants_scrap_kg: number): string {
  return `${remnants_weight_kg}|${reject_qty}|${remnants_scrap_kg}`;
}

function RemnantsRow({
  entry,
  machines,
  currentProfile,
  onSave
}: {
  entry: CuttingEntry;
  machines: Machine[];
  currentProfile: Profile;
  onSave: (entry: CuttingEntry, rejectQty: number, remnantsScrapKg: number) => Promise<void>;
  key?: React.Key;
}) {
  const mName = machines.find(m => m.id === entry.machine_id)?.machine_name || "Unknown";
  const totalCutQty = (entry.lay || 0) * (entry.ratio || 0);
  
  const parsed = parseRemarksRemnants(entry.remarks);
  const remnantsWeight = parsed.remnants_weight_kg;
  
  const [rejectQty, setRejectQty] = useState<string>(parsed.reject_qty ? String(parsed.reject_qty) : "");
  const [remnantsScrap, setRemnantsScrap] = useState<string>(parsed.remnants_scrap_kg ? String(parsed.remnants_scrap_kg) : "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState("");

  const hasRemnantData = parsed.reject_qty > 0 || parsed.remnants_scrap_kg > 0;
  const isAllowedToEnter = currentProfile.role === "admin" || currentProfile.role === "supervisor" || currentProfile.can_access_remnant_entry !== false;
  const isAllowedToEditOrDelete = currentProfile.role === "admin" || currentProfile.role === "supervisor";

  const isSaveAllowed = (!hasRemnantData && isAllowedToEnter) || (hasRemnantData && isAllowedToEditOrDelete);
  const isDeleteAllowed = hasRemnantData && isAllowedToEditOrDelete;

  const disabled = !isSaveAllowed;

  // Sync state if entry prop changes
  React.useEffect(() => {
    const updated = parseRemarksRemnants(entry.remarks);
    setRejectQty(updated.reject_qty ? String(updated.reject_qty) : "");
    setRemnantsScrap(updated.remnants_scrap_kg ? String(updated.remnants_scrap_kg) : "");
  }, [entry.remarks]);

  const numRejectQty = Number(rejectQty) || 0;
  const numRemnantsScrap = Number(remnantsScrap) || 0;
  const remnantsUsed = Math.max(0, remnantsWeight - numRemnantsScrap);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await onSave(entry, numRejectQty, numRemnantsScrap);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err: any) {
      setSaveStatus('error');
      setErrorMsg(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await onSave(entry, 0, 0);
      setRejectQty("");
      setRemnantsScrap("");
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err: any) {
      setSaveStatus('error');
      setErrorMsg(err.message || "Failed to delete");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = numRejectQty !== parsed.reject_qty || numRemnantsScrap !== parsed.remnants_scrap_kg;

  return (
    <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
      <td className="p-4 pl-5 whitespace-nowrap font-mono">{formatDate(entry.entry_date)}</td>
      <td className="p-4 whitespace-nowrap">
        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider border ${
          entry.shift === 'day' 
            ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900" 
            : "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900"
        }`}>
          {entry.shift}
        </span>
      </td>
      <td className="p-4 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{mName}</td>
      <td className="p-4 font-medium whitespace-nowrap">{entry.buyer}</td>
      <td className="p-4 font-mono font-bold whitespace-nowrap">{entry.job_no}</td>
      <td className="p-4 font-medium whitespace-nowrap">{entry.color}</td>
      <td className="p-4 font-mono font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">{entry.po_no || "N/A"}</td>
      <td className="p-4 font-medium whitespace-nowrap">{entry.item}</td>
      <td className="p-4 font-mono font-black text-slate-800 dark:text-slate-100 whitespace-nowrap">{entry.cut_no}</td>
      <td className="p-4 text-right font-mono font-black text-[#2563EB] whitespace-nowrap">{totalCutQty}</td>
      
      {/* 10. REJECT QTY INPUT (NEW!) */}
      <td className="p-3 whitespace-nowrap">
        <input
          type="number"
          placeholder="0"
          value={rejectQty}
          onChange={e => setRejectQty(e.target.value)}
          disabled={disabled}
          className="w-20 h-9 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
        />
      </td>

      <td className="p-4 font-mono font-medium whitespace-nowrap">{entry.table_no}</td>
      <td className="p-4 font-medium whitespace-nowrap">{entry.fabric_type}</td>
      
      {/* 13. REMNANTS FABRIC KG */}
      <td className="p-4 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
        {remnantsWeight.toFixed(1)} kg
      </td>

      {/* 14. REMNANTS SCRAP KG INPUT (NEW!) */}
      <td className="p-3 whitespace-nowrap">
        <input
          type="number"
          step="0.1"
          placeholder="0.0"
          value={remnantsScrap}
          onChange={e => setRemnantsScrap(e.target.value)}
          disabled={disabled}
          className="w-24 h-9 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
        />
      </td>

      {/* 15. REMNANTS FABRIC USED KG */}
      <td className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
        {remnantsUsed.toFixed(1)} kg
      </td>

      {/* ACTION CELL */}
      <td className="p-4 text-center pr-5 whitespace-nowrap print:hidden">
        <div className="flex items-center justify-center space-x-1.5">
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          ) : saveStatus === 'success' ? (
            <span className="text-emerald-600 font-extrabold text-[10px] uppercase flex items-center gap-1">
              <CheckCircle size={14} className="stroke-[3]" /> Saved
            </span>
          ) : saveStatus === 'error' ? (
            <span className="text-rose-600 font-extrabold text-[10px] uppercase flex items-center gap-1" title={errorMsg}>
              <AlertTriangle size={14} className="stroke-[3]" /> Error
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              {hasChanges && isSaveAllowed && (
                <button
                  onClick={handleSave}
                  title="Save remnants data manually"
                  className="px-2.5 py-1 bg-blue-600 text-white rounded-md text-[10px] font-bold hover:bg-blue-700 cursor-pointer transition shadow-xs"
                >
                  Save
                </button>
              )}
              {isDeleteAllowed && (
                <button
                  onClick={handleDelete}
                  title="Delete/Clear remnant entries"
                  className="p-1 text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200 transition cursor-pointer"
                >
                  <Trash2 size={14} className="stroke-[2.5]" />
                </button>
              )}
              {!isSaveAllowed && (
                <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold">View Only</span>
              )}
              {!hasChanges && isSaveAllowed && !hasRemnantData && (
                <span className="text-slate-350 text-[10px] font-bold uppercase">Ready</span>
              )}
              {!hasChanges && isSaveAllowed && hasRemnantData && (
                <span className="text-slate-350 text-[10px] font-bold uppercase">Synced</span>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function ReportsModule({
  entries,
  machines,
  profiles,
  currentProfile,
  onApproveEntry,
  onDeleteEntry,
  onSelectEditEntry,
  buyers = [],
  onSubmitDraft,
  onRefresh
}: ReportsModuleProps) {
  // --- Filtering State ---
  const [entryToDelete, setEntryToDelete] = useState<CuttingEntry | null>(null);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [filterBuyer, setFilterBuyer] = useState("");
  const [filterJobNo, setFilterJobNo] = useState("");
  const [filterMachine, setFilterMachine] = useState("");
  const [filterFabricType, setFilterFabricType] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [filterOperator, setFilterOperator] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterTable, setFilterTable] = useState("");
  const [filterSupervisor, setFilterSupervisor] = useState("");

  // --- Search Query ---
  const [searchQuery, setSearchQuery] = useState("");

  // --- Sorting State ---
  const [sortField, setSortField] = useState<keyof CuttingEntry>("entry_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // --- Reports Tab State ---
  const [activeReportsTab, setActiveReportsTab] = useState<'ledger' | 'cutting_ledger' | 'consumption_report' | 'remnants'>('ledger');
  const [reportSubView, setReportSubView] = useState<'ledger' | 'consumption'>('ledger');

  // --- Clear filters ---
  const resetFilters = () => {
    setDateStart("");
    setDateEnd("");
    setFilterBuyer("");
    setFilterJobNo("");
    setFilterMachine("");
    setFilterFabricType("");
    setFilterShift("");
    setFilterOperator("");
    setFilterColor("");
    setFilterTable("");
    setFilterSupervisor("");
    setSearchQuery("");
  };

  // --- Dynamic Option Calculations based on Other Active Filters ---
  const getFilteredEntriesForFacet = (excludeFilter: string) => {
    let result = [...entries];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(e => 
        e.buyer.toLowerCase().includes(q) ||
        e.job_no.toLowerCase().includes(q) ||
        e.cut_no.toLowerCase().includes(q) ||
        e.item.toLowerCase().includes(q) ||
        e.color.toLowerCase().includes(q) ||
        (e.table_no && e.table_no.toLowerCase().includes(q)) ||
        (e.supervisor_name && e.supervisor_name.toLowerCase().includes(q))
      );
    }

    // Date filters (always apply to all facets)
    if (dateStart) {
      result = result.filter(e => e.entry_date >= dateStart);
    }
    if (dateEnd) {
      result = result.filter(e => e.entry_date <= dateEnd);
    }

    // Dropdown filters (apply everything except the current facet's filter)
    if (excludeFilter !== "buyer" && filterBuyer) {
      result = result.filter(e => e.buyer.toUpperCase() === filterBuyer.toUpperCase());
    }
    if (excludeFilter !== "machine" && filterMachine) {
      result = result.filter(e => e.machine_id === filterMachine);
    }
    if (excludeFilter !== "fabricType" && filterFabricType) {
      result = result.filter(e => e.fabric_type === filterFabricType);
    }
    if (excludeFilter !== "shift" && filterShift) {
      result = result.filter(e => e.shift === filterShift);
    }
    if (excludeFilter !== "operator" && filterOperator) {
      result = result.filter(e => e.created_by.toLowerCase() === filterOperator.toLowerCase());
    }
    if (excludeFilter !== "color" && filterColor) {
      result = result.filter(e => e.color === filterColor);
    }
    if (excludeFilter !== "table" && filterTable) {
      result = result.filter(e => e.table_no && e.table_no.trim() === filterTable.trim());
    }
    if (excludeFilter !== "supervisor" && filterSupervisor) {
      result = result.filter(e => e.supervisor_name && e.supervisor_name.trim().toLowerCase() === filterSupervisor.trim().toLowerCase());
    }

    return result;
  };

  const dynamicMachines = useMemo(() => {
    const matchingEntries = getFilteredEntriesForFacet("machine");
    const activeMachineIds = new Set(matchingEntries.map(e => e.machine_id));
    const hasOtherActiveFilters = !!(searchQuery.trim() || dateStart || dateEnd || filterBuyer || filterFabricType || filterShift || filterOperator || filterColor || filterTable || filterSupervisor);
    if (!hasOtherActiveFilters) {
      return machines;
    }
    return machines.filter(m => activeMachineIds.has(m.id));
  }, [entries, machines, searchQuery, dateStart, dateEnd, filterBuyer, filterFabricType, filterShift, filterOperator, filterColor, filterTable, filterSupervisor]);

  const dynamicBuyers = useMemo(() => {
    const matchingEntries = getFilteredEntriesForFacet("buyer");
    const set = new Set<string>();
    const hasOtherActiveFilters = !!(searchQuery.trim() || dateStart || dateEnd || filterMachine || filterFabricType || filterShift || filterOperator || filterColor || filterTable || filterSupervisor);
    
    if (!hasOtherActiveFilters && buyers && buyers.length > 0) {
      buyers.forEach(b => {
        if (b.name) set.add(b.name.toUpperCase().trim());
      });
    }
    matchingEntries.forEach(e => {
      if (e.buyer) set.add(e.buyer.toUpperCase().trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [entries, buyers, searchQuery, dateStart, dateEnd, filterMachine, filterFabricType, filterShift, filterOperator, filterColor, filterTable, filterSupervisor]);

  const dynamicFabricTypes = useMemo(() => {
    const matchingEntries = getFilteredEntriesForFacet("fabricType");
    const set = new Set(matchingEntries.map(e => e.fabric_type || ""));
    return Array.from(set).filter(Boolean).sort();
  }, [entries, searchQuery, dateStart, dateEnd, filterBuyer, filterMachine, filterShift, filterOperator, filterColor, filterTable, filterSupervisor]);

  const dynamicShifts = useMemo(() => {
    const matchingEntries = getFilteredEntriesForFacet("shift");
    const set = new Set(matchingEntries.map(e => e.shift || ""));
    const list = Array.from(set).filter(Boolean).sort();
    return list.length > 0 ? list : ["A", "B"];
  }, [entries, searchQuery, dateStart, dateEnd, filterBuyer, filterMachine, filterFabricType, filterOperator, filterColor, filterTable, filterSupervisor]);

  const dynamicColors = useMemo(() => {
    const matchingEntries = getFilteredEntriesForFacet("color");
    const set = new Set(matchingEntries.map(e => e.color || ""));
    return Array.from(set).filter(Boolean).sort();
  }, [entries, searchQuery, dateStart, dateEnd, filterBuyer, filterMachine, filterFabricType, filterShift, filterOperator, filterTable, filterSupervisor]);

  const dynamicOperators = useMemo(() => {
    const matchingEntries = getFilteredEntriesForFacet("operator");
    const activeOperatorEmails = new Set(matchingEntries.map(e => e.created_by.toLowerCase().trim()));
    const hasOtherActiveFilters = !!(searchQuery.trim() || dateStart || dateEnd || filterBuyer || filterMachine || filterFabricType || filterShift || filterColor || filterTable || filterSupervisor);
    if (!hasOtherActiveFilters) {
      return profiles.filter(p => p.role === 'operator');
    }
    return profiles.filter(p => p.role === 'operator' && activeOperatorEmails.has(p.email.toLowerCase().trim()));
  }, [entries, profiles, searchQuery, dateStart, dateEnd, filterBuyer, filterMachine, filterFabricType, filterShift, filterColor, filterTable, filterSupervisor]);

  const dynamicTables = useMemo(() => {
    const matchingEntries = getFilteredEntriesForFacet("table");
    const set = new Set(matchingEntries.map(e => e.table_no ? e.table_no.trim() : ""));
    return Array.from(set).filter(Boolean).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [entries, searchQuery, dateStart, dateEnd, filterBuyer, filterMachine, filterFabricType, filterShift, filterOperator, filterColor, filterSupervisor]);

  const dynamicSupervisors = useMemo(() => {
    const matchingEntries = getFilteredEntriesForFacet("supervisor");
    const set = new Set(matchingEntries.map(e => e.supervisor_name ? e.supervisor_name.trim() : ""));
    return Array.from(set).filter(Boolean).sort();
  }, [entries, searchQuery, dateStart, dateEnd, filterBuyer, filterMachine, filterFabricType, filterShift, filterOperator, filterColor, filterTable]);

  // --- Apply Filters, Sorting & Search ---
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Search query match helper
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(e => 
        e.buyer.toLowerCase().includes(q) ||
        e.job_no.toLowerCase().includes(q) ||
        e.cut_no.toLowerCase().includes(q) ||
        e.item.toLowerCase().includes(q) ||
        e.color.toLowerCase().includes(q) ||
        (e.table_no && e.table_no.toLowerCase().includes(q)) ||
        (e.supervisor_name && e.supervisor_name.toLowerCase().includes(q))
      );
    }

    // Dropdown filters
    if (dateStart) {
      result = result.filter(e => e.entry_date >= dateStart);
    }
    if (dateEnd) {
      result = result.filter(e => e.entry_date <= dateEnd);
    }
    if (filterBuyer) {
      result = result.filter(e => e.buyer.toUpperCase() === filterBuyer.toUpperCase());
    }
    if (filterJobNo) {
      result = result.filter(e => e.job_no.includes(filterJobNo));
    }
    if (filterMachine) {
      result = result.filter(e => e.machine_id === filterMachine);
    }
    if (filterFabricType) {
      result = result.filter(e => e.fabric_type === filterFabricType);
    }
    if (filterShift) {
      result = result.filter(e => e.shift === filterShift);
    }
    if (filterOperator) {
      result = result.filter(e => e.created_by.toLowerCase() === filterOperator.toLowerCase());
    }
    if (filterColor) {
      result = result.filter(e => e.color === filterColor);
    }
    if (filterTable) {
      result = result.filter(e => e.table_no && e.table_no.trim() === filterTable.trim());
    }
    if (filterSupervisor) {
      result = result.filter(e => e.supervisor_name && e.supervisor_name.trim().toLowerCase() === filterSupervisor.trim().toLowerCase());
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;

      if (typeof aVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      } else {
        return sortDirection === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }
    });

    return result;
  }, [entries, searchQuery, dateStart, dateEnd, filterBuyer, filterJobNo, filterMachine, filterFabricType, filterShift, filterOperator, filterColor, sortField, sortDirection]);

  // --- Page Sliced entries ---
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEntries, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / itemsPerPage));

  const handleSort = (field: keyof CuttingEntry) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  // --- DYNAMICALLY COMPILE ALL 19 REGULATORY FABRIC METRICS requested by the prompt ---
  const reportMetrics = useMemo(() => {
    const approved = filteredEntries.filter(e => e.status === 'approved');
    const target = approved.length > 0 ? approved : filteredEntries; // use filtered range as context

    // Inputs sum
    const total_used = target.reduce((acc, c) => acc + (c.fabric_used_kg || 0), 0);
    const total_remnants_issued = target.reduce((acc, c) => acc + (parseFloat(c.remarks) || 0), 0);
    const total_cutting_scrap = target.reduce((acc, c) => acc + (c.cutting_scrap_weight_kg || 0), 0);
    const total_spreading_scrap = target.reduce((acc, c) => acc + (c.remnant_weight_kg || 0), 0);
    const total_marker_scrap_kg = total_cutting_scrap;
    const total_length = target.reduce((acc, c) => acc + (c.total_length_inch || 0), 0);
    const total_used_fabric_inch_val = target.reduce((acc, c) => acc + (c.total_used_fabric_inch || (c.lay || 0) * (c.marker_length_inch || 0) * ((c.marker_efficiency_percent || 0) / 100)), 0);
    const total_cutting_qty_val = target.reduce((sum, e) => sum + ((Number(e.lay) || 0) * (Number(e.ratio) || 0)), 0);
    const total_lay_plies_val = target.reduce((sum, e) => sum + (Number(e.lay) || 0), 0);
    const total_ratio_val = target.reduce((sum, e) => sum + (Number(e.ratio) || 0), 0);
    const avg_size_ratio_val = target.length > 0 ? total_ratio_val / target.length : 0;

    // Derived fields
    const total_spread = Math.max(0, total_used - total_remnants_issued); // Spread fabric

    // Remnant calculations
    let total_remnants_weight_kg = 0;
    let total_remnants_scrap_kg = 0;
    let total_remnants_used_kg = 0;

    target.forEach(e => {
      const parsed = parseRemarksRemnants(e.remarks);
      total_remnants_weight_kg += parsed.remnants_weight_kg;
      total_remnants_scrap_kg += parsed.remnants_scrap_kg;
      total_remnants_used_kg += Math.max(0, parsed.remnants_weight_kg - parsed.remnants_scrap_kg);
    });

    const remnants_issued_percent = total_used > 0 ? (total_remnants_weight_kg / total_used) * 100 : 0;
    const remnants_scrap_percent = total_remnants_weight_kg > 0 ? (total_remnants_scrap_kg / total_remnants_weight_kg) * 100 : 0;
    const remnants_utilization_percent = total_remnants_weight_kg > 0 ? (total_remnants_used_kg / total_remnants_weight_kg) * 100 : 100;

    // Direct Scrap % metrics
    const cutting_scrap_percent = total_used > 0 ? (total_cutting_scrap / total_used) * 100 : 0;
    const spreading_scrap_percent = total_used > 0 ? (total_spreading_scrap / total_used) * 100 : 0;
    const actual_marker_scrap_percent = total_used > 0 ? (total_marker_scrap_kg / total_used) * 100 : 0;

    // Weighted marker efficiencies
    let totalWeightedTheoreticalEff = 0;
    let totalWeightedEteEff = 0;
    target.forEach(e => {
      totalWeightedTheoreticalEff += (e.marker_efficiency_percent || 0) * (e.fabric_used_kg || 0);
      totalWeightedEteEff += (e.actual_physical_marker_efficiency_ete || 0) * (e.fabric_used_kg || 0);
    });

    const marker_provided_efficiency_weighted = total_used > 0 ? totalWeightedTheoreticalEff / total_used : 0;
    const actual_ete_efficiency_weighted = total_used > 0 ? (1 - (total_marker_scrap_kg / total_used)) * 100 : 0;
    const efficiency_gap = marker_provided_efficiency_weighted - actual_ete_efficiency_weighted;

    return {
      total_used: total_used.toFixed(1),
      total_spread: total_spread.toFixed(1),
      actual_marker_scrap_kg: total_marker_scrap_kg.toFixed(1),
      actual_physical_ete_efficiency: actual_ete_efficiency_weighted.toFixed(1),
      marker_provided_efficiency_weighted: marker_provided_efficiency_weighted.toFixed(1),
      efficiency_gap: efficiency_gap.toFixed(1),
      spreading_scrap_kg: total_spreading_scrap.toFixed(1),
      actual_marker_scrap_percent: actual_marker_scrap_percent.toFixed(1),
      spreading_scrap_percent: spreading_scrap_percent.toFixed(1),
      remnants_fabric_issued: total_remnants_issued.toFixed(1),
      remnants_fabric_used: total_remnants_used_kg.toFixed(1),
      remnants_scrap: total_remnants_scrap_kg.toFixed(1),
      remnants_issued_percent: remnants_issued_percent.toFixed(1) + "%",
      remnants_scrap_percent: remnants_scrap_percent.toFixed(1) + "%",
      remnants_utilization: remnants_utilization_percent.toFixed(1) + "%",
      total_cutting_scrap: total_cutting_scrap.toFixed(1),
      total_cutting_scrap_percent: cutting_scrap_percent.toFixed(1),
      total_length: total_length.toLocaleString(),
      total_used_fabric_inch: total_used_fabric_inch_val.toLocaleString(undefined, { maximumFractionDigits: 1 }),
      total_cutting_qty: total_cutting_qty_val.toLocaleString(),
      avg_size_ratio: avg_size_ratio_val.toFixed(1),
      total_lay_plies: total_lay_plies_val.toLocaleString(),
      total_ratio: total_ratio_val.toFixed(1)
    };
  }, [filteredEntries]);

  // --- EXPORT TO EXCEL / CSV (WITH BEAUTIFUL STYLES) ---
  const exportToCSV = () => {
    if (reportSubView === 'consumption') {
      const headersList = [
        "Date", "Buyer", "Job", "Color", "Item", "PO", "Cut Num", "Cutting Qty", "Fabric Wt Used (KG)",
        "Booking Consumption", "Marker Consumption", "Booking Vs Marker Con", "Cutting Con", "Booking vs Cut con", "Fabric Save/Loss %", "Fabric Save/Loss (KG)", "Super Visor"
      ];

      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Daily Consumption Tracking</x:Name>
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
            .report-title { font-size: 16pt; font-weight: bold; color: #1F4E78; text-align: left; border: none; }
            .report-meta { font-size: 10pt; color: #595959; text-align: left; border: none; }
            .section-header { font-size: 12pt; font-weight: bold; color: #1F4E78; background-color: #D9E1F2; text-align: left; border: 1.5pt solid #8EA9DB; padding: 8px; }
            .ledger-header { background-color: #2F5597; color: #FFFFFF; font-weight: bold; text-align: center; }
            .ledger-row-even { background-color: #F2F2F2; }
            .ledger-row-odd { background-color: #FFFFFF; }
            .align-left { text-align: left; }
            .align-right { text-align: right; }
            .align-center { text-align: center; }
          </style>
        </head>
        <body>
          <table>
            <tr><td colspan="17" class="report-title" style="font-size: 16pt; font-weight: bold; color: #1F4E78;">DAILY CONSUMPTION TRACKING REPORT</td></tr>
            <tr><td colspan="17" class="report-meta" style="font-size: 10pt; color: #595959;">Wavely Cut Platform | Generated: ${formatDateTime(new Date().toISOString())}</td></tr>
            <tr><td colspan="17" class="report-meta" style="font-size: 10pt; color: #595959;">Total Records: ${filteredEntries.length}</td></tr>
          </table>

          <table>
            <thead>
              <tr>
                ${headersList.map(h => `<th class="ledger-header">${h}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${filteredEntries.map((e, idx) => {
                const totalCutQty = (e.lay || 0) * (e.ratio || 0);
                const bookingCons = e.booking_consumption !== undefined && e.booking_consumption !== null ? Number(e.booking_consumption) : null;
                const markerConsumption = (e.marker_consumption !== undefined && e.marker_consumption !== null) ? Number(e.marker_consumption) : null;
                const cuttingCons = totalCutQty > 0 ? (Number(e.fabric_used_kg) / totalCutQty) * 12 : null;

                const bookingVsMarker = (bookingCons !== null && markerConsumption !== null) ? (bookingCons - markerConsumption) : null;
                const bookingVsCut = (bookingCons !== null && cuttingCons !== null) ? (bookingCons - cuttingCons) : null;

                const formatExcelVal = (val: number | null) => {
                  if (val === null) return "-";
                  return val < 0 ? `Loss (${val.toFixed(3)})` : `Save (+${val.toFixed(3)})`;
                };

                const formatExcelPct = (val: number | null) => {
                  if (val === null) return "-";
                  return val.toFixed(1) + "%";
                };

                const formatExcelKg = (val: number | null) => {
                  if (val === null) return "-";
                  return val.toFixed(2);
                };

                const fabricSaveLossPct = (bookingCons && bookingVsCut !== null) ? (bookingVsCut / bookingCons) * 100 : null;
                const fabricSaveLossKg = (fabricSaveLossPct !== null && e.fabric_used_kg) ? e.fabric_used_kg * (fabricSaveLossPct / 100) : null;

                return `
                  <tr class="${idx % 2 === 0 ? 'ledger-row-even' : 'ledger-row-odd'}">
                    <td class="align-center">${formatDate(e.entry_date)}</td>
                    <td class="align-left">${e.buyer}</td>
                    <td class="align-center">${e.job_no}</td>
                    <td class="align-left">${e.color}</td>
                    <td class="align-left">${e.item}</td>
                    <td class="align-left">${e.po_no || "-"}</td>
                    <td class="align-center">${e.cut_no}</td>
                    <td class="align-right">${totalCutQty}</td>
                    <td class="align-right">${e.fabric_used_kg}</td>
                    <td class="align-right">${bookingCons !== null ? bookingCons.toFixed(3) : "-"}</td>
                    <td class="align-right">${markerConsumption !== null ? markerConsumption.toFixed(3) : "-"}</td>
                    <td class="align-right" style="color: ${bookingVsMarker !== null && bookingVsMarker < 0 ? '#C53030' : '#2F855A'}">${formatExcelVal(bookingVsMarker)}</td>
                    <td class="align-right">${cuttingCons !== null ? cuttingCons.toFixed(3) : "-"}</td>
                    <td class="align-right" style="color: ${bookingVsCut !== null && bookingVsCut < 0 ? '#C53030' : '#2F855A'}">${formatExcelVal(bookingVsCut)}</td>
                    <td class="align-right" style="color: ${fabricSaveLossPct !== null && fabricSaveLossPct < 0 ? '#C53030' : '#2F855A'}">${formatExcelPct(fabricSaveLossPct)}</td>
                    <td class="align-right" style="color: ${fabricSaveLossKg !== null && fabricSaveLossKg < 0 ? '#C53030' : '#2F855A'}">${formatExcelKg(fabricSaveLossKg)}</td>
                    <td class="align-left">${e.supervisor_name || "-"}</td>
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
      link.setAttribute("download", `daily_consumption_tracking_${new Date().toISOString().slice(0,10)}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const headers = [
      "Entry Date", "Shift", "Machine Name", "Buyer", "Job No", "Color", "Item", "PO No", "Cut No",
      "Lay Plies", "Size Ratio", "Total Cut Qty", "Table No", "Fabric Type", "Parts To Cut",
      "Fabric Weight Used (KG)", "Remnants Weight Issued (KG)", "Remnants Fabric Used (KG)", "Remnants Scrap (KG)", "Reject Pieces (Pcs)", "Spread Fabric (KG)", "Spreading Scrap (KG)", "Cutting Scrap (KG)",
      "Marker Length Inch", "Marker Efficiency %", "Total Marker Length(inch)", "Total Used Fabric (Inch)",
      "Scrap% as per Marker", "% of cutting scrap"
    ];

    const rows = filteredEntries.map(e => {
      const mc = machines.find(m => m.id === e.machine_id)?.machine_name || "Unknown Machine";
      const parsed = parseRemarksRemnants(e.remarks);
      const remnantsIssued = parsed.remnants_weight_kg;
      const remnantsScrap = parsed.remnants_scrap_kg;
      const remnantsUsed = Math.max(0, remnantsIssued - remnantsScrap);
      const rejectQty = parsed.reject_qty;
      const spreadWeight = Math.max(0, e.fabric_used_kg - remnantsIssued);
      const spreadingScrap = e.remnant_weight_kg || 0;
      const totalCutQty = (e.lay || 0) * (e.ratio || 0);
      const totalMarkerLength = (e.lay || 0) * (e.marker_length_inch || 0);
      const totalFabricUsedInch = (e.lay || 0) * (e.marker_length_inch || 0) * ((e.marker_efficiency_percent || 0) / 100);
      const scrapPercentAsPerMarker = 100 - (e.marker_efficiency_percent || 0);
      const percentageOfCuttingScrap = e.fabric_used_kg > 0 ? ((e.cutting_scrap_weight_kg || 0) / e.fabric_used_kg) * 100 : 0;

      return {
        date: e.entry_date,
        shift: e.shift === "A" ? "Day" : e.shift === "B" ? "Night" : e.shift,
        machine: mc,
        buyer: e.buyer,
        job: e.job_no,
        color: e.color,
        item: e.item,
        po: e.po_no || "-",
        cutNo: e.cut_no,
        lay: e.lay,
        ratio: e.ratio,
        totalCutQty: totalCutQty,
        tableNo: e.table_no,
        fabricType: e.fabric_type,
        parts: e.parts,
        fabricUsedKg: e.fabric_used_kg,
        remnantsWeight: remnantsIssued,
        remnantsUsed: remnantsUsed,
        remnantsScrap: remnantsScrap,
        rejectQty: rejectQty,
        spreadWeight: spreadWeight,
        spreadingScrap: spreadingScrap,
        cuttingScrap: e.cutting_scrap_weight_kg,
        markerLengthInch: e.marker_length_inch,
        markerEfficiency: e.marker_efficiency_percent,
        totalMarkerLength: totalMarkerLength,
        totalFabricUsedInch: totalFabricUsedInch,
        scrapPercentAsPerMarker: scrapPercentAsPerMarker,
        percentageOfCuttingScrap: percentageOfCuttingScrap
      };
    });

    // Group filtered entries by Month and then by Date
    const groups: { [month: string]: { [date: string]: CuttingEntry[] } } = {};
    filteredEntries.forEach(entry => {
      const dateStr = entry.entry_date || "Unknown Date";
      const monthStr = dateStr.includes("-") ? dateStr.substring(0, 7) : "Unknown Month";
      if (!groups[monthStr]) {
        groups[monthStr] = {};
      }
      if (!groups[monthStr][dateStr]) {
        groups[monthStr][dateStr] = [];
      }
      groups[monthStr][dateStr].push(entry);
    });

    const sortedMonths = Object.keys(groups).sort();

    const calculateMetrics = (target: CuttingEntry[]) => {
      const approved = target.filter(e => e.status === 'approved');
      const calcTarget = approved.length > 0 ? approved : target;

      const total_used = calcTarget.reduce((acc, c) => acc + (c.fabric_used_kg || 0), 0);
      const total_remnants_issued = calcTarget.reduce((acc, c) => acc + (parseFloat(c.remarks) || 0), 0);
      const total_cutting_scrap = calcTarget.reduce((acc, c) => acc + (c.cutting_scrap_weight_kg || 0), 0);
      const total_spreading_scrap = calcTarget.reduce((acc, c) => acc + (c.remnant_weight_kg || 0), 0);
      const total_marker_scrap_kg = total_cutting_scrap;
      const total_length = calcTarget.reduce((acc, c) => acc + (c.total_length_inch || 0), 0);
      const total_used_fabric_inch_val = calcTarget.reduce((acc, c) => acc + (c.total_used_fabric_inch || (c.lay || 0) * (c.marker_length_inch || 0) * ((c.marker_efficiency_percent || 0) / 100)), 0);

      const total_spread = Math.max(0, total_used - total_remnants_issued);
      
      // Remnants Calculations
      let total_remnants_weight_kg = 0;
      let total_remnants_scrap_kg = 0;
      let total_remnants_used_kg = 0;

      calcTarget.forEach(e => {
        const parsed = parseRemarksRemnants(e.remarks);
        total_remnants_weight_kg += parsed.remnants_weight_kg;
        total_remnants_scrap_kg += parsed.remnants_scrap_kg;
        total_remnants_used_kg += Math.max(0, parsed.remnants_weight_kg - parsed.remnants_scrap_kg);
      });

      const remnants_issued_percent = total_used > 0 ? (total_remnants_weight_kg / total_used) * 100 : 0;
      const remnants_scrap_percent = total_remnants_weight_kg > 0 ? (total_remnants_scrap_kg / total_remnants_weight_kg) * 100 : 0;
      const remnants_utilization_percent = total_remnants_weight_kg > 0 ? (total_remnants_used_kg / total_remnants_weight_kg) * 100 : 100;

      const cutting_scrap_percent = total_used > 0 ? (total_cutting_scrap / total_used) * 100 : 0;
      const spreading_scrap_percent = total_used > 0 ? (total_spreading_scrap / total_used) * 100 : 0;
      const actual_marker_scrap_percent = total_used > 0 ? (total_marker_scrap_kg / total_used) * 100 : 0;

      let totalWeightedTheoreticalEff = 0;
      let totalWeightedEteEff = 0;
      calcTarget.forEach(e => {
        totalWeightedTheoreticalEff += (e.marker_efficiency_percent || 0) * (e.fabric_used_kg || 0);
        totalWeightedEteEff += (e.actual_physical_marker_efficiency_ete || 0) * (e.fabric_used_kg || 0);
      });

      const marker_provided_efficiency_weighted = total_used > 0 ? totalWeightedTheoreticalEff / total_used : 0;
      const actual_ete_efficiency_weighted = total_used > 0 ? (1 - (total_marker_scrap_kg / total_used)) * 100 : 0;
      const efficiency_gap = marker_provided_efficiency_weighted - actual_ete_efficiency_weighted;

      return {
        total_used: total_used.toFixed(1),
        total_spread: total_spread.toFixed(1),
        actual_marker_scrap_kg: total_marker_scrap_kg.toFixed(1),
        actual_physical_ete_efficiency: actual_ete_efficiency_weighted.toFixed(1) + "%",
        marker_provided_efficiency_weighted: marker_provided_efficiency_weighted.toFixed(1) + "%",
        efficiency_gap: efficiency_gap.toFixed(1) + "%",
        spreading_scrap_kg: total_spreading_scrap.toFixed(1),
        actual_marker_scrap_percent: actual_marker_scrap_percent.toFixed(1) + "%",
        spreading_scrap_percent: spreading_scrap_percent.toFixed(1) + "%",
        remnants_fabric_issued: total_remnants_issued.toFixed(1),
        remnants_fabric_used: total_remnants_used_kg.toFixed(1),
        remnants_scrap: total_remnants_scrap_kg.toFixed(1),
        remnants_issued_percent: remnants_issued_percent.toFixed(1) + "%",
        remnants_scrap_percent: remnants_scrap_percent.toFixed(1) + "%",
        remnants_utilization: remnants_utilization_percent.toFixed(1) + "%",
        total_cutting_scrap: total_cutting_scrap.toFixed(1),
        total_cutting_scrap_percent: cutting_scrap_percent.toFixed(1) + "%",
        total_length: total_length.toLocaleString(),
        total_used_fabric_inch: total_used_fabric_inch_val.toLocaleString(undefined, { maximumFractionDigits: 1 })
      };
    };

    const formatMonthName = (yearMonth: string) => {
      if (yearMonth === "Unknown Month") return yearMonth;
      const [year, month] = yearMonth.split("-");
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const idx = parseInt(month, 10) - 1;
      return idx >= 0 && idx < 12 ? `${monthNames[idx]} ${year}` : yearMonth;
    };

    let summaryRowsHtml = "";

    sortedMonths.forEach(month => {
      const dateMap = groups[month];
      const sortedDates = Object.keys(dateMap).sort();

      sortedDates.forEach(date => {
        const dateEntries = dateMap[date];
        const m = calculateMetrics(dateEntries);
        summaryRowsHtml += `
          <tr>
            <td style="text-align: center; font-weight: normal; background-color: #FFFFFF;">${date}</td>
            <td class="cell-default">${m.total_used}</td>
            <td class="cell-green">${m.total_spread}</td>
            <td class="cell-default">${m.actual_marker_scrap_kg}</td>
            <td class="cell-green">${m.actual_physical_ete_efficiency}</td>
            <td class="cell-default">${m.marker_provided_efficiency_weighted}</td>
            <td class="cell-green">${m.efficiency_gap}</td>

            <td class="cell-default">${m.spreading_scrap_kg}</td>
            <td class="cell-green">${m.actual_marker_scrap_percent}</td>
            <td class="cell-green">${m.spreading_scrap_percent}</td>

            <td class="cell-default">${m.remnants_fabric_issued}</td>
            <td class="cell-green">${m.remnants_fabric_used}</td>
            <td class="cell-default">${m.remnants_scrap}</td>
            <td class="cell-green">${m.remnants_issued_percent}</td>
            <td class="cell-green">${m.remnants_scrap_percent}</td>
            <td class="cell-green">${m.remnants_utilization}</td>

            <td class="cell-default">${m.total_cutting_scrap}</td>
            <td class="cell-green">${m.total_cutting_scrap_percent}</td>
            <td class="cell-default">${m.total_length}</td>
            <td class="cell-blue">${m.total_used_fabric_inch}</td>
          </tr>
        `;
      });

      const monthEntries: CuttingEntry[] = [];
      sortedDates.forEach(date => {
        monthEntries.push(...dateMap[date]);
      });
      const mMonth = calculateMetrics(monthEntries);
      summaryRowsHtml += `
        <tr style="font-weight: bold; background-color: #D9E1F2;">
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${formatMonthName(month)} Total</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.total_used}</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.total_spread}</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.actual_marker_scrap_kg}</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.actual_physical_ete_efficiency}</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.marker_provided_efficiency_weighted}</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.efficiency_gap}</td>

          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.spreading_scrap_kg}</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.actual_marker_scrap_percent}</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.spreading_scrap_percent}</td>

          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.remnants_fabric_issued}</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.remnants_fabric_used}</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.remnants_scrap}</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.remnants_issued_percent}</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.remnants_scrap_percent}</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.remnants_utilization}</td>

          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.total_cutting_scrap}</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.total_cutting_scrap_percent}</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.total_length}</td>
          <td style="text-align: center; font-weight: bold; background-color: #D9E1F2;">${mMonth.total_used_fabric_inch}</td>
        </tr>
      `;
    });

    summaryRowsHtml += `
      <tr style="font-weight: bold; background-color: #BDD7EE;">
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">Overall Total</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.total_used}</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.total_spread}</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.actual_marker_scrap_kg}</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.actual_physical_ete_efficiency}%</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.marker_provided_efficiency_weighted}%</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.efficiency_gap}%</td>

        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.spreading_scrap_kg}</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.actual_marker_scrap_percent}%</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.spreading_scrap_percent}%</td>

        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.remnants_fabric_issued}</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.remnants_fabric_used}</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.remnants_scrap}</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.remnants_issued_percent}</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.remnants_scrap_percent}</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.remnants_utilization}</td>

        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.total_cutting_scrap}</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.total_cutting_scrap_percent}%</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.total_length}</td>
        <td style="text-align: center; font-weight: bold; background-color: #BDD7EE;">${reportMetrics.total_used_fabric_inch}</td>
      </tr>
    `;

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Cutting Ledger</x:Name>
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
          <tr><td colspan="29" class="report-title" style="font-size: 16pt; font-weight: bold; color: #1F4E78;">GARMENTS CUTTING LEDGER REPORT</td></tr>
          <tr><td colspan="29" class="report-meta" style="font-size: 10pt; color: #595959;">Wavely Cut Platform | Generated: ${formatDateTime(new Date().toISOString())}</td></tr>
          <tr><td colspan="29" class="report-meta" style="font-size: 10pt; color: #595959;">Total Records: ${filteredEntries.length}</td></tr>
        </table>

        <table>
          <tr><td colspan="20" class="section-header">DATE-WISE MONTHLY OVERALL FABRIC METRICS SUMMARY</td></tr>
        </table>

        <table>
          <thead>
            <tr>
              <th style="background-color: #1F4E78; color: #FFFFFF; font-weight: bold; text-align: center; font-size: 10pt; padding: 6px 12px;" rowspan="2">Period / Date</th>
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
            ${summaryRowsHtml}
          </tbody>
        </table>

        <table>
          <tr><td colspan="29" class="section-header">DETAILED LEDGER RECORDS</td></tr>
        </table>

        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th class="ledger-header">${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, idx) => `
              <tr class="${idx % 2 === 0 ? 'ledger-row-even' : 'ledger-row-odd'}">
                <td class="align-center">${r.date}</td>
                <td class="align-center">${r.shift}</td>
                <td class="align-left">${r.machine}</td>
                <td class="align-left">${r.buyer}</td>
                <td class="align-center">${r.job}</td>
                <td class="align-left">${r.color}</td>
                <td class="align-left">${r.item}</td>
                <td class="align-left">${r.po}</td>
                <td class="align-center">${r.cutNo}</td>
                <td class="align-right">${r.lay}</td>
                <td class="align-right">${r.ratio}</td>
                <td class="align-right">${r.totalCutQty}</td>
                <td class="align-center">${r.tableNo}</td>
                <td class="align-left">${r.fabricType}</td>
                <td class="align-left">${r.parts}</td>
                <td class="align-right">${Number(r.fabricUsedKg).toFixed(2)}</td>
                <td class="align-right">${Number(r.remnantsWeight).toFixed(2)}</td>
                <td class="align-right">${Number(r.remnantsUsed).toFixed(2)}</td>
                <td class="align-right">${Number(r.remnantsScrap).toFixed(2)}</td>
                <td class="align-right">${Number(r.rejectQty).toLocaleString()}</td>
                <td class="align-right">${Number(r.spreadWeight).toFixed(2)}</td>
                <td class="align-right">${Number(r.spreadingScrap).toFixed(2)}</td>
                <td class="align-right">${Number(r.cuttingScrap).toFixed(2)}</td>
                <td class="align-right">${Number(r.markerLengthInch).toFixed(2)}</td>
                <td class="align-right">${Number(r.markerEfficiency).toFixed(2)}%</td>
                <td class="align-right">${Number(r.totalMarkerLength).toFixed(2)}</td>
                <td class="align-right">${Number(r.totalFabricUsedInch).toFixed(2)}</td>
                <td class="align-right">${Number(r.scrapPercentAsPerMarker).toFixed(2)}%</td>
                <td class="align-right">${Number(r.percentageOfCuttingScrap).toFixed(2)}%</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `garments_cutting_ledger_${new Date().toISOString().slice(0,10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Search and Advanced filter controls panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs print:hidden">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-slate-850">
          <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Filter size={14} className="text-[#2563EB] stroke-[2.5]" /> Filter & Search Ledgers
          </span>
          <button 
            onClick={resetFilters}
            className="text-xs text-slate-400 hover:text-rose-500 transition cursor-pointer font-bold uppercase tracking-wider"
          >
            Reset Filters
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-6 2k:grid-cols-8 gap-4 text-xs">
          
          {/* Calendar Date range */}
          <div className="space-y-1.5 col-span-1 md:col-span-2 lg:col-span-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Cut Date Start/End</label>
            <div className="flex items-center space-x-2">
              <CustomDatePicker 
                selectedDate={dateStart} 
                onChange={date => { setDateStart(date); setCurrentPage(1); }}
                placeholderText="Start Date"
              />
              <span className="text-slate-400 text-[10px] font-black">TO</span>
              <CustomDatePicker 
                selectedDate={dateEnd} 
                onChange={date => { setDateEnd(date); setCurrentPage(1); }}
                placeholderText="End Date"
              />
            </div>
          </div>

          {/* Machine & Buyer */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Cutter Machine</label>
            <select
              value={filterMachine}
              onChange={e => { setFilterMachine(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-750 dark:text-slate-200 transition cursor-pointer shadow-xs"
            >
              <option value="">All Machines</option>
              {dynamicMachines.map(m => <option key={m.id} value={m.id}>{m.machine_name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Buyer Partner</label>
            <select
              value={filterBuyer}
              onChange={e => { setFilterBuyer(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-750 dark:text-slate-200 transition cursor-pointer shadow-xs"
            >
              <option value="">All Buyers</option>
              {dynamicBuyers.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Fabric Type & Shift */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Fabric Type</label>
            <select
              value={filterFabricType}
              onChange={e => { setFilterFabricType(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-750 dark:text-slate-200 transition cursor-pointer shadow-xs"
            >
              <option value="">All Fabrics</option>
              {dynamicFabricTypes.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Production Shift</label>
            <select
              value={filterShift}
              onChange={e => { setFilterShift(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-750 dark:text-slate-200 transition cursor-pointer shadow-xs"
            >
              <option value="">All Shifts</option>
              {dynamicShifts.map(s => <option key={s} value={s}>{s === "A" ? "Day" : s === "B" ? "Night" : s} Shift</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Color</label>
            <select
              value={filterColor}
              onChange={e => { setFilterColor(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-750 dark:text-slate-200 transition cursor-pointer shadow-xs"
            >
              <option value="">All Colors</option>
              {dynamicColors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Table wise filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Operational Table</label>
            <select
              value={filterTable}
              onChange={e => { setFilterTable(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-750 dark:text-slate-200 transition cursor-pointer shadow-xs"
            >
              <option value="">All Tables</option>
              {dynamicTables.map(t => <option key={t} value={t}>Table {t}</option>)}
            </select>
          </div>

          {/* Supervisor wise filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Supervisor</label>
            <select
              value={filterSupervisor}
              onChange={e => { setFilterSupervisor(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-750 dark:text-slate-200 transition cursor-pointer shadow-xs"
            >
              <option value="">All Supervisors</option>
              {dynamicSupervisors.map(sv => <option key={sv} value={sv}>{sv}</option>)}
            </select>
          </div>

          {/* Operator */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Created By</label>
            <select
              value={filterOperator}
              onChange={e => { setFilterOperator(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-750 dark:text-slate-200 transition cursor-pointer shadow-xs"
            >
              <option value="">All Operators</option>
              {dynamicOperators.map(op => (
                <option key={op.email} value={op.email}>{op.full_name}</option>
              ))}
            </select>
          </div>

          {/* Text Search field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Free search</label>
            <div className="relative">
              <input 
                type="text"
                placeholder="Search Cut No, Job No..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-750 dark:text-slate-200 transition placeholder-slate-450 shadow-xs"
              />
              <Search className="absolute left-3 top-3 text-slate-400" size={14} />
            </div>
          </div>

        </div>
      </div>

      {/* REPORTS SUB-TAB NAVIGATION */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-black uppercase tracking-wider pb-px print:hidden mt-2 mb-6 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveReportsTab('ledger')}
          className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeReportsTab === 'ledger'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-350'
          }`}
        >
          <BarChart size={14} className="stroke-[2.5]" />
          Ledger & Performance Audits
        </button>

        <button
          onClick={() => {
            setActiveReportsTab('cutting_ledger');
            setReportSubView('ledger');
          }}
          className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeReportsTab === 'cutting_ledger'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-350'
          }`}
        >
          <FileSpreadsheet size={14} className="stroke-[2.5]" />
          Garments Cutting Ledger Report
        </button>

        <button
          onClick={() => {
            setActiveReportsTab('consumption_report');
            setReportSubView('consumption');
          }}
          className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeReportsTab === 'consumption_report'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-350'
          }`}
        >
          <FileSpreadsheet size={14} className="stroke-[2.5]" />
          Daily Consumption Tracking Report
        </button>

        {currentProfile.can_access_remnant_entry === false ? (
          <div 
            className="pb-3 border-b-2 border-transparent text-slate-300 dark:text-slate-600 flex items-center gap-2 cursor-not-allowed select-none shrink-0"
            title="Remnant Entry requires active Remnants clearance."
          >
            <Lock size={14} className="stroke-[2.5]" />
            <span>Remnant Entry</span>
          </div>
        ) : (
          <button
            onClick={() => setActiveReportsTab('remnants')}
            className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeReportsTab === 'remnants'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-350'
            }`}
          >
            <FileSpreadsheet size={14} className="stroke-[2.5]" />
            Remnant Entry
          </button>
        )}
      </div>

      {activeReportsTab === 'ledger' && (
        <>
          {/* METRICS ACCORDION BREAKDOWN */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-sans font-extrabold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Aggregated Ledger Performance ({filteredEntries.length} Records)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Every calculated physical fabric metric and cutting yield is compiled dynamically.
            </p>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg">
            Contextual Dynamic Scope
          </span>
        </div>

        {/* BENTO SECTION 1: Core Fabric & Production Volumes */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Core Fabric & Production Volumes
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs hover:border-blue-500/20 transition-all">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-black uppercase tracking-wider mb-1">Total Used Fabric</span>
              <span className="font-mono text-slate-850 dark:text-slate-100 font-extrabold text-base">{reportMetrics.total_used} KG</span>
              <span className="text-[9px] text-slate-400 block mt-1.5">Cumulative scale weight</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs hover:border-blue-500/20 transition-all">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-black uppercase tracking-wider mb-1">Total Spreading Spread</span>
              <span className="font-mono text-slate-850 dark:text-slate-100 font-extrabold text-base">{reportMetrics.total_spread} KG</span>
              <span className="text-[9px] text-slate-400 block mt-1.5">Laying phase input weight</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs hover:border-blue-500/20 transition-all">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-black uppercase tracking-wider mb-1">Total Lay Qty</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold text-base">{reportMetrics.total_lay_plies} Plies</span>
              <span className="text-[9px] text-slate-400 block mt-1.5">Sum of all lay plies</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs hover:border-violet-500/20 transition-all flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-black uppercase tracking-wider mb-1">Size Ratios</span>
                <span className="font-mono text-violet-600 dark:text-violet-400 font-extrabold text-base">{reportMetrics.total_ratio} <span className="text-[9px] text-slate-400">Total</span></span>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800/80 mt-2 pt-2 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 uppercase tracking-wider font-bold">Avg Ratio:</span>
                <span className="font-mono text-slate-850 dark:text-slate-100 font-extrabold">{reportMetrics.avg_size_ratio}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs hover:border-blue-500/20 transition-all">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-black uppercase tracking-wider mb-1">Total Cut Quantity</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold text-base">{reportMetrics.total_cutting_qty} Pcs</span>
              <span className="text-[9px] text-slate-400 block mt-1.5">Pieces cut (Ratio × Lay)</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs hover:border-blue-500/20 transition-all">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-black uppercase tracking-wider mb-1">Total Lay Length</span>
              <span className="font-mono text-slate-850 dark:text-slate-100 font-extrabold text-base">{reportMetrics.total_length} In.</span>
              <span className="text-[9px] text-slate-400 block mt-1.5">Lay plies linear inches</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs hover:border-blue-500/20 transition-all">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-black uppercase tracking-wider mb-1">Effective Cut Inches</span>
              <span className="font-mono text-slate-850 dark:text-slate-100 font-extrabold text-base">{reportMetrics.total_used_fabric_inch} In.</span>
              <span className="text-[9px] text-slate-400 block mt-1.5">Lay × Length × Eff %</span>
            </div>
          </div>
        </div>

        {/* BENTO SECTION 2: Scrap & Waste Auditing */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Scrap & Waste Auditing
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs hover:border-rose-500/20 transition-all">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-black uppercase tracking-wider mb-1">Spreading Scrap</span>
              <span className="font-mono text-rose-600 dark:text-rose-400 font-extrabold text-base">{reportMetrics.spreading_scrap_kg} KG</span>
              <span className="text-xs text-amber-500 font-black">({reportMetrics.spreading_scrap_percent}%)</span>
              <span className="text-[9px] text-slate-400 block mt-1">End bits/laying remnants</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs hover:border-rose-500/20 transition-all">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-black uppercase tracking-wider mb-1">Cutting Scrap</span>
              <span className="font-mono text-rose-600 dark:text-rose-400 font-extrabold text-base">{reportMetrics.total_cutting_scrap} KG</span>
              <span className="text-xs text-rose-500 font-black">({reportMetrics.total_cutting_scrap_percent}%)</span>
              <span className="text-[9px] text-slate-400 block mt-1">Between panels net waste</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs hover:border-rose-500/20 transition-all">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-black uppercase tracking-wider mb-1">Actual Marker Scrap</span>
              <span className="font-mono text-rose-600 dark:text-rose-400 font-extrabold text-base">{reportMetrics.actual_marker_scrap_kg} KG</span>
              <span className="text-xs text-rose-500 font-black">({reportMetrics.actual_marker_scrap_percent}%)</span>
              <span className="text-[9px] text-slate-400 block mt-1">Net processed marker waste</span>
            </div>
          </div>
        </div>

        {/* BENTO SECTION 3: Efficiency & Variance Indicators */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Efficiency & Variance Indicators
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50/40 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-2xl shadow-xs hover:border-emerald-500/30 transition-all">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-black uppercase tracking-wider mb-1">Marker Yield (End-to-End)</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-base">{reportMetrics.actual_physical_ete_efficiency}%</span>
              <span className="text-[9px] text-slate-400 block mt-1">True usable physical output yield</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs hover:border-emerald-500/20 transition-all">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-black uppercase tracking-wider mb-1">Weighted CAD Efficiency</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-extrabold text-base">{reportMetrics.marker_provided_efficiency_weighted}%</span>
              <span className="text-[9px] text-slate-400 block mt-1.5">CAD theoretical marker limit</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs hover:border-rose-500/20 transition-all">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-black uppercase tracking-wider mb-1">ETE Efficiency Gap</span>
              <span className="font-mono text-rose-600 dark:text-rose-400 font-extrabold text-base">{reportMetrics.efficiency_gap}%</span>
              <span className="text-[9px] text-slate-400 block mt-1.5">Theoretical vs. physical gap</span>
            </div>
          </div>
        </div>

      </div>
      </>
      )}

      {(activeReportsTab === 'cutting_ledger' || activeReportsTab === 'consumption_report') && (
        <>
        {/* MAIN DATA TABLES & ACTION LEDGERS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs animate-fade-in">
          
          {/* Table Title and Export */}
          <div className="p-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <h3 className="font-sans font-black text-xs uppercase tracking-wider text-slate-850 dark:text-slate-100 whitespace-nowrap">
                {activeReportsTab === 'cutting_ledger' ? 'Garments Cutting Ledger Report' : 'Daily Consumption Tracking Report'}
              </h3>
            </div>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 py-2 px-4 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs"
            >
              <Printer size={13} className="stroke-[2.5]" /> Print Report
            </button>
            <button
              onClick={exportToCSV}
              className="bg-[#2563EB] hover:bg-blue-700 text-white py-2 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition"
              title="Export filtered records to Comma-Separated CSV (Excel-Compatible)"
            >
              <Download size={13} className="stroke-[2.5]" /> Export Excel / CSV
            </button>
          </div>
        </div>

        {/* Dense Table wrapper */}
        <div className="overflow-x-auto">
          {reportSubView === 'ledger' ? (
            <table className="w-full text-left border-collapse text-xs min-w-[2450px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="p-4 pl-5 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("entry_date")}>
                    Date {sortField === "entry_date" && (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th className="p-4 whitespace-nowrap">Shift</th>
                  <th className="p-4 whitespace-nowrap">Machine</th>
                  <th className="p-4 whitespace-nowrap">Buyer</th>
                  <th className="p-4 whitespace-nowrap">Job No</th>
                  <th className="p-4 whitespace-nowrap">PO No</th>
                  <th className="p-4 whitespace-nowrap">Color</th>
                  <th className="p-4 whitespace-nowrap">Item</th>
                  <th className="p-4 whitespace-nowrap">Cut No</th>
                  <th className="p-4 text-right whitespace-nowrap">Lay Plies</th>
                  <th className="p-4 text-right whitespace-nowrap">Size Ratio</th>
                  <th className="p-4 text-right whitespace-nowrap">Total Cut Qty</th>
                  <th className="p-4 whitespace-nowrap">Table No</th>
                  <th className="p-4 whitespace-nowrap">Fabric Type</th>
                  <th className="p-4 whitespace-nowrap">Parts To Cut</th>
                  <th className="p-4 text-right whitespace-nowrap">Fabric Wt Used (KG)</th>
                  <th className="p-4 text-right whitespace-nowrap">Remnants Fabric (KG)</th>
                  <th className="p-4 text-right whitespace-nowrap">Spread Fabric (KG)</th>
                  <th className="p-4 text-right whitespace-nowrap">Spreading Scrap (KG)</th>
                  <th className="p-4 text-right whitespace-nowrap">Cutting Scrap (KG)</th>
                  <th className="p-4 text-right whitespace-nowrap">Marker Length Inch</th>
                  <th className="p-4 text-right whitespace-nowrap">Marker Efficiency %</th>
                  <th className="p-4 text-right whitespace-nowrap">Total Marker Len (In)</th>
                  <th className="p-4 text-right whitespace-nowrap">Total Used Fabric (Inch)</th>
                  <th className="p-4 text-right whitespace-nowrap">Scrap% per Marker</th>
                  <th className="p-4 text-right whitespace-nowrap">% of Cutting Scrap</th>
                  <th className="p-4 text-center whitespace-nowrap">Status</th>
                  <th className="p-4 text-right pr-5 whitespace-nowrap print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={27} className="text-center p-12 text-xs text-slate-400">
                      No matching cutting logs resolved the active filter options.
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map(entry => {
                    const mName = machines.find(m => m.id === entry.machine_id)?.machine_name || "Unknown";
                    const remnantsWeight = parseFloat(entry.remarks) || 0;
                    const spreadWeight = Math.max(0, entry.fabric_used_kg - remnantsWeight);
                    const spreadingScrap = entry.remnant_weight_kg || 0;
                    const totalCutQty = (entry.lay || 0) * (entry.ratio || 0);
                    const totalMarkerLength = (entry.lay || 0) * (entry.marker_length_inch || 0);
                    const totalFabricUsedInch = (entry.lay || 0) * (entry.marker_length_inch || 0) * ((entry.marker_efficiency_percent || 0) / 100);
                    const scrapPercentAsPerMarker = 100 - (entry.marker_efficiency_percent || 0);
                    const percentageOfCuttingScrap = entry.fabric_used_kg > 0 ? ((entry.cutting_scrap_weight_kg || 0) / entry.fabric_used_kg) * 100 : 0;
                    
                    return (
                       <tr 
                        key={entry.id} 
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        <td className="p-4 pl-5 font-bold whitespace-nowrap">{formatDate(entry.entry_date)}</td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[10px] font-black text-slate-600 dark:text-slate-400">
                            {entry.shift === "A" ? "Day" : entry.shift === "B" ? "Night" : entry.shift}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{mName}</td>
                        <td className="p-4 font-extrabold truncate max-w-[120px] text-slate-850 dark:text-slate-100 whitespace-nowrap">{entry.buyer}</td>
                        <td className="p-4 font-mono text-slate-450 dark:text-slate-500 whitespace-nowrap">{entry.job_no}</td>
                        <td className="p-4 font-mono text-slate-500 whitespace-nowrap">{entry.po_no || "-"}</td>
                        <td className="p-4 font-medium whitespace-nowrap">{entry.color}</td>
                        <td className="p-4 font-medium whitespace-nowrap">{entry.item}</td>
                        <td className="p-4 font-mono font-black text-slate-800 dark:text-slate-100 whitespace-nowrap">{entry.cut_no}</td>
                        <td className="p-4 text-right font-mono font-bold whitespace-nowrap">{entry.lay}</td>
                        <td className="p-4 text-right font-mono font-bold whitespace-nowrap">{entry.ratio}</td>
                        <td className="p-4 text-right font-mono font-black text-[#2563EB] whitespace-nowrap">{totalCutQty}</td>
                        <td className="p-4 font-mono font-medium whitespace-nowrap">{entry.table_no}</td>
                        <td className="p-4 font-medium whitespace-nowrap">{entry.fabric_type}</td>
                        <td className="p-4 font-medium whitespace-nowrap max-w-[140px] truncate" title={entry.parts}>{entry.parts}</td>
                        <td className="p-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{entry.fabric_used_kg} kg</td>
                        <td className="p-4 text-right font-mono text-slate-500 whitespace-nowrap">{remnantsWeight.toFixed(1)} kg</td>
                        <td className="p-4 text-right font-mono text-slate-500 whitespace-nowrap">{spreadWeight.toFixed(1)} kg</td>
                        <td className="p-4 text-right font-mono text-slate-500 whitespace-nowrap">{spreadingScrap} kg</td>
                        <td className="p-4 text-right font-mono text-slate-550 whitespace-nowrap">{entry.cutting_scrap_weight_kg} kg</td>
                        <td className="p-4 text-right font-mono text-slate-550 whitespace-nowrap">{entry.marker_length_inch} in</td>
                        <td className="p-4 text-right font-mono text-slate-550 whitespace-nowrap">{entry.marker_efficiency_percent}%</td>
                        <td className="p-4 text-right font-mono font-bold text-[#2563EB] whitespace-nowrap">{totalMarkerLength.toFixed(1)} in</td>
                        <td className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{totalFabricUsedInch.toFixed(1)} in</td>
                        <td className="p-4 text-right font-mono text-slate-550 whitespace-nowrap">{scrapPercentAsPerMarker}%</td>
                        <td className={`p-4 text-right font-mono font-bold whitespace-nowrap ${percentageOfCuttingScrap > 5 ? "text-amber-600" : "text-slate-500 dark:text-slate-400"}`}>
                          {percentageOfCuttingScrap.toFixed(2)}%
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] uppercase font-black border ${
                            entry.status === 'approved' 
                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                              : entry.status === 'submitted'
                              ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
                              : "bg-slate-50 dark:bg-slate-800/40 text-slate-550 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-5 whitespace-nowrap print:hidden">
                          <div className="flex items-center justify-end space-x-1.5">
                            
                            {/* Operator/S&A: Submit Draft Action Button */}
                            {entry.status === "draft" && (
                              (currentProfile.role === "operator" && entry.created_by.toLowerCase() === currentProfile.email.toLowerCase()) || 
                              (currentProfile.role === "supervisor" || currentProfile.role === "admin")
                            ) && onSubmitDraft && (
                              <button
                                onClick={() => {
                                  onSubmitDraft(entry);
                                }}
                                className="text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-50/40 p-1.5 rounded-lg transition cursor-pointer border border-blue-200/50"
                                title="Commit & Submit (Auto-Approve)"
                              >
                                <Send size={13} className="stroke-[2.5]" />
                              </button>
                            )}
  
                            {/* S&A: Approve Action Button */}
                            {entry.status !== "approved" && entry.status !== "draft" && (currentProfile.role === "supervisor" || currentProfile.role === "admin") && (
                              <button
                                onClick={() => {
                                  onApproveEntry(entry.id);
                                }}
                                className="text-emerald-600 hover:text-white hover:bg-[#10B981] bg-emerald-50/40 p-1.5 rounded-lg transition cursor-pointer border border-emerald-200/50"
                                title="Approve Cutting Card"
                              >
                                <CheckCircle size={13} className="stroke-[2.5]" />
                              </button>
                            )}
  
                            {/* Only Admin and Officer (supervisor) can edit records */}
                            {(currentProfile.role === "supervisor" || currentProfile.role === "admin") && (
                              <button
                                onClick={() => onSelectEditEntry && onSelectEditEntry(entry)}
                                className="text-slate-700 hover:text-white hover:bg-slate-800 bg-slate-100 p-1.5 rounded-lg transition cursor-pointer border border-slate-200"
                                title="Edit Log"
                              >
                                <Edit3 size={13} />
                              </button>
                            )}
  
                            {/* S&A: Delete Action Button */}
                            {(currentProfile.role === "supervisor" || currentProfile.role === "admin") && (
                              <button
                                onClick={() => {
                                  setEntryToDelete(entry);
                                }}
                                className="text-rose-600 hover:text-white hover:bg-rose-500 bg-rose-500/10 p-1.5 rounded-lg transition cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
  
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse text-xs min-w-[1500px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="p-4 pl-5 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("entry_date")}>
                    Date {sortField === "entry_date" && (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th className="p-4 whitespace-nowrap">Buyer</th>
                  <th className="p-4 whitespace-nowrap">Job</th>
                  <th className="p-4 whitespace-nowrap">PO</th>
                  <th className="p-4 whitespace-nowrap">Color</th>
                  <th className="p-4 whitespace-nowrap">Item</th>
                  <th className="p-4 whitespace-nowrap">Cut Num</th>
                  <th className="p-4 text-right whitespace-nowrap">Cutting Qty</th>
                  <th className="p-4 text-right whitespace-nowrap">Fabric Wt Used (KG)</th>
                  <th className="p-4 text-right whitespace-nowrap">Booking Consumption</th>
                  <th className="p-4 text-right whitespace-nowrap">Marker Cons</th>
                  <th className="p-4 text-right whitespace-nowrap">Booking vs Marker Con</th>
                  <th className="p-4 text-right whitespace-nowrap">Cutting Con</th>
                  <th className="p-4 text-right whitespace-nowrap">Booking vs Cut Con</th>
                  <th className="p-4 text-right whitespace-nowrap">Fabric Save/Loss %</th>
                  <th className="p-4 text-right whitespace-nowrap">Fabric Save/Loss (KG)</th>
                  <th className="p-4 whitespace-nowrap">Supervisor</th>
                  <th className="p-4 text-right pr-5 whitespace-nowrap print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="text-center p-12 text-xs text-slate-400">
                      No matching cutting logs resolved the active filter options.
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map(entry => {
                    const totalCutQty = (entry.lay || 0) * (entry.ratio || 0);
                    const bookingCons = entry.booking_consumption !== undefined && entry.booking_consumption !== null ? Number(entry.booking_consumption) : null;
                    const markerCons = (entry.marker_consumption !== undefined && entry.marker_consumption !== null) ? Number(entry.marker_consumption) : null;
                    const cuttingCons = totalCutQty > 0 ? (Number(entry.fabric_used_kg) / totalCutQty) * 12 : null;

                    const bookingVsMarker = (bookingCons !== null && markerCons !== null) ? (bookingCons - markerCons) : null;
                    const bookingVsCut = (bookingCons !== null && cuttingCons !== null) ? (bookingCons - cuttingCons) : null;
                    const fabricSaveLossPct = (bookingCons && bookingVsCut !== null) ? (bookingVsCut / bookingCons) * 100 : null;
                    const fabricSaveLossKg = (fabricSaveLossPct !== null && entry.fabric_used_kg) ? entry.fabric_used_kg * (fabricSaveLossPct / 100) : null;

                    return (
                      <tr 
                        key={entry.id} 
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        <td className="p-4 pl-5 font-bold whitespace-nowrap">{formatDate(entry.entry_date)}</td>
                        <td className="p-4 font-extrabold truncate max-w-[120px] text-slate-850 dark:text-slate-100 whitespace-nowrap">{entry.buyer}</td>
                        <td className="p-4 font-mono text-slate-450 dark:text-slate-500 whitespace-nowrap">{entry.job_no}</td>
                        <td className="p-4 font-mono text-slate-500 whitespace-nowrap">{entry.po_no || "-"}</td>
                        <td className="p-4 font-medium whitespace-nowrap">{entry.color}</td>
                        <td className="p-4 font-medium whitespace-nowrap">{entry.item}</td>
                        <td className="p-4 font-mono font-black text-slate-800 dark:text-slate-100 whitespace-nowrap">{entry.cut_no}</td>
                        <td className="p-4 text-right font-mono font-black text-[#2563EB] whitespace-nowrap">{totalCutQty}</td>
                        <td className="p-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{entry.fabric_used_kg}</td>
                        <td className="p-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {bookingCons !== null ? bookingCons.toFixed(3) : "-"}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-500 whitespace-nowrap">
                          {markerCons !== null ? markerCons.toFixed(3) : "-"}
                        </td>
                        <td className={`p-4 text-right font-mono font-extrabold whitespace-nowrap ${bookingVsMarker !== null && bookingVsMarker < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {bookingVsMarker !== null ? (
                            bookingVsMarker < 0 
                              ? `Loss (${bookingVsMarker.toFixed(3)})` 
                              : `Save (+${bookingVsMarker.toFixed(3)})`
                          ) : "-"}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {cuttingCons !== null ? cuttingCons.toFixed(3) : "-"}
                        </td>
                        <td className={`p-4 text-right font-mono font-extrabold whitespace-nowrap ${bookingVsCut !== null && bookingVsCut < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {bookingVsCut !== null ? (
                            bookingVsCut < 0 
                              ? `Loss (${bookingVsCut.toFixed(3)})` 
                              : `Save (+${bookingVsCut.toFixed(3)})`
                          ) : "-"}
                        </td>
                        <td className={`p-4 text-right font-mono font-extrabold whitespace-nowrap ${fabricSaveLossPct !== null && fabricSaveLossPct < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {fabricSaveLossPct !== null ? `${fabricSaveLossPct.toFixed(1)}%` : "-"}
                        </td>
                        <td className={`p-4 text-right font-mono font-extrabold whitespace-nowrap ${fabricSaveLossKg !== null && fabricSaveLossKg < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {fabricSaveLossKg !== null ? fabricSaveLossKg.toFixed(2) : "-"}
                        </td>
                        <td className="p-4 font-semibold text-slate-700 dark:text-slate-350 whitespace-nowrap">
                          {entry.supervisor_name || "-"}
                        </td>
                        <td className="p-4 text-right pr-5 whitespace-nowrap print:hidden">
                          <div className="flex items-center justify-end space-x-1.5">
                            {(currentProfile.role === "supervisor" || currentProfile.role === "admin") && (
                              <button
                                onClick={() => onSelectEditEntry && onSelectEditEntry(entry)}
                                className="text-slate-700 hover:text-white hover:bg-slate-800 bg-slate-100 p-1.5 rounded-lg transition cursor-pointer border border-slate-200"
                                title="Edit Log"
                              >
                                <Edit3 size={13} />
                              </button>
                            )}
                            {(currentProfile.role === "supervisor" || currentProfile.role === "admin") && (
                              <button
                                onClick={() => {
                                  setEntryToDelete(entry);
                                }}
                                className="text-rose-600 hover:text-white hover:bg-rose-500 bg-rose-500/10 p-1.5 rounded-lg transition cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination controls footer */}
        <div className="p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-slate-450 dark:text-slate-500 font-medium print:hidden">
          <span>
            Showing records {Math.min(filteredEntries.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredEntries.length, currentPage * itemsPerPage)} of {filteredEntries.length} matching rows
          </span>
          <div className="flex items-center space-x-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 px-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition font-bold"
            >
              Prev
            </button>
            <span className="p-1.5 px-3.5 bg-[#2563EB] text-white font-black rounded-xl leading-normal">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 px-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition font-bold"
            >
              Next
            </button>
          </div>
        </div>

      </div>
      </>
      )}

      {activeReportsTab === 'remnants' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fade-in">
            <div>
              <h3 className="font-sans font-extrabold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Remnants & Yield Performance Ledgers ({filteredEntries.length} Records)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Maintain and record remnants usage, fabric reject counts, and remnants scrap.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs animate-fade-in">
            {/* Table Title and Export */}
            <div className="p-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="font-sans font-black text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Remnants Processing Logs ({filteredEntries.length} Matches)
              </h3>
              <div className="flex flex-wrap items-center gap-3 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 py-2 px-4 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  <Printer size={13} className="stroke-[2.5]" /> Print Report
                </button>
              </div>
            </div>

            {/* Dense Table wrapper */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[1950px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="p-4 pl-5 whitespace-nowrap cursor-pointer select-none" onClick={() => handleSort("entry_date")}>
                      Date {sortField === "entry_date" && (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="p-4 whitespace-nowrap">Shift</th>
                    <th className="p-4 whitespace-nowrap">Machine</th>
                    <th className="p-4 whitespace-nowrap">Buyer</th>
                    <th className="p-4 whitespace-nowrap">Job No</th>
                    <th className="p-4 whitespace-nowrap">Color</th>
                    <th className="p-4 whitespace-nowrap">PO Number</th>
                    <th className="p-4 whitespace-nowrap">Item</th>
                    <th className="p-4 whitespace-nowrap">Cut No</th>
                    <th className="p-4 text-right whitespace-nowrap">Total Cut Qty</th>
                    <th className="p-4 whitespace-nowrap">Reject Qty</th>
                    <th className="p-4 whitespace-nowrap">Table No</th>
                    <th className="p-4 whitespace-nowrap">Fabric Type</th>
                    <th className="p-4 text-right whitespace-nowrap">Remnants Fabric (KG)</th>
                    <th className="p-4 whitespace-nowrap">Remnants Scrap KG</th>
                    <th className="p-4 text-right whitespace-nowrap">Remnants Fabric Used (KG)</th>
                    <th className="p-4 text-center whitespace-nowrap print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                  {paginatedEntries.length === 0 ? (
                    <tr>
                      <td colSpan={17} className="text-center p-12 text-xs text-slate-400">
                        No matching cutting logs found for remnants entries.
                      </td>
                    </tr>
                  ) : (
                    paginatedEntries.map(entry => (
                      <RemnantsRow
                        key={entry.id}
                        entry={entry}
                        machines={machines}
                        currentProfile={currentProfile}
                        onSave={async (e, rQty, rScrap) => {
                          const updatedRemarks = formatRemarksRemnants(
                            parseRemarksRemnants(e.remarks).remnants_weight_kg,
                            rQty,
                            rScrap
                          );
                          const headers = {
                            "Content-Type": "application/json",
                            "X-User-Role": currentProfile.role,
                            "X-User-Email": currentProfile.email
                          };
                          const payload = {
                            ...e,
                            remarks: updatedRemarks
                          };
                          const res = await fetch(`/api/entries/${e.id}`, {
                            method: "PUT",
                            headers,
                            body: JSON.stringify(payload)
                          });
                          if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            throw new Error(data.error || "Failed to update database record");
                          }
                          // Refresh parent data
                          if (onRefresh) {
                            onRefresh();
                          }
                        }}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls footer */}
            <div className="p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-slate-450 dark:text-slate-500 font-medium print:hidden">
              <span>
                Showing records {Math.min(filteredEntries.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredEntries.length, currentPage * itemsPerPage)} of {filteredEntries.length} matching rows
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 px-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition font-bold cursor-pointer"
                >
                  Prev
                </button>
                <span className="p-1.5 px-3.5 bg-[#2563EB] text-white font-black rounded-xl leading-normal">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1.5 px-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition font-bold cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deletion */}
      {entryToDelete && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full text-xs space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-lg">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm text-slate-800">Delete Cutting Log?</h3>
                <p className="text-[10px] text-slate-400 font-semibold">This action is permanent and irreversible.</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2 text-slate-600 font-sans">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-400">Cut No:</span>
                <span className="font-mono font-bold text-slate-800">{entryToDelete.cut_no}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-400">Buyer Group:</span>
                <span className="font-semibold text-slate-700">{entryToDelete.buyer}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-400">Job Style No:</span>
                <span className="font-mono text-slate-700">{entryToDelete.job_no}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-400">Fabric Type:</span>
                <span className="text-slate-700">{entryToDelete.fabric_type}</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-slate-400">Fabric Used:</span>
                <span className="font-semibold text-slate-700">{entryToDelete.fabric_used_kg} kg</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEntryToDelete(null)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteEntry(entryToDelete.id);
                  setEntryToDelete(null);
                }}
                className="px-3.5 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition font-bold flex items-center gap-1 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
