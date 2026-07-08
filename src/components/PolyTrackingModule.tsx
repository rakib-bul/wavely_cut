import React, { useState, useMemo } from "react";
import { 
  Calendar, 
  Trash2, 
  TrendingUp, 
  ClipboardList, 
  Percent, 
  Database,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Lock,
  Sparkles,
  Coins,
  FileSpreadsheet,
  AlertTriangle
} from "lucide-react";
import { PolyEntry, Profile } from "../types";

interface PolyTrackingModuleProps {
  polyEntries: PolyEntry[];
  currentProfile: Profile;
  onSubmitPolyEntry: (entry_date: string, received: number, reused: number) => Promise<void>;
  onUpdatePolyEntry: (id: string, received: number, reused: number) => Promise<void>;
  onDeletePolyEntry: (id: string) => Promise<void>;
  polyPrice?: number;
}

export default function PolyTrackingModule({
  polyEntries,
  currentProfile,
  onSubmitPolyEntry,
  onUpdatePolyEntry,
  onDeletePolyEntry,
  polyPrice = 1.50
}: PolyTrackingModuleProps) {
  // Check access control (Only supervisor/officer and admin can access)
  const hasAccess = ["supervisor", "admin"].includes(currentProfile.role);

  // Form states
  const [entryDate, setEntryDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [receivedPoly, setReceivedPoly] = useState<string>("");
  const [reusedPoly, setReusedPoly] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Filter states
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Editing state tracking
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReceivedPoly, setEditReceivedPoly] = useState<string>("");
  const [editReusedPoly, setEditReusedPoly] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState<string | null>(null);

  // Deleting state tracking
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: "", message: "" });

  // Filtering entries based on selected date range
  const filteredEntries = useMemo(() => {
    return polyEntries.filter(entry => {
      if (startDate && entry.entry_date < startDate) return false;
      if (endDate && entry.entry_date > endDate) return false;
      return true;
    }).sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  }, [polyEntries, startDate, endDate]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalReceived = 0;
    let totalReused = 0;
    let totalSavedMoney = 0;

    filteredEntries.forEach(entry => {
      totalReceived += Number(entry.total_received_poly) || 0;
      totalReused += Number(entry.total_reused_poly) || 0;
      totalSavedMoney += Number(entry.save) || 0;
    });

    const overallPercentage = totalReceived > 0 ? (totalReused / totalReceived) * 100 : 0;

    return {
      totalReceived,
      totalReused,
      overallPercentage,
      totalSavedMoney
    };
  }, [filteredEntries]);

  // Excel Report Generator
  const handleDownloadExcel = () => {
    const headers = [
      "Entry Date",
      "Total Received Poly (Bags)",
      "Total Re-Used Poly (Bags)",
      "Poly Re-Use Efficiency (%)",
      "Assigned Price Rate (BDT)",
      "Saved Money (BDT)"
    ];

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Poly Tracking Report</x:Name>
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
          .report-title { font-size: 16pt; font-weight: bold; color: #047857; text-align: left; border: none; }
          .report-meta { font-size: 10pt; color: #4B5563; text-align: left; border: none; }
          .ledger-header { background-color: #065F46; color: #FFFFFF; font-weight: bold; text-align: center; }
          .ledger-row-even { background-color: #F0FDF4; }
          .ledger-row-odd { background-color: #FFFFFF; }
          .ledger-row-total { background-color: #D1FAE5; font-weight: bold; }
          .align-left { text-align: left; }
          .align-right { text-align: right; }
          .align-center { text-align: center; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="6" class="report-title">DAILY POLY BAGS RECEIVED & RE-USE REPORT</td></tr>
          <tr><td colspan="6" class="report-meta">Wavely Cut Platform | Generated: ${new Date().toLocaleString()}</td></tr>
          <tr><td colspan="6" class="report-meta">Date Filter Range: ${startDate || 'All Time'} to ${endDate || 'All Time'}</td></tr>
          <tr><td colspan="6" class="report-meta">Total Logged Days: ${filteredEntries.length}</td></tr>
        </table>

        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th class="ledger-header">${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${filteredEntries.map((entry, idx) => {
              const received = Number(entry.total_received_poly) || 0;
              const reused = Number(entry.total_reused_poly) || 0;
              const pct = received > 0 ? (reused / received) * 100 : 0;
              const priceVal = entry.price !== undefined ? Number(entry.price) : polyPrice;
              const saveVal = entry.save !== undefined ? Number(entry.save) : (reused * priceVal);
              return `
                <tr class="${idx % 2 === 0 ? 'ledger-row-even' : 'ledger-row-odd'}">
                  <td class="align-center">${entry.entry_date}</td>
                  <td class="align-right">${received.toFixed(2)}</td>
                  <td class="align-right">${reused.toFixed(2)}</td>
                  <td class="align-right">${pct.toFixed(2)}%</td>
                  <td class="align-right">৳${priceVal.toFixed(2)}</td>
                  <td class="align-right">৳${saveVal.toFixed(2)}</td>
                </tr>
              `;
            }).join("")}
            <tr class="ledger-row-total">
              <td class="align-center">TOTAL / AVERAGE</td>
              <td class="align-right">${stats.totalReceived.toFixed(2)}</td>
              <td class="align-right">${stats.totalReused.toFixed(2)}</td>
              <td class="align-right">${stats.overallPercentage.toFixed(2)}%</td>
              <td class="align-right">Average Price: ৳${polyPrice.toFixed(2)}</td>
              <td class="align-right">৳${stats.totalSavedMoney.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `poly_received_reused_report_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!entryDate) {
      setSubmitError("Date is required.");
      return;
    }

    const receivedNum = parseFloat(receivedPoly);
    const reusedNum = parseFloat(reusedPoly);

    if (isNaN(receivedNum) || receivedNum < 0) {
      setSubmitError("Total Received Poly must be a non-negative number.");
      return;
    }

    if (isNaN(reusedNum) || reusedNum < 0) {
      setSubmitError("Total Re-Used Poly must be a non-negative number.");
      return;
    }

    if (reusedNum > receivedNum) {
      setSubmitError("Total Re-Used Poly cannot be greater than Total Received Poly.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitPolyEntry(entryDate, receivedNum, reusedNum);
      setReceivedPoly("");
      setReusedPoly("");
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to save poly data record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, date: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Poly Entry",
      message: `Are you sure you want to delete the poly entry for ${date}?`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setDeletingId(id);
        try {
          await onDeletePolyEntry(id);
        } catch (err: any) {
          setAlertDialog({ isOpen: true, title: "Operation Failed", message: err.message || "Failed to delete entry" });
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const handleEdit = (entry: PolyEntry) => {
    setEditingId(entry.id);
    setEditReceivedPoly(String(entry.total_received_poly));
    setEditReusedPoly(String(entry.total_reused_poly));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditReceivedPoly("");
    setEditReusedPoly("");
  };

  const handleSaveEdit = async (id: string) => {
    const receivedNum = parseFloat(editReceivedPoly);
    const reusedNum = parseFloat(editReusedPoly);

    if (isNaN(receivedNum) || receivedNum < 0) {
      setAlertDialog({ isOpen: true, title: "Validation Error", message: "Total Received Poly must be a non-negative number." });
      return;
    }

    if (isNaN(reusedNum) || reusedNum < 0) {
      setAlertDialog({ isOpen: true, title: "Validation Error", message: "Total Re-Used Poly must be a non-negative number." });
      return;
    }

    if (reusedNum > receivedNum) {
      setAlertDialog({ isOpen: true, title: "Validation Error", message: "Total Re-Used Poly cannot be greater than Total Received Poly." });
      return;
    }

    setIsSavingEdit(id);
    try {
      await onUpdatePolyEntry(id, receivedNum, reusedNum);
      setEditingId(null);
    } catch (err: any) {
      setAlertDialog({ isOpen: true, title: "Operation Failed", message: err.message || "Failed to update entry" });
    } finally {
      setIsSavingEdit(null);
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto" id="poly-no-access">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-5 border border-rose-100 dark:border-rose-900/30 shadow-xs">
          <Lock size={28} />
        </div>
        <h2 className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">Access Restricted</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed">
          The Daily Poly Received and Re-Use module is restricted to **Officers (Supervisors)** and **Administrators** only. Operators and managers do not have viewing or editing privileges for this section.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6" id="poly-tracking-panel">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5" id="poly-header">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider flex items-center gap-1">
              <Sparkles size={10} /> Cutting Section
            </span>
            <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider flex items-center gap-1">
              <Lock size={10} /> Officer & Admin Only
            </span>
            <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider flex items-center gap-1">
              <Coins size={10} /> Active Rate: ৳{polyPrice.toFixed(2)}/bag
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            Poly Received & Re-Use Summary
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Log and track total daily received poly and re-used poly bags for efficiency analysis.
          </p>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="poly-kpi-grid">
        {/* KPI 1: TOTAL RECEIVED */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4.5">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0 border border-blue-100/30">
            <Database size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Total Received Poly</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 block">
              {stats.totalReceived.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Sum for the current period</span>
          </div>
        </div>

        {/* KPI 2: TOTAL RE-USED */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4.5">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100/30">
            <TrendingUp size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Total Re-Used Poly</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 block">
              {stats.totalReused.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Recovered and recycled bags</span>
          </div>
        </div>

        {/* KPI 3: POLY USED PERCENTAGE */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4.5">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100/30">
            <Percent size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Poly Used %</span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight mt-0.5 block">
              {stats.overallPercentage.toFixed(2)}%
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Re-Used Poly / Received Poly</span>
          </div>
        </div>

        {/* KPI 4: TOTAL SAVED MONEY */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200/55 dark:border-emerald-900/30 shadow-xs flex items-center gap-4.5 bg-gradient-to-br from-white to-emerald-50/10 dark:from-slate-900 dark:to-emerald-950/5">
          <div className="w-12 h-12 bg-emerald-100/50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-200/40">
            <Coins size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider block">Total Savings (BDT)</span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight mt-0.5 block">
              ৳{stats.totalSavedMoney.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Re-Used Poly × Price</span>
          </div>
        </div>
      </div>

      {/* DATA ENTRY FORM AND SUMMARY TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="poly-main-grid">
        
        {/* DATA ENTRY FORM CARD */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs h-fit" id="poly-entry-card">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <ClipboardList className="text-blue-500 shrink-0" size={18} />
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Log Daily Data</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" id="poly-entry-form">
            {/* Field 1: Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Select Date</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                  required
                />
              </div>
            </div>

            {/* Field 2: Total Received Poly */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Received Poly</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 1200.50"
                value={receivedPoly}
                onChange={(e) => setReceivedPoly(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                required
              />
            </div>

            {/* Field 3: Total Re-Used Poly */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Re-Used Poly</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 350.25"
                value={reusedPoly}
                onChange={(e) => setReusedPoly(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                required
              />
            </div>

            {/* Success and Error Indicators */}
            {submitError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-900/30 text-xs font-bold leading-relaxed flex items-center gap-2">
                <ShieldAlert size={14} className="shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-xs font-bold leading-relaxed flex items-center gap-2">
                <Sparkles size={14} className="shrink-0" />
                <span>Record saved successfully!</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl py-2.5 text-xs font-extrabold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving Record...</span>
                </>
              ) : (
                <>
                  <span>Save Record</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* REPORT SUMMARY TABLE */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col min-h-[400px]" id="poly-report-card">
          
          {/* Filters & Header block */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Database className="text-blue-500 shrink-0" size={18} />
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Report & Re-Use Summary</h2>
            </div>

            {/* Filter Inputs */}
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl font-medium">
                <span className="text-slate-400 text-[10px]">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none text-slate-700 dark:text-slate-300 outline-none text-[11px] p-0 focus:ring-0 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl font-medium">
                <span className="text-slate-400 text-[10px]">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none text-slate-700 dark:text-slate-300 outline-none text-[11px] p-0 focus:ring-0 cursor-pointer"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-xs font-extrabold text-rose-600 hover:text-rose-700 dark:text-rose-400 px-2 cursor-pointer transition"
                >
                  Clear
                </button>
              )}
              
              <button
                onClick={handleDownloadExcel}
                disabled={filteredEntries.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Export current table to Microsoft Excel"
              >
                <FileSpreadsheet size={14} />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-x-auto">
            {filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-slate-500">
                <Database size={32} className="mb-2 opacity-40" />
                <p className="text-xs font-semibold">No daily poly records logged for the selected period.</p>
                <p className="text-[10px] mt-0.5">Fill out the log form on the left to add a record.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[9px] tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                    <th className="py-3 px-4 rounded-l-xl">Date</th>
                    <th className="py-3 px-4 text-right">Total Received Poly</th>
                    <th className="py-3 px-4 text-right">Total Re-Used Poly</th>
                    <th className="py-3 px-4 text-right">Poly Used %</th>
                    <th className="py-3 px-4 text-right">Assigned Price</th>
                    <th className="py-3 px-4 text-right">Saved Money</th>
                    <th className="py-3 px-4 text-center rounded-r-xl w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEntries.map((entry) => {
                    const received = Number(entry.total_received_poly) || 0;
                    const reused = Number(entry.total_reused_poly) || 0;
                    const pct = received > 0 ? (reused / received) * 100 : 0;
                    const priceVal = entry.price !== undefined ? Number(entry.price) : polyPrice;
                    const saveVal = entry.save !== undefined ? Number(entry.save) : (reused * priceVal);

                    return (
                      <tr 
                        key={entry.id || entry.entry_date} 
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-850/40 text-slate-700 dark:text-slate-300 font-medium transition ${editingId === entry.id ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Calendar size={13} className="text-slate-400 shrink-0" />
                          <span>{entry.entry_date}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {editingId === entry.id ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editReceivedPoly}
                              onChange={e => setEditReceivedPoly(e.target.value)}
                              className="w-20 text-right bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-xs outline-none focus:border-indigo-500"
                            />
                          ) : (
                            received.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {editingId === entry.id ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editReusedPoly}
                              onChange={e => setEditReusedPoly(e.target.value)}
                              className="w-20 text-right bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-xs outline-none focus:border-indigo-500"
                            />
                          ) : (
                            reused.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-black ${
                            pct >= 50 
                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100/50" 
                              : pct >= 25 
                              ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100/50" 
                              : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100/50"
                          }`}>
                            {pct.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                          ৳{priceVal.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5 dark:bg-emerald-500/10 rounded-md">
                          ৳{saveVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {editingId === entry.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleSaveEdit(entry.id)}
                                disabled={isSavingEdit === entry.id}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] disabled:opacity-50"
                              >
                                {isSavingEdit === entry.id ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={isSavingEdit === entry.id}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded font-bold text-[10px] disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEdit(entry)}
                                disabled={deletingId === entry.id}
                                className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400 text-slate-400 rounded-lg cursor-pointer transition shrink-0 inline-flex items-center justify-center disabled:opacity-50"
                                title="Edit entry"
                              >
                                <ClipboardList size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id || entry.entry_date, entry.entry_date)}
                                disabled={deletingId === entry.id}
                                className="p-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 text-slate-400 rounded-lg cursor-pointer transition shrink-0 inline-flex items-center justify-center disabled:opacity-50"
                                title="Delete entry"
                              >
                                {deletingId === entry.id ? (
                                  <Loader2 size={13} className="animate-spin text-rose-500" />
                                ) : (
                                  <Trash2 size={13} />
                                )}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Record footer count */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 flex items-center justify-between">
            <span>Showing {filteredEntries.length} records</span>
            {polyEntries.length > filteredEntries.length && (
              <span>Filtered from {polyEntries.length} total records</span>
            )}
          </div>
        </div>

      </div>

      {/* Modals */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full text-xs space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-lg">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm text-slate-800">{confirmDialog.title}</h3>
              </div>
            </div>
            <p className="text-slate-600 font-sans">{confirmDialog.message}</p>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-3.5 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition font-bold flex items-center gap-1 cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {alertDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full text-xs space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm text-slate-800">{alertDialog.title}</h3>
              </div>
            </div>
            <p className="text-slate-600 font-sans">{alertDialog.message}</p>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
