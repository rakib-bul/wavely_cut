import React, { useState, useEffect, useMemo } from "react";
import { utils, writeFile } from "xlsx";
import { 
  Plus, Search, Trash2, Calendar, ClipboardList, Loader2, Save, X, Edit, Check, 
  Flame, Users, Target, ShieldAlert, CheckCircle2, AlertTriangle, FileSpreadsheet,
  Layers, UserCheck, Sparkles, Download
} from "lucide-react";
import { HeatSealEntry, HourlyHeatSealData, Profile, HeatSealOperator, HeatSealTarget } from "../types";

const HOURS_LABELS = [
  "8-9 AM", "9-10 AM", "10-11 AM", "11-12 PM", "12-1 PM", "1-2 PM", 
  "2-3 PM", "3-4 PM", "4-5 PM", "5-6 PM", "6-7 PM", "7-8 PM", 
  "8-9 PM", "9-10 PM", "10-11 PM", "11-12 AM", "12-1 AM", "1-2 AM", 
  "2-3 AM", "3-4 AM", "4-5 AM", "5-6 AM", "6-7 AM", "7-8 AM"
];

interface HeatSealModuleProps {
  entries: HeatSealEntry[];
  operators?: HeatSealOperator[];
  targets?: HeatSealTarget[];
  currentProfile: Profile;
  onSubmitEntry: (entry: Partial<HeatSealEntry>) => Promise<void>;
  onUpdateEntry: (id: string, updates: Partial<HeatSealEntry>) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onAddOperator: (operator: Partial<HeatSealOperator>) => Promise<void>;
  onDeleteOperator: (id: string) => Promise<void>;
  onAddTarget: (target: Partial<HeatSealTarget>) => Promise<void>;
  onUpdateTarget: (id: string, updates: Partial<HeatSealTarget>) => Promise<void>;
  onDeleteTarget: (id: string) => Promise<void>;
  schemaDDL?: string;
  rlsDDL?: string;
}

export default function HeatSealModule({
  entries = [],
  operators = [],
  targets = [],
  currentProfile,
  onSubmitEntry,
  onUpdateEntry,
  onDeleteEntry,
  onAddOperator,
  onDeleteOperator,
  onAddTarget,
  onUpdateTarget,
  onDeleteTarget,
  schemaDDL = "",
  rlsDDL = ""
}: HeatSealModuleProps) {
  // Navigation for Sub-panels (only for supervisor/admin)
  const [activeSubTab, setActiveSubTab] = useState<"entries" | "targets" | "operators" | "hourly_tally">("entries");
  
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Database schema error states
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedRls, setCopiedRls] = useState(false);

  const checkAndSetSchemaError = (err: any) => {
    const errMsg = (err.message || "").toLowerCase();
    if (
      errMsg.includes("schema cache") ||
      errMsg.includes("could not find the table") ||
      errMsg.includes("does not exist") ||
      errMsg.includes("relation") ||
      errMsg.includes("heat_seal")
    ) {
      setSchemaError(
        "Missing Database Tables: The Heat-Seal tracking tables do not exist in your Supabase database yet. Please run the SQL migration script in your Supabase console to enable this module."
      );
    }
  };

  const handleCopySchema = (text: string, type: 'schema' | 'rls') => {
    navigator.clipboard.writeText(text);
    if (type === 'schema') {
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2000);
    } else {
      setCopiedRls(true);
      setTimeout(() => setCopiedRls(false), 2000);
    }
  };
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Local Entry form state
  const [formData, setFormData] = useState<Partial<HeatSealEntry>>({
    entry_date: new Date().toISOString().split('T')[0],
    shift: 'D',
    operator_name: '',
    operator_id: '',
    designation: '',
    job_no: '',
    color: '',
    po_no: '',
    status: 'draft',
    hourly_data: HOURS_LABELS.map(slot => ({
      hour_slot: slot,
      target: 0,
      production: 0,
      shortfall: 0,
      efficiency: 0
    }))
  });

  // Target finding & status feedback
  const [foundTarget, setFoundTarget] = useState<HeatSealTarget | null>(null);
  const [targetSearchTriggered, setTargetSearchTriggered] = useState(false);

  // Operators form state
  const [operatorFormData, setOperatorFormData] = useState<Partial<HeatSealOperator>>({
    operator_name: "",
    operator_id: "",
    designation: "Heat-Seal Operator"
  });

  // Targets pre-setting form state
  const [targetFormData, setTargetFormData] = useState<Partial<HeatSealTarget>>({
    target_date: new Date().toISOString().split('T')[0],
    shift: "D",
    operator_id: "",
    operator_name: "",
    job_no: "",
    color: "",
    po_no: "",
    hourly_target: 100,
    status: 'active'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpSubmitting, setIsOpSubmitting] = useState(false);
  const [isTargetSubmitting, setIsTargetSubmitting] = useState(false);
  
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

  const isAdminOrSupervisor = currentProfile.role === "admin" || currentProfile.role === "supervisor";

  const isDayShift = formData.shift === 'D' || formData.shift === 'A';
  
  const filteredHourlyData = useMemo(() => {
    return (formData.hourly_data || []).map((item, idx) => ({
      ...item,
      originalIndex: idx
    })).filter(item => {
      const slotIndex = HOURS_LABELS.indexOf(item.hour_slot);
      return isDayShift ? slotIndex < 12 : slotIndex >= 12;
    });
  }, [formData.hourly_data, isDayShift]);

  // Check and auto-apply target assignments whenever entry_date, shift, or operator_id changes
  useEffect(() => {
    if (!formData.entry_date || !formData.shift || !formData.operator_id) {
      setFoundTarget(null);
      setTargetSearchTriggered(false);
      return;
    }

    const matchedTarget = targets.find(t => 
      t.target_date === formData.entry_date && 
      t.shift === formData.shift && 
      t.operator_id === formData.operator_id &&
      t.status !== 'completed'
    );

    if (matchedTarget) {
      setFoundTarget(matchedTarget);
      setTargetSearchTriggered(true);
      // Auto-update form info
      setFormData(prev => {
        const hourlyTarget = matchedTarget.hourly_target || 0;
        const updatedHourly = (prev.hourly_data || []).map(item => {
          const isBreak = item.hour_slot === "1-2 PM";
          const finalTarget = isBreak ? 0 : hourlyTarget;
          const shortfall = isBreak ? 0 : (finalTarget - (item.production || 0));
          const efficiency = isBreak ? 0 : (finalTarget > 0 ? Number((((item.production || 0) / finalTarget) * 100).toFixed(2)) : 0);
          return {
            ...item,
            target: finalTarget,
            production: isBreak ? 0 : (item.production || 0),
            shortfall,
            efficiency
          };
        });

        return {
          ...prev,
          job_no: matchedTarget.job_no,
          color: matchedTarget.color,
          po_no: matchedTarget.po_no,
          target_id: matchedTarget.id,
          hourly_data: updatedHourly
        };
      });
    } else {
      setFoundTarget(null);
      setTargetSearchTriggered(true);
      // Clear target values if they were loaded previously
      setFormData(prev => ({
        ...prev,
        job_no: prev.job_no || "",
        color: prev.color || "",
        po_no: prev.po_no || "",
        target_id: undefined,
        hourly_data: (prev.hourly_data || []).map(item => {
          const isBreak = item.hour_slot === "1-2 PM";
          return {
            ...item,
            target: 0,
            production: isBreak ? 0 : (item.production || 0),
            shortfall: isBreak ? 0 : -(item.production || 0),
            efficiency: 0
          };
        })
      }));
    }
  }, [formData.entry_date, formData.shift, formData.operator_id, targets]);

  const [isJobFetching, setIsJobFetching] = useState(false);
  const [jobFetchStatus, setJobFetchStatus] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [jobResults, setJobResults] = useState<{ color: string; po_no: string }[]>([]);

  const [isTargetJobFetching, setIsTargetJobFetching] = useState(false);
  const [targetJobFetchStatus, setTargetJobFetchStatus] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [targetJobResults, setTargetJobResults] = useState<{ color: string; po_no: string }[]>([]);

  // Fetch job details (color & po number) when job_no is typed in the entry field
  useEffect(() => {
    if (foundTarget || !formData.job_no || formData.job_no.trim().length < 2) {
      setJobFetchStatus('idle');
      setJobResults([]);
      return;
    }

    const jobNoToSearch = formData.job_no.trim();

    const delayDebounceFn = setTimeout(async () => {
      setIsJobFetching(true);
      setJobFetchStatus('idle');
      try {
        const res = await fetch(`/api/job-lookup/${encodeURIComponent(jobNoToSearch)}`);
        if (res.ok) {
          const result = await res.json();
          if (result.found && result.results && result.results.length > 0) {
            setJobResults(result.results);
            setFormData(prev => {
              if (prev.job_no?.trim() === jobNoToSearch) {
                // Auto-fill the first matched combination
                return {
                  ...prev,
                  color: result.results[0].color || prev.color || "",
                  po_no: result.results[0].po_no || prev.po_no || ""
                };
              }
              return prev;
            });
            setJobFetchStatus('found');
          } else {
            setJobResults([]);
            setJobFetchStatus('not_found');
          }
        } else {
          setJobResults([]);
          setJobFetchStatus('not_found');
        }
      } catch (err) {
        console.error("Error fetching job details:", err);
        setJobResults([]);
        setJobFetchStatus('not_found');
      } finally {
        setIsJobFetching(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.job_no, foundTarget]);

  // Fetch job details (color & po number) when job_no is typed in the preset targets form
  useEffect(() => {
    if (!targetFormData.job_no || targetFormData.job_no.trim().length < 2) {
      setTargetJobFetchStatus('idle');
      setTargetJobResults([]);
      return;
    }

    const jobNoToSearch = targetFormData.job_no.trim();

    const delayDebounceFn = setTimeout(async () => {
      setIsTargetJobFetching(true);
      setTargetJobFetchStatus('idle');
      try {
        const res = await fetch(`/api/job-lookup/${encodeURIComponent(jobNoToSearch)}`);
        if (res.ok) {
          const result = await res.json();
          if (result.found && result.results && result.results.length > 0) {
            setTargetJobResults(result.results);
            setTargetFormData(prev => {
              if (prev.job_no?.trim() === jobNoToSearch) {
                // Auto-fill the first matched combination
                return {
                  ...prev,
                  color: result.results[0].color || prev.color || "",
                  po_no: result.results[0].po_no || prev.po_no || ""
                };
              }
              return prev;
            });
            setTargetJobFetchStatus('found');
          } else {
            setTargetJobResults([]);
            setTargetJobFetchStatus('not_found');
          }
        } else {
          setTargetJobResults([]);
          setTargetJobFetchStatus('not_found');
        }
      } catch (err) {
        console.error("Error fetching target job details:", err);
        setTargetJobResults([]);
        setTargetJobFetchStatus('not_found');
      } finally {
        setIsTargetJobFetching(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [targetFormData.job_no]);

  const handleOpenForm = (entry?: HeatSealEntry) => {
    if (entry) {
      setEditingId(entry.id);
      setFormData({ ...entry });
      // Look for linked target
      const matchedTarget = targets.find(t => t.id === entry.target_id);
      if (matchedTarget) {
        setFoundTarget(matchedTarget);
      } else {
        setFoundTarget(null);
      }
      setTargetSearchTriggered(true);
    } else {
      setEditingId(null);
      setFoundTarget(null);
      setTargetSearchTriggered(false);
      setFormData({
        entry_date: new Date().toISOString().split('T')[0],
        shift: 'D',
        operator_name: '',
        operator_id: '',
        designation: '',
        job_no: '',
        color: '',
        po_no: '',
        status: 'draft',
        hourly_data: HOURS_LABELS.map(slot => ({
          hour_slot: slot,
          target: 0,
          production: 0,
          shortfall: 0,
          efficiency: 0
        }))
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleOperatorSelect = (operatorId: string) => {
    const op = operators.find(o => o.operator_id === operatorId);
    if (op) {
      setFormData(prev => ({
        ...prev,
        operator_id: op.operator_id,
        operator_name: op.operator_name,
        designation: op.designation
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        operator_id: "",
        operator_name: "",
        designation: ""
      }));
    }
  };

  const handleHourlyChange = (index: number, field: keyof HourlyHeatSealData, value: number) => {
    const newData = [...(formData.hourly_data || [])];
    const item = { ...newData[index] };
    
    const isBreak = item.hour_slot === "1-2 PM";
    if (isBreak) return;
    
    // @ts-ignore
    item[field] = value;
    
    // Auto-calculate shortfall and efficiency
    if (field === 'target' || field === 'production') {
      item.shortfall = item.target - item.production;
      if (item.target > 0) {
        item.efficiency = Number(((item.production / item.target) * 100).toFixed(2));
      } else {
        item.efficiency = 0;
      }
    }
    
    newData[index] = item;
    setFormData({ ...formData, hourly_data: newData });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entry_date || !formData.operator_id || !formData.operator_name) {
      setAlertDialog({ isOpen: true, title: "Missing Information", message: "Please fill required fields (Date, Operator, Shift)." });
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingId) {
        await onUpdateEntry(editingId, formData);
      } else {
        await onSubmitEntry(formData);
      }
      handleCloseForm();
    } catch (err: any) {
      checkAndSetSchemaError(err);
      setAlertDialog({ isOpen: true, title: "Operation Failed", message: err.message || "Operation failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Tracking Entry",
      message: "Are you sure you want to delete this daily tracking entry?",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setDeletingId(id);
        try {
          await onDeleteEntry(id);
        } catch (err: any) {
          checkAndSetSchemaError(err);
          setAlertDialog({ isOpen: true, title: "Operation Failed", message: err.message || "Failed to delete" });
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  // --- Predefined Operators Management ---
  const handleAddOperatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorFormData.operator_name || !operatorFormData.operator_id || !operatorFormData.designation) {
      setAlertDialog({ isOpen: true, title: "Missing Information", message: "Please enter Operator Name, ID Card Number, and Designation." });
      return;
    }
    setIsOpSubmitting(true);
    try {
      await onAddOperator(operatorFormData);
      setOperatorFormData({
        operator_name: "",
        operator_id: "",
        designation: "Heat-Seal Operator"
      });
    } catch (err: any) {
      checkAndSetSchemaError(err);
      setAlertDialog({ isOpen: true, title: "Operation Failed", message: err.message || "Failed to register operator." });
    } finally {
      setIsOpSubmitting(false);
    }
  };

  const handleDeleteOperator = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Operator",
      message: "Are you sure you want to delete this predefined operator? This will clear their record from the directory.",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await onDeleteOperator(id);
        } catch (err: any) {
          checkAndSetSchemaError(err);
          setAlertDialog({ isOpen: true, title: "Operation Failed", message: err.message || "Failed to delete operator." });
        }
      }
    });
  };

  // --- Pre-set Targets Management ---
  const handleTargetOperatorSelect = (operatorId: string) => {
    const op = operators.find(o => o.operator_id === operatorId);
    if (op) {
      setTargetFormData(prev => ({
        ...prev,
        operator_id: op.operator_id,
        operator_name: op.operator_name
      }));
    } else {
      setTargetFormData(prev => ({
        ...prev,
        operator_id: "",
        operator_name: ""
      }));
    }
  };

  const handleCompleteTarget = async (id: string) => {
    try {
      await onUpdateTarget(id, { status: 'completed' });
      // Reset found target in the entry form if it was the one being completed
      if (foundTarget && foundTarget.id === id) {
        setFoundTarget(null);
        setTargetSearchTriggered(true);
      }
    } catch (err) {
      console.error("Error completing target:", err);
    }
  };

  const handleAddTargetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { target_date, shift, operator_id, operator_name, job_no, color, po_no, hourly_target } = targetFormData;
    if (!target_date || !shift || !operator_id || !job_no || !color || !po_no || !hourly_target) {
      setAlertDialog({ isOpen: true, title: "Missing Information", message: "All fields are required to preset a target assignment." });
      return;
    }
    setIsTargetSubmitting(true);
    try {
      await onAddTarget(targetFormData);
      setTargetFormData(prev => ({
        ...prev,
        job_no: "",
        color: "",
        po_no: "",
        hourly_target: 100
      }));
      setAlertDialog({ isOpen: true, title: "Success", message: "Target assignment successfully preset!" });
    } catch (err: any) {
      checkAndSetSchemaError(err);
      setAlertDialog({ isOpen: true, title: "Operation Failed", message: err.message || "Failed to preset target assignment." });
    } finally {
      setIsTargetSubmitting(false);
    }
  };

  const handleDeleteTarget = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Target",
      message: "Are you sure you want to cancel and delete this target assignment?",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await onDeleteTarget(id);
        } catch (err: any) {
          checkAndSetSchemaError(err);
          setAlertDialog({ isOpen: true, title: "Operation Failed", message: err.message || "Failed to delete target assignment." });
        }
      }
    });
  };

  const handleExportExcel = () => {
    const dayEntries = entries.filter(e => e.entry_date === reportDate && (e.shift === 'D' || e.shift === 'A'));
    const nightEntries = entries.filter(e => e.entry_date === reportDate && (e.shift === 'N' || e.shift === 'B'));
    
    const dayLabels = HOURS_LABELS.slice(0, 12);
    const nightLabels = HOURS_LABELS.slice(12, 24);

    const wb = utils.book_new();

    const generateShiftSheet = (shiftEntries: typeof entries, labels: string[], shiftName: string) => {
      const data: any[] = [];
      data.push([`HEAT-SEAL HOURLY PRODUCTION TALLY - ${shiftName}`]);
      data.push([`Date: ${reportDate}`]);
      data.push([]);

      const header = ["Operator", "Job No", "Color", "PO No"];
      labels.forEach(h => {
        header.push(`${h} TGT`);
        header.push(`${h} PROD`);
        header.push(`${h} EFF%`);
      });
      header.push("TOTAL PROD");
      header.push("AVG EFF%");
      data.push(header);

      let shiftTotalProd = 0;
      let shiftTotalTgt = 0;
      const hourlyTotals = labels.map(() => ({ tgt: 0, prod: 0 }));

      shiftEntries.forEach(entry => {
        const row: any[] = [
          entry.operator_name,
          entry.job_no || "-",
          entry.color || "-",
          entry.po_no || "-",
        ];
        
        let opTotalProd = 0;
        let opTotalTgt = 0;

        labels.forEach((hour, idx) => {
          const hData = entry.hourly_data?.find(h => h.hour_slot === hour);
          const p = Number(hData?.production) || 0;
          const t = Number(hData?.target) || 0;
          const e = t > 0 ? (p / t) * 100 : 0;
          
          row.push(t);
          row.push(p);
          row.push(t > 0 ? e.toFixed(0) + "%" : "0%");
          
          opTotalProd += p;
          opTotalTgt += t;
          
          hourlyTotals[idx].prod += p;
          hourlyTotals[idx].tgt += t;
        });

        const opAvgEff = opTotalTgt > 0 ? (opTotalProd / opTotalTgt) * 100 : 0;
        row.push(opTotalProd);
        row.push(opTotalTgt > 0 ? opAvgEff.toFixed(1) + "%" : "0%");
        data.push(row);
        shiftTotalProd += opTotalProd;
        shiftTotalTgt += opTotalTgt;
      });

      // Summary row
      const summaryRow: any[] = ["TOTALS", "-", "-", "-"];
      hourlyTotals.forEach(h => {
        summaryRow.push(h.tgt);
        summaryRow.push(h.prod);
        summaryRow.push(h.tgt > 0 ? ((h.prod / h.tgt) * 100).toFixed(1) + "%" : "0%");
      });
      summaryRow.push(shiftTotalProd);
      summaryRow.push(shiftTotalTgt > 0 ? ((shiftTotalProd / shiftTotalTgt) * 100).toFixed(1) + "%" : "0%");
      data.push(summaryRow);

      const ws = utils.aoa_to_sheet(data);
      
      // Set column widths
      const wscols = [
        { wch: 25 }, // Operator
        { wch: 15 }, // Job No
        { wch: 15 }, // Color
        { wch: 15 }, // PO
      ];
      labels.forEach(() => {
        wscols.push({ wch: 8 }, { wch: 8 }, { wch: 10 });
      });
      wscols.push({ wch: 12 }, { wch: 12 });
      ws['!cols'] = wscols;

      return ws;
    };

    if (dayEntries.length > 0) {
      const wsDay = generateShiftSheet(dayEntries, dayLabels, "DAY SHIFT");
      utils.book_append_sheet(wb, wsDay, "Day Shift");
    }

    if (nightEntries.length > 0) {
      const wsNight = generateShiftSheet(nightEntries, nightLabels, "NIGHT SHIFT");
      utils.book_append_sheet(wb, wsNight, "Night Shift");
    }

    if (wb.SheetNames.length === 0) {
      const ws = utils.aoa_to_sheet([["No data available for selected date", reportDate]]);
      utils.book_append_sheet(wb, ws, "No Data");
    }

    writeFile(wb, `HeatSeal_Production_Report_${reportDate}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {schemaError && (
        <div className="bg-amber-50/90 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 p-5 rounded-2xl space-y-4 shadow-sm animate-fade-in text-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div className="space-y-1">
              <h4 className="font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
                Database Tables Not Initialized
              </h4>
              <p className="text-amber-700/90 dark:text-amber-400 font-medium leading-relaxed">
                The Heat-Seal tracking feature requires custom tables (<code className="font-mono text-[10px] bg-amber-100 dark:bg-amber-950/60 px-1 py-0.5 rounded">heat_seal_operators</code>, <code className="font-mono text-[10px] bg-amber-100 dark:bg-amber-950/60 px-1 py-0.5 rounded">heat_seal_targets</code>, and <code className="font-mono text-[10px] bg-amber-100 dark:bg-amber-950/60 px-1 py-0.5 rounded">heat_seal_entries</code>) which are not yet created or cached in your live Supabase project.
              </p>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/40 rounded-xl p-3.5 border border-amber-200/50 dark:border-amber-900/30 space-y-2.5">
            <span className="font-bold text-amber-900 dark:text-amber-300 block text-[10px] uppercase tracking-wider">
              How to Resolve:
            </span>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 font-medium pl-1">
              <li>Navigate to the <span className="font-bold text-indigo-600 dark:text-indigo-400">Admin Panel</span> tab at the top of the app.</li>
              <li>Open the <span className="font-bold">DB Schemas</span> sub-tab.</li>
              <li>Click <span className="font-bold">Copy SQL</span> under both <span className="font-mono text-[10px]">1_schema_migrations.sql</span> and <span className="font-mono text-[10px]">2_rls_security_rules.sql</span>.</li>
              <li>Paste and execute those scripts in your <span className="font-bold">Supabase Project SQL Editor</span>, then reload this page!</li>
            </ol>
          </div>

          {(schemaDDL || rlsDDL) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {schemaDDL && (
                <button
                  type="button"
                  onClick={() => handleCopySchema(schemaDDL, 'schema')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-sm text-[10px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSchema ? <CheckCircle2 size={13} /> : <ClipboardList size={13} />}
                  {copiedSchema ? "Schema Copied!" : "Copy Migration SQL"}
                </button>
              )}
              {rlsDDL && (
                <button
                  type="button"
                  onClick={() => handleCopySchema(rlsDDL, 'rls')}
                  className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition shadow-sm text-[10px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedRls ? <CheckCircle2 size={13} className="text-emerald-500" /> : <ShieldAlert size={13} />}
                  {copiedRls ? "RLS Copied!" : "Copy RLS Policies SQL"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSchemaError(null)}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 font-bold rounded-xl transition text-[10px] uppercase tracking-wider cursor-pointer ml-auto"
              >
                Dismiss Warning
              </button>
            </div>
          )}
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 p-3 rounded-2xl">
            <Flame size={28} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              DAILY Heat-Seal Production TRACKING REPORT
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Real-time hourly tally style entry, target pre-allocation, shortfall analysis, and operator efficiency logging.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub Navigation */}
          <button
            onClick={() => setActiveSubTab("entries")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeSubTab === "entries" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" 
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <ClipboardList size={16} />
            Daily Tally Reports
          </button>

          <button
            onClick={() => setActiveSubTab("hourly_tally")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeSubTab === "hourly_tally" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" 
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Layers size={16} />
            Hourly Tally Grid
          </button>

          {isAdminOrSupervisor && (
            <>
              <button
                onClick={() => setActiveSubTab("targets")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                  activeSubTab === "targets" 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" 
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <Target size={16} />
                Preset Targets Manager
              </button>

              <button
                onClick={() => setActiveSubTab("operators")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                  activeSubTab === "operators" 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" 
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <Users size={16} />
                Operators Directory
              </button>
            </>
          )}

          <button
            onClick={() => { handleOpenForm(); setActiveSubTab("entries"); }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-200 dark:shadow-none"
          >
            <Plus size={16} />
            New Entry
          </button>
        </div>
      </div>

      {/* TAB 1: DAILY TALLY REPORTS */}
      {activeSubTab === "entries" && (
        <div className="space-y-6">
          {isFormOpen && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {editingId ? "Edit Daily Tracking Record" : "New Heat-Seal Entry Tally"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Complete your 24-hour tally log in real-time or draft mode.</p>
                </div>
                <button onClick={handleCloseForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Master Details Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Date *</label>
                    <input 
                      type="date" 
                      value={formData.entry_date} 
                      onChange={e => setFormData({ ...formData, entry_date: e.target.value })}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      required 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Shift *</label>
                    <select 
                      value={formData.shift} 
                      onChange={e => setFormData({ ...formData, shift: e.target.value as any })}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    >
                      <option value="D">Day Shift (8 AM - 8 PM)</option>
                      <option value="N">Night Shift (8 PM - 8 AM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Select Predefined Operator *</label>
                    {operators.length === 0 ? (
                      <div className="text-xs text-rose-500 py-2.5">
                        No operators registered. Go to directory to add.
                      </div>
                    ) : (
                      <select 
                        value={formData.operator_id} 
                        onChange={e => handleOperatorSelect(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                        required
                      >
                        <option value="">-- Choose Operator --</option>
                        {operators.map(op => (
                          <option key={op.id} value={op.operator_id}>
                            {op.operator_name} ({op.operator_id})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Designation</label>
                    <input 
                      type="text" 
                      value={formData.designation || ""} 
                      disabled
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm dark:text-slate-400 font-medium text-slate-500 cursor-not-allowed"
                      placeholder="Auto-populated"
                    />
                  </div>
                </div>

                {/* Preset Targets Verification Panel */}
                {targetSearchTriggered && (
                  <div className={`p-4 rounded-xl border flex items-start gap-3 transition ${
                    foundTarget 
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-400"
                      : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-400"
                  }`}>
                    <div className="mt-0.5">
                      {foundTarget ? <CheckCircle2 size={18} className="text-emerald-500" /> : <AlertTriangle size={18} className="text-amber-500" />}
                    </div>
                    <div className="flex-1 text-sm">
                      {foundTarget ? (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex-1">
                            <span className="font-bold">Target Assignment Pre-set Verified!</span> Automatic lock-in completed: 
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <span className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border text-slate-700 dark:text-slate-300 text-[10px]">Job: {formData.job_no}</span>
                              <span className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border text-slate-700 dark:text-slate-300 text-[10px]">Color: {formData.color}</span>
                              <span className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border text-slate-700 dark:text-slate-300 text-[10px]">PO: {formData.po_no}</span>
                              <span className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border text-slate-700 dark:text-slate-300 text-[10px]">Hourly Target: {foundTarget.hourly_target} pcs</span>
                            </div>
                          </div>
                          {isAdminOrSupervisor && (
                            <button 
                              type="button"
                              onClick={() => handleCompleteTarget(foundTarget.id)}
                              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition border border-amber-200/50 dark:border-amber-800/50 shadow-sm"
                            >
                              <Check size={12} className="stroke-[3]" />
                              Finish Job / Switch
                            </button>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold">No beforehand target pre-allocation found</span> for Operator on this date/shift. 
                          <p className="text-xs text-amber-600/90 dark:text-amber-400/90 mt-1">An admin or officer must preset a target assignment beforehand to populate standard Targets, Job No, Color, and PO No fields.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Job Info Rows (Editable for manual/override, or pre-filled) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {jobResults.length > 1 && !foundTarget && (
                    <div className="col-span-1 md:col-span-3 bg-indigo-50/75 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-500 animate-pulse shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">Multiple Colors/PO Combinations Found ({jobResults.length})</div>
                          <div className="text-[10px] text-indigo-700/80 dark:text-indigo-400">Select color & PO combo to automatically pre-fill fields below:</div>
                        </div>
                      </div>
                      <select
                        value={`${formData.color}|||${formData.po_no}`}
                        onChange={(e) => {
                          const [col, po] = e.target.value.split("|||");
                          setFormData(prev => ({ ...prev, color: col, po_no: po }));
                        }}
                        className="text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer min-w-[220px]"
                      >
                        {jobResults.map((res, idx) => (
                          <option key={idx} value={`${res.color}|||${res.po_no}`}>
                            Color: {res.color} | PO: {res.po_no || "N/A"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Job Number</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={formData.job_no || ""} 
                        onChange={e => setFormData({ ...formData, job_no: e.target.value })}
                        disabled={!!foundTarget}
                        placeholder={foundTarget ? "Auto-locked" : "Enter Job No"}
                        className={`w-full border rounded-xl pl-4 pr-16 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white ${
                          foundTarget 
                            ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed" 
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                        {isJobFetching && (
                          <Loader2 size={16} className="text-slate-400 animate-spin" />
                        )}
                        {!isJobFetching && jobFetchStatus === 'found' && (
                          <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-800" title="Automatically loaded details from DB">
                            <Check size={10} className="stroke-[3]" /> Auto
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Color</label>
                    <input 
                      type="text" 
                      value={formData.color || ""} 
                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                      disabled={!!foundTarget}
                      placeholder={foundTarget ? "Auto-locked" : "Enter Color"}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white ${
                        foundTarget 
                          ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed" 
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">PO Number</label>
                    <input 
                      type="text" 
                      value={formData.po_no || ""} 
                      onChange={e => setFormData({ ...formData, po_no: e.target.value })}
                      disabled={!!foundTarget}
                      placeholder={foundTarget ? "Auto-locked" : "Enter PO No"}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white ${
                        foundTarget 
                          ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed" 
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                    />
                  </div>
                </div>

                {/* HORIZONTAL TALLY TABLE */}
                <div className="space-y-6 mt-6">
                  {/* SHIFT PROGRESSION TIMELINE */}
                      <div className="p-5 bg-slate-50/70 dark:bg-slate-800/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                            Production Timeline ({isDayShift ? "Day Shift" : "Night Shift"})
                          </h5>
                          {isDayShift && (
                            <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold px-2.5 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/30">
                              No Entry on Lunchbreak 🍔
                            </span>
                          )}
                        </div>
                        <div className="relative flex items-center justify-between gap-2 overflow-x-auto py-2 scrollbar-thin">
                          {/* Connecting line */}
                          <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0" />
                          
                          {filteredHourlyData.map((item, index) => {
                            const isBreak = item.hour_slot === "1-2 PM";
                            const hasProd = (item.production || 0) > 0;
                            const targetVal = item.target || 0;
                            const prodVal = item.production || 0;
                            const isMet = targetVal > 0 && prodVal >= targetVal;
                            
                            let statusBg = "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700";
                            let statusRing = "";
                            let prodText = String(prodVal);
                            
                            if (isBreak) {
                              statusBg = "bg-amber-500 text-white border-amber-600";
                              statusRing = "ring-4 ring-amber-100 dark:ring-amber-950/20";
                              prodText = "☕";
                            } else if (hasProd) {
                              if (isMet) {
                                statusBg = "bg-emerald-500 text-white border-emerald-600";
                                statusRing = "ring-4 ring-emerald-100 dark:ring-emerald-950/20";
                              } else {
                                statusBg = "bg-rose-500 text-white border-rose-600";
                                statusRing = "ring-4 ring-rose-100 dark:ring-rose-950/20";
                              }
                            } else if (targetVal > 0) {
                              statusBg = "bg-white dark:bg-slate-900 text-indigo-500 border-indigo-200 dark:border-indigo-800";
                              prodText = "0";
                            } else {
                              prodText = "-";
                            }
                            
                            return (
                              <div key={item.hour_slot} className="relative z-10 flex flex-col items-center min-w-[70px] flex-1">
                                {/* Hour Circle */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-xs font-bold border transition-all duration-300 ${statusBg} ${statusRing}`}>
                                  {prodText}
                                </div>
                                
                                {/* Hour slot label */}
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-2.5 whitespace-nowrap">
                                  {item.hour_slot.replace(" AM", "").replace(" PM", "")}
                                </span>
                                
                                {/* Target details */}
                                <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 whitespace-nowrap">
                                  {isBreak ? (isDayShift ? "Lunch" : "Break") : `Target: ${targetVal}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* DETAILED TALLY TABLE */}
                      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10 flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">Hourly Production Tally</span>
                          <span className="text-[10px] text-slate-400 font-medium">Click fields to input target and actual production volumes</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/40">
                                <th className="py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800/90 z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#334155] whitespace-nowrap min-w-[120px]">Metric</th>
                                {filteredHourlyData.map(item => {
                                  const isBreak = item.hour_slot === "1-2 PM";
                                  return (
                                    <th key={item.hour_slot} className={`py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-wider whitespace-nowrap text-center ${isBreak ? "bg-amber-50/30 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400" : ""}`}>
                                      {item.hour_slot} {isBreak && <span className="text-[10px] text-amber-500 ml-1 font-black">({isDayShift ? "Lunch" : "Break"})</span>}
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {/* Target Input Row */}
                              <tr className="bg-white dark:bg-slate-900">
                                <td className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[1px_0_0_0_#f1f5f9] dark:shadow-[1px_0_0_0_#1e293b] whitespace-nowrap">Target</td>
                                {filteredHourlyData.map((item) => {
                                  const isBreak = item.hour_slot === "1-2 PM";
                                  return (
                                    <td key={item.hour_slot} className={`py-2 px-4 text-center ${isBreak ? "bg-amber-50/10 dark:bg-amber-950/5" : ""}`}>
                                      {isBreak ? (
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wide bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/30 whitespace-nowrap">Break</span>
                                      ) : (
                                        <input 
                                          type="number" 
                                          min="0"
                                          value={item.target || ""}
                                          onChange={(e) => handleHourlyChange(item.originalIndex, "target", Number(e.target.value))}
                                          disabled={!!foundTarget}
                                          className={`w-14 text-center border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white ${
                                            foundTarget 
                                              ? "bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 cursor-not-allowed" 
                                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                          }`}
                                        />
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>

                              {/* Production Input Row */}
                              <tr className="bg-white dark:bg-slate-900">
                                <td className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[1px_0_0_0_#f1f5f9] dark:shadow-[1px_0_0_0_#1e293b] whitespace-nowrap">Production</td>
                                {filteredHourlyData.map((item) => {
                                  const isBreak = item.hour_slot === "1-2 PM";
                                  return (
                                    <td key={item.hour_slot} className={`py-2 px-4 text-center ${isBreak ? "bg-amber-50/10 dark:bg-amber-950/5" : ""}`}>
                                      {isBreak ? (
                                        <span className="text-[10px] text-amber-500 dark:text-amber-400 font-bold uppercase tracking-wide bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/30 whitespace-nowrap">No Entry</span>
                                      ) : (
                                        <input 
                                          type="number" 
                                          min="0"
                                          value={item.production || ""}
                                          onChange={(e) => handleHourlyChange(item.originalIndex, "production", Number(e.target.value))}
                                          className="w-14 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                                        />
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>

                              {/* Shortfall Display Row */}
                              <tr className="bg-slate-50/20 dark:bg-slate-800/10">
                                <td className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 shadow-[1px_0_0_0_#f1f5f9] dark:shadow-[1px_0_0_0_#1e293b] whitespace-nowrap">Shortfall</td>
                                {filteredHourlyData.map((item) => {
                                  const isBreak = item.hour_slot === "1-2 PM";
                                  return (
                                    <td key={item.hour_slot} className={`py-3 px-4 text-xs font-mono font-bold text-center ${isBreak ? "bg-amber-50/10 dark:bg-amber-950/5" : ""}`}>
                                      {isBreak ? (
                                        <span className="text-slate-400 font-normal">-</span>
                                      ) : (
                                        <span className={item.shortfall > 0 ? "text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-1 rounded" : item.shortfall < 0 ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-1 rounded" : "text-slate-900 dark:text-white"}>
                                          {item.shortfall}
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>

                              {/* Efficiency Display Row */}
                              <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                                <td className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-100 dark:bg-slate-900 z-10 shadow-[1px_0_0_0_#f1f5f9] dark:shadow-[1px_0_0_0_#1e293b] whitespace-nowrap">Efficiency</td>
                                {filteredHourlyData.map((item) => {
                                  const isBreak = item.hour_slot === "1-2 PM";
                                  return (
                                    <td key={item.hour_slot} className={`py-3 px-4 text-xs font-mono font-black text-center ${isBreak ? "bg-amber-50/10 dark:bg-amber-950/5" : ""}`}>
                                      {isBreak ? (
                                        <span className="text-slate-400 font-normal">-</span>
                                      ) : (
                                        <span className={item.efficiency >= 100 ? "text-emerald-600" : item.efficiency > 80 ? "text-amber-500" : "text-rose-500"}>
                                          {item.efficiency}%
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                {/* Admin Status Overrides */}
                {isAdminOrSupervisor && (
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800">
                    <ShieldAlert className="text-indigo-500" size={18} />
                    <div className="flex-1">
                      <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Supervisory Approval Action</span>
                      <p className="text-slate-500 text-xs mt-0.5">Define record finality. Approved records can be locked for standard reporting.</p>
                    </div>
                    <select 
                      value={formData.status} 
                      onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    >
                      <option value="draft">Draft (Editable)</option>
                      <option value="submitted">Submitted (Awaiting Final Signoff)</option>
                      <option value="approved">Approved (Locked / Signed)</option>
                    </select>
                  </div>
                )}

                {/* Action Controls */}
                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
                  <button 
                    type="button" 
                    onClick={handleCloseForm}
                    className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {editingId ? "Update Tracking Entry" : "Log Daily Entry"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Daily Tracking Reports Database List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-indigo-500" />
                  Recent Heat-Seal Entries Database
                </h3>
                <p className="text-xs text-slate-500 mt-1">Viewing all submitted and draft daily tally records.</p>
              </div>
            </div>
            
            {entries.length === 0 ? (
              <div className="py-16 text-center text-slate-500 dark:text-slate-400">
                <ClipboardList size={56} className="mx-auto mb-4 opacity-15" />
                <p className="font-medium text-slate-600">No daily tracking reports submitted yet.</p>
                <p className="text-xs text-slate-400 mt-1">Click the "New Entry" button above to log production.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">Date</th>
                      <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">Shift</th>
                      <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">Operator details</th>
                      <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">Job No</th>
                      <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">Color / PO</th>
                      <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">Total Production</th>
                      <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">Avg Efficiency</th>
                      <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">Status</th>
                      <th className="py-3 px-4 text-center font-bold text-slate-600 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {entries.map(entry => {
                      const totalProd = (entry.hourly_data || []).reduce((acc, curr) => acc + (Number(curr.production) || 0), 0);
                      const nonZeroHours = (entry.hourly_data || []).filter(h => (h.target || 0) > 0);
                      const avgEfficiency = nonZeroHours.length > 0 
                        ? Number((nonZeroHours.reduce((acc, curr) => acc + (curr.efficiency || 0), 0) / nonZeroHours.length).toFixed(1))
                        : 0;
                      
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/35 transition">
                          <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            {entry.entry_date}
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap">
                              {entry.shift === 'D' ? 'Day' : entry.shift === 'N' ? 'Night' : 'Shift ' + entry.shift}
                            </span>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{entry.operator_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {entry.operator_id} | {entry.designation}</div>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap font-mono text-xs text-slate-700 dark:text-slate-300">
                            {entry.job_no || <span className="text-slate-400 italic">None</span>}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap text-xs">
                            <div className="text-slate-800 dark:text-slate-200">{entry.color || <span className="text-slate-400 italic">None</span>}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{entry.po_no || <span className="text-slate-400 italic">-</span>}</div>
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-slate-800 dark:text-white">
                            {totalProd} pcs
                          </td>
                          <td className="py-4 px-4 font-mono">
                            <span className={`font-bold ${avgEfficiency >= 100 ? "text-emerald-600" : avgEfficiency > 80 ? "text-amber-500" : "text-rose-500"}`}>
                              {avgEfficiency}%
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              entry.status === 'approved' 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : entry.status === 'submitted'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isAdminOrSupervisor && (
                                <button
                                  onClick={() => handleOpenForm(entry)}
                                  className="p-1.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400 text-slate-400 dark:text-slate-400 rounded-lg transition"
                                  title="Edit"
                                >
                                  <Edit size={14} />
                                </button>
                              )}
                              {isAdminOrSupervisor && (
                                <button
                                  onClick={() => handleDelete(entry.id)}
                                  disabled={deletingId === entry.id}
                                  className="p-1.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 text-slate-400 dark:text-slate-400 rounded-lg transition"
                                  title="Delete"
                                >
                                  {deletingId === entry.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                              )}
                              {!isAdminOrSupervisor && (
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Locked</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRESET TARGETS MANAGER */}
      {activeSubTab === "targets" && isAdminOrSupervisor && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Preset Form */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm self-start">
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
                <Target size={18} className="text-indigo-500" />
                Preset Target Allocation
              </h3>
              
              <form onSubmit={handleAddTargetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Date *</label>
                  <input 
                    type="date" 
                    value={targetFormData.target_date} 
                    onChange={e => setTargetFormData({ ...targetFormData, target_date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Shift *</label>
                  <select 
                    value={targetFormData.shift} 
                    onChange={e => setTargetFormData({ ...targetFormData, shift: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  >
                    <option value="D">Day Shift (8 AM - 8 PM)</option>
                    <option value="N">Night Shift (8 PM - 8 AM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Assign Operator *</label>
                  {operators.length === 0 ? (
                    <div className="text-xs text-rose-500 py-2">No operators registered in database.</div>
                  ) : (
                    <select 
                      value={targetFormData.operator_id} 
                      onChange={e => handleTargetOperatorSelect(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      required
                    >
                      <option value="">-- Choose Operator --</option>
                      {operators.map(o => (
                        <option key={o.id} value={o.operator_id}>{o.operator_name} ({o.operator_id})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Job Number *</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={targetFormData.job_no} 
                      onChange={e => setTargetFormData({ ...targetFormData, job_no: e.target.value })}
                      placeholder="e.g. JB-9923"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-16 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      required 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                      {isTargetJobFetching && (
                        <Loader2 size={16} className="text-slate-400 animate-spin" />
                      )}
                      {!isTargetJobFetching && targetJobFetchStatus === 'found' && (
                        <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-800" title="Automatically loaded details from DB">
                          <Check size={10} className="stroke-[3]" /> Auto
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {targetJobResults.length > 1 && (
                  <div className="bg-indigo-50/75 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 p-3 rounded-2xl flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-500 animate-pulse" />
                      <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">Multiple Options Found ({targetJobResults.length})</span>
                    </div>
                    <select
                      value={`${targetFormData.color}|||${targetFormData.po_no}`}
                      onChange={(e) => {
                        const [col, po] = e.target.value.split("|||");
                        setTargetFormData(prev => ({ ...prev, color: col, po_no: po }));
                      }}
                      className="w-full text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                    >
                      {targetJobResults.map((res, idx) => (
                        <option key={idx} value={`${res.color}|||${res.po_no}`}>
                          Color: {res.color} | PO: {res.po_no || "N/A"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Color *</label>
                  <input 
                    type="text" 
                    value={targetFormData.color} 
                    onChange={e => setTargetFormData({ ...targetFormData, color: e.target.value })}
                    placeholder="e.g. Navy Blue"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">PO Number *</label>
                  <input 
                    type="text" 
                    value={targetFormData.po_no} 
                    onChange={e => setTargetFormData({ ...targetFormData, po_no: e.target.value })}
                    placeholder="e.g. PO-87122"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Standard Hourly Target (pcs/hr) *</label>
                  <input 
                    type="number" 
                    min="1"
                    value={targetFormData.hourly_target} 
                    onChange={e => setTargetFormData({ ...targetFormData, hourly_target: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono"
                    required 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isTargetSubmitting || operators.length === 0}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isTargetSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Preset Target
                </button>
              </form>
            </div>

            {/* List of presets */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
                <Layers size={18} className="text-indigo-500" />
                Preallocated Target Assignments Database
              </h3>
              
              {targets.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <Target size={48} className="mx-auto mb-4 opacity-10" />
                  <p>No active target allocations pre-set.</p>
                  <p className="text-xs text-slate-400 mt-1">Use the left form to assign standard hourly targets beforehand.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-300">
                        <th className="py-2.5 px-3 font-semibold text-xs">Target Date</th>
                        <th className="py-2.5 px-3 font-semibold text-xs">Shift</th>
                        <th className="py-2.5 px-3 font-semibold text-xs">Operator</th>
                        <th className="py-2.5 px-3 font-semibold text-xs">Job Details</th>
                        <th className="py-2.5 px-3 font-semibold text-xs">Hourly Target</th>
                        <th className="py-2.5 px-3 font-semibold text-xs">Status</th>
                        <th className="py-2.5 px-3 font-semibold text-xs text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {targets.map(t => (
                        <tr key={t.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${t.status === 'completed' ? 'opacity-60 bg-slate-50/20' : ''}`}>
                          <td className="py-3 px-3 font-mono text-xs whitespace-nowrap text-slate-800 dark:text-slate-200">{t.target_date}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                              {t.shift === 'D' ? 'Day' : t.shift === 'N' ? 'Night' : t.shift}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{t.operator_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Code: {t.operator_id}</div>
                          </td>
                          <td className="py-3 px-3 text-xs">
                            <div className="font-mono text-slate-700 dark:text-slate-300">Job: {t.job_no}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">Color: {t.color} | PO: {t.po_no}</div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-white">
                            {t.hourly_target} pcs/hr
                          </td>
                          <td className="py-3 px-3">
                            {t.status === 'completed' ? (
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                <CheckCircle2 size={12} className="text-emerald-500" /> Done
                              </span>
                            ) : (
                              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1">
                                <Sparkles size={12} className="animate-pulse" /> Active
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                             <div className="flex items-center justify-center gap-1">
                                {t.status !== 'completed' && (
                                  <button
                                    onClick={() => handleCompleteTarget(t.id)}
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 rounded-lg transition"
                                    title="Mark as Completed"
                                  >
                                    <Check size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => onDeleteTarget(t.id)}
                                  className="p-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 text-slate-400 rounded-lg transition"
                                  title="Delete Assignment"
                                >
                                  <Trash2 size={14} />
                                </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OPERATORS DIRECTORY */}
      {activeSubTab === "operators" && isAdminOrSupervisor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Add Operator Directory Card */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm self-start">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
              <UserCheck size={18} className="text-indigo-500" />
              Register New Operator
            </h3>
            
            <form onSubmit={handleAddOperatorSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Operator Name *</label>
                <input 
                  type="text" 
                  value={operatorFormData.operator_name} 
                  onChange={e => setOperatorFormData({ ...operatorFormData, operator_name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Company Operator ID Card *</label>
                <input 
                  type="text" 
                  value={operatorFormData.operator_id} 
                  onChange={e => setOperatorFormData({ ...operatorFormData, operator_id: e.target.value })}
                  placeholder="e.g. HS-009"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono"
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Designation *</label>
                <input 
                  type="text" 
                  value={operatorFormData.designation} 
                  onChange={e => setOperatorFormData({ ...operatorFormData, designation: e.target.value })}
                  placeholder="e.g. Senior Heat-Seal Operator"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  required 
                />
              </div>

              <button 
                type="submit" 
                disabled={isOpSubmitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isOpSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Add Operator to Directory
              </button>
            </form>
          </div>

          {/* Directory Listings */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
              <Users size={18} className="text-indigo-500" />
              Predefined Heat-Seal Operators Directory
            </h3>
            
            {operators.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <Users size={48} className="mx-auto mb-4 opacity-10" />
                <p>No predefined operators registered.</p>
                <p className="text-xs text-slate-400 mt-1">Use the left form to pre-populate operators into the company directory database.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-300 font-bold text-xs">
                      <th className="py-2.5 px-3">Operator Name</th>
                      <th className="py-2.5 px-3">Company ID Card</th>
                      <th className="py-2.5 px-3">Designation</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {operators.map(op => (
                      <tr key={op.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{op.operator_name}</td>
                        <td className="py-3 px-3 font-mono text-xs text-slate-700 dark:text-slate-300">{op.operator_id}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{op.designation}</td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleDeleteOperator(op.id)}
                            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 text-slate-400 rounded-lg transition"
                            title="Delete Operator"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CONSOLIDATED HOURLY TALLY GRID */}
      {activeSubTab === "hourly_tally" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
             {/* Report Filter Header */}
             <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center bg-slate-50/50 dark:bg-slate-800/20 gap-4">
                <div>
                   <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                      <Layers size={18} className="text-indigo-500" />
                      Consolidated Hourly Production Tally
                   </h3>
                   <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Shift-wise production grid for all active sessions on a specific day.</p>
                </div>
                <div className="flex items-center gap-3">
                   <button
                     onClick={handleExportExcel}
                     className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer mr-2"
                   >
                     <Download size={14} />
                     Export Excel
                   </button>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Report Date:</label>
                   <input 
                     type="date" 
                     value={reportDate}
                     onChange={e => setReportDate(e.target.value)}
                     className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white cursor-pointer shadow-sm"
                   />
                </div>
             </div>

             {/* Tally Content */}
             <div className="p-6 space-y-10">
                {(() => {
                   const dayEntries = entries.filter(e => e.entry_date === reportDate && (e.shift === 'D' || e.shift === 'A'));
                   const nightEntries = entries.filter(e => e.entry_date === reportDate && (e.shift === 'N' || e.shift === 'B'));
                   
                   const dayLabels = HOURS_LABELS.slice(0, 12);
                   const nightLabels = HOURS_LABELS.slice(12, 24);

                   if (dayEntries.length === 0 && nightEntries.length === 0) {
                      return (
                         <div className="py-24 text-center text-slate-400 italic">
                            <div className="flex flex-col items-center gap-2">
                               <Calendar size={40} className="opacity-10 mb-2" />
                               <p className="font-bold text-sm tracking-widest uppercase">No production records found</p>
                               <p className="text-[10px] font-medium opacity-60">There are no tally entries submitted for {new Date(reportDate).toLocaleDateString()}.</p>
                            </div>
                         </div>
                      );
                   }

                   return (
                      <>
                         {/* Day Shift Section */}
                         <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                               <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-600 dark:text-amber-400">
                                  <Sparkles size={16} />
                               </div>
                               <div>
                                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Day Shift (08:00 AM - 08:00 PM)</h4>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Lunch Break: 1-2 PM</p>
                                   <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-indigo-100/50 dark:border-indigo-900/30">Multi-Job Supported</span>
                                      <span className="text-[8px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-amber-100/50 dark:border-amber-900/30">Overtime Tracking (8PM+)</span>
                                   </div>
                               </div>
                            </div>
                            
                            <div className="overflow-x-auto scrollbar-thin border border-slate-100 dark:border-slate-800 rounded-xl">
                               <table className="w-full text-left text-[10px] border-collapse min-w-[1200px]">
                                  <thead>
                                     <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                                        <th className="py-3 px-4 font-black text-slate-700 dark:text-slate-200 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 border-r-2 border-slate-200 dark:border-slate-700 min-w-[150px] uppercase">Operator & Job</th>
                                        {dayLabels.map(hour => (
                                           <th key={hour} className={`py-3 px-1 font-black text-center border-r-2 border-slate-200 dark:border-slate-700 min-w-[100px] whitespace-nowrap text-[9px] ${hour === "1-2 PM" ? "bg-amber-50/50 text-amber-600" : "text-slate-600"}`}>
                                              <div className="mb-1">{hour.replace(' ', '')}</div>
                                              <div className="flex justify-between px-2 text-[7px] font-bold opacity-60">
                                                 <span>TGT</span>
                                                 <span>PROD</span>
                                                 <span>EFF%</span>
                                              </div>
                                              {hour === "1-2 PM" && <div className="text-[7px] mt-0.5 font-bold uppercase">Lunch</div>}
                                           </th>
                                        ))}
                                        <th className="py-3 px-4 font-black text-slate-700 dark:text-slate-200 bg-indigo-50/30 dark:bg-indigo-950/20 sticky right-0 z-10 border-l-2 border-slate-200 dark:border-slate-700 text-center uppercase">Total</th>
                                     </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                     {dayEntries.length === 0 ? (
                                        <tr><td colSpan={14} className="py-8 text-center text-slate-400 font-bold uppercase tracking-widest opacity-40">No day shift active sessions</td></tr>
                                     ) : dayEntries.map((entry, idx) => {
                                        const total = entry.hourly_data?.reduce((sum, h) => sum + (Number(h.production) || 0), 0) || 0;
                                        return (
                                           <tr key={entry.id} className={`${idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/40 dark:bg-slate-800/20"} hover:bg-slate-50 dark:hover:bg-slate-800/40 transition`}>
                                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-white sticky left-0 bg-inherit z-10 border-r-2 border-slate-200 dark:border-slate-700 shadow-sm">
                                                 <div className="truncate max-w-[120px] font-sans text-xs">{entry.operator_name}</div>
                                                 <div className="text-[9px] text-indigo-600 dark:text-indigo-400 font-black mt-1 bg-indigo-50 dark:bg-indigo-950/30 px-1 rounded inline-block uppercase tracking-tighter">Job: {entry.job_no || '-'}</div>
                                              </td>
                                              {dayLabels.map(hour => {
                                                 const hourData = entry.hourly_data?.find(h => h.hour_slot === hour);
                                                 const prod = Number(hourData?.production) || 0;
                                                 const target = Number(hourData?.target) || 0;
                                                 const eff = target > 0 ? (prod / target) * 100 : 0;
                                                 const isBreak = hour === "1-2 PM";
                                                 
                                                 const effColor = eff >= 100 ? "text-emerald-600" : eff >= 80 ? "text-amber-600" : "text-rose-600";
                                                 
                                                 return (
                                                    <td key={hour} className={`py-3 px-1 text-center border-r-2 border-slate-200/50 dark:border-slate-700/50 font-mono text-xs ${isBreak ? "bg-amber-50/20 dark:bg-amber-950/5" : ""}`}>
                                                       {isBreak && prod === 0 ? (
                                                          <span className="text-slate-300">—</span>
                                                       ) : (
                                                          <div className="flex items-center justify-between px-1 gap-1">
                                                             <span className="text-slate-400 text-[9px]">{target}</span>
                                                             <span className={`font-bold ${prod > 0 ? "text-indigo-600" : "text-slate-300"}`}>{prod}</span>
                                                             <span className={`text-[8px] font-black ${prod > 0 ? effColor : "text-slate-300"}`}>{eff > 0 ? eff.toFixed(0) + '%' : '0%'}</span>
                                                          </div>
                                                       )}
                                                    </td>
                                                 );
                                              })}
                                              <td className="py-3 px-4 font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20 sticky right-0 z-10 border-l-2 border-slate-200 dark:border-slate-700 text-center text-xs shadow-sm">
                                                 {total}
                                              </td>
                                           </tr>
                                        );
                                     })}
                                  </tbody>
                               </table>
                            </div>
                         </div>

                         {/* Night Shift Section */}
                         <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                               <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                  <Flame size={16} />
                               </div>
                               <div>
                                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Night Shift (08:00 PM - 08:00 AM)</h4>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Continuous Operations</p>
                                   <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-indigo-100/50 dark:border-indigo-900/30">Overtime Support (8 PM+)</span>
                                   </div>
                               </div>
                            </div>
                            
                            <div className="overflow-x-auto scrollbar-thin border border-slate-100 dark:border-slate-800 rounded-xl">
                               <table className="w-full text-left text-[10px] border-collapse min-w-[1200px]">
                                  <thead>
                                     <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                                        <th className="py-3 px-4 font-black text-slate-700 dark:text-slate-200 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 border-r-2 border-slate-200 dark:border-slate-700 min-w-[150px] uppercase">Operator & Job</th>
                                        {nightLabels.map(hour => (
                                           <th key={hour} className="py-3 px-1 font-black text-slate-600 dark:text-slate-300 text-center border-r-2 border-slate-200 dark:border-slate-700 min-w-[100px] whitespace-nowrap text-[9px]">
                                              <div className="mb-1">{hour.replace(' ', '')}</div>
                                              <div className="flex justify-between px-2 text-[7px] font-bold opacity-60">
                                                 <span>TGT</span>
                                                 <span>PROD</span>
                                                 <span>EFF%</span>
                                              </div>
                                           </th>
                                        ))}
                                        <th className="py-3 px-4 font-black text-slate-700 dark:text-slate-200 bg-indigo-50/30 dark:bg-indigo-950/20 sticky right-0 z-10 border-l-2 border-slate-200 dark:border-slate-700 text-center uppercase">Total</th>
                                     </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                     {nightEntries.length === 0 ? (
                                        <tr><td colSpan={14} className="py-8 text-center text-slate-400 font-bold uppercase tracking-widest opacity-40">No night shift active sessions</td></tr>
                                     ) : nightEntries.map((entry, idx) => {
                                        const total = entry.hourly_data?.reduce((sum, h) => sum + (Number(h.production) || 0), 0) || 0;
                                        return (
                                           <tr key={entry.id} className={`${idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/40 dark:bg-slate-800/20"} hover:bg-slate-50 dark:hover:bg-slate-800/40 transition`}>
                                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-white sticky left-0 bg-inherit z-10 border-r-2 border-slate-200 dark:border-slate-700 shadow-sm">
                                                 <div className="truncate max-w-[120px] font-sans text-xs">{entry.operator_name}</div>
                                                 <div className="text-[9px] text-indigo-600 dark:text-indigo-400 font-black mt-1 bg-indigo-50 dark:bg-indigo-950/30 px-1 rounded inline-block uppercase tracking-tighter">Job: {entry.job_no || '-'}</div>
                                              </td>
                                              {nightLabels.map(hour => {
                                                 const hourData = entry.hourly_data?.find(h => h.hour_slot === hour);
                                                 const prod = Number(hourData?.production) || 0;
                                                 const target = Number(hourData?.target) || 0;
                                                 const eff = target > 0 ? (prod / target) * 100 : 0;
                                                 
                                                 const effColor = eff >= 100 ? "text-emerald-600" : eff >= 80 ? "text-amber-600" : "text-rose-600";

                                                 return (
                                                    <td key={hour} className={`py-3 px-1 text-center border-r-2 border-slate-200/50 dark:border-slate-700/50 font-mono text-xs`}>
                                                       <div className="flex items-center justify-between px-1 gap-1">
                                                          <span className="text-slate-400 text-[9px]">{target}</span>
                                                          <span className={`font-bold ${prod > 0 ? "text-indigo-600" : "text-slate-300"}`}>{prod}</span>
                                                          <span className={`text-[8px] font-black ${prod > 0 ? effColor : "text-slate-300"}`}>{eff > 0 ? eff.toFixed(0) + '%' : '0%'}</span>
                                                       </div>
                                                    </td>
                                                 );
                                              })}
                                              <td className="py-3 px-4 font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20 sticky right-0 z-10 border-l-2 border-slate-200 dark:border-slate-700 text-center text-xs shadow-sm">
                                                 {total}
                                              </td>
                                           </tr>
                                        );
                                     })}
                                  </tbody>
                               </table>
                            </div>
                         </div>
                      </>
                   );
                })()}
             </div>
             
             {/* Legend & Summary Footer */}
             <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-6 text-[9px] uppercase tracking-widest font-black text-slate-400">
                <div className="flex items-center gap-6">
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-sm"></div>
                      <span>Active Production</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-amber-100 dark:bg-amber-900/40 rounded-sm"></div>
                      <span>Lunch Break (Day)</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-sm opacity-50"></div>
                      <span>Idle / Zero</span>
                   </div>
                </div>
                
                {(() => {
                   const dayEntries = entries.filter(e => e.entry_date === reportDate);
                   const grandTotal = dayEntries.reduce((sum, e) => sum + (e.hourly_data?.reduce((s, h) => s + (Number(h.production) || 0), 0) || 0), 0);
                   return (
                      <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-2">
                         <Sparkles size={12} className="text-amber-500" />
                         GRAND DAILY TOTAL: <span className="text-indigo-600 dark:text-indigo-400 text-sm font-black">{grandTotal.toLocaleString()} PCS</span>
                      </div>
                   );
                })()}
             </div>
          </div>
        </div>
      )}

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
