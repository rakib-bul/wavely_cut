import React, { useState, useEffect, useMemo } from "react";
import { utils, writeFile } from "xlsx";
import { formatDate } from "../utils/dateUtils";
import { CustomDatePicker } from "./common/DatePicker";
import { 
  Plus, Search, Trash2, Calendar, ClipboardList, Loader2, Save, X, Edit, Check, 
  Flame, Users, Target, ShieldAlert, CheckCircle2, AlertTriangle, FileSpreadsheet,
  Layers, UserCheck, Sparkles, Download
} from "lucide-react";
import { HeatSealEntry, HourlyHeatSealData, Profile, HeatSealOperator, HeatSealTarget, CuttingEntry } from "../types";

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
  cuttingEntries?: CuttingEntry[];
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
  cuttingEntries = [],
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
  const [activeSubTab, setActiveSubTab] = useState<"entries" | "targets" | "operators" | "hourly_tally">(
    currentProfile.role === "manager" ? "hourly_tally" : "entries"
  );

  useEffect(() => {
    if (currentProfile.role === "manager") {
      setActiveSubTab("hourly_tally");
    }
  }, [currentProfile.role]);
  
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
    target_qty: 0,
    max_po_qty: 0,
    status: 'active'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpSubmitting, setIsOpSubmitting] = useState(false);
  const [isTargetSubmitting, setIsTargetSubmitting] = useState(false);
  const [isDeletingOpId, setIsDeletingOpId] = useState<string | null>(null);
  const [isDeletingTargetId, setIsDeletingTargetId] = useState<string | null>(null);
  const [isCompletingTargetId, setIsCompletingTargetId] = useState<string | null>(null);
  
  const isGlobalLoading = isSubmitting || isOpSubmitting || isTargetSubmitting || 
    !!deletingId || !!isDeletingOpId || !!isDeletingTargetId || !!isCompletingTargetId;
  
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

  const isManager = currentProfile.role === "manager";
  const isOperator = currentProfile.role === "operator";
  const isAdminOrSupervisor = currentProfile.role === "admin" || currentProfile.role === "supervisor";
  const canAccessHeatSeal = isAdminOrSupervisor || currentProfile.can_access_heat_seal_entry !== false;
  const canEditEverything = isAdminOrSupervisor || isOperator;
  const canDeleteEverything = isAdminOrSupervisor;

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

  // Maximum PO Quantity fetched from Cutting Entries
  const getCuttingMaxPoQty = (jobNo?: string, poNo?: string, color?: string) => {
    if (!jobNo || !cuttingEntries || cuttingEntries.length === 0) return 0;
    const cleanJob = jobNo.trim().toLowerCase();
    const cleanPo = (poNo || "").trim().toLowerCase();
    const cleanCol = (color || "").trim().toLowerCase();

    const matching = cuttingEntries.filter(c => {
      if (!c.job_no || c.job_no.trim().toLowerCase() !== cleanJob) return false;
      if (cleanPo && c.po_no && c.po_no.trim().toLowerCase() !== cleanPo) return false;
      if (cleanCol && c.color && c.color.trim().toLowerCase() !== cleanCol) return false;
      return true;
    });

    if (matching.length === 0) return 0;

    let maxQty = 0;
    matching.forEach(c => {
      const orderQty = Number(c.order_qty) || 0;
      if (orderQty > maxQty) maxQty = orderQty;
    });

    // If order_qty is 0, sum cut pcs across sizes
    if (maxQty === 0) {
      matching.forEach(c => {
        const lay = Number(c.lay) || 1;
        const ratio = Number(c.ratio) || 1;
        let sumSizes = 0;
        if (c.sizes && typeof c.sizes === 'object') {
          Object.values(c.sizes).forEach(v => sumSizes += Number(v) || 0);
        }
        const pcs = lay * ratio * (sumSizes || 1);
        if (pcs > maxQty) maxQty = pcs;
      });
    }

    return maxQty;
  };

  // Calculate Cumulative Production Achieved for a given target
  const getTargetAchievedQty = (targetId?: string, targetObj?: HeatSealTarget) => {
    if (!targetId && !targetObj) return 0;
    let total = 0;
    entries.forEach(e => {
      let isMatch = false;
      if (targetId && e.target_id === targetId) {
        isMatch = true;
      } else if (targetObj) {
        if (
          e.operator_id === targetObj.operator_id &&
          e.job_no === targetObj.job_no &&
          (!targetObj.po_no || e.po_no === targetObj.po_no)
        ) {
          isMatch = true;
        }
      }
      if (isMatch && e.hourly_data) {
        e.hourly_data.forEach(s => {
          total += Number(s.production) || 0;
        });
      }
    });
    return total;
  };

  // Quick action: Assign new target to operator when current target is filled up
  const handleAssignNewTargetForOperator = (opId: string, opName: string) => {
    setTargetFormData({
      target_date: new Date().toISOString().split('T')[0],
      shift: "D",
      operator_id: opId,
      operator_name: opName,
      job_no: "",
      color: "",
      po_no: "",
      hourly_target: 100,
      target_qty: 0,
      max_po_qty: 0,
      status: 'active'
    });
    setActiveSubTab("targets");
    setIsFormOpen(false);
  };

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
    ) || targets.find(t => 
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
  const [jobResults, setJobResults] = useState<{ color: string; po_no: string; po_qty?: number }[]>([]);

  const [isTargetJobFetching, setIsTargetJobFetching] = useState(false);
  const [targetJobFetchStatus, setTargetJobFetchStatus] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [targetJobResults, setTargetJobResults] = useState<{ color: string; po_no: string; po_qty?: number }[]>([]);

  // Helper: Perform client-side local memory job lookup using client CPU/RAM
  const performClientLocalJobLookup = (jobNoToSearch: string) => {
    const cleanJob = jobNoToSearch.trim().toLowerCase();
    const map = new Map<string, { color: string; po_no: string; po_qty: number }>();

    // 1. Search cuttingEntries in client memory
    (cuttingEntries || []).forEach(c => {
      if (c.job_no && c.job_no.trim().toLowerCase().includes(cleanJob)) {
        const col = (c.color || "").trim();
        const po = (c.po_no || "").trim();
        if (col) {
          const key = `${col.toLowerCase()}|||${po.toLowerCase()}`;
          const qty = Number(c.order_qty) || 0;
          const existing = map.get(key);
          if (!existing) {
            map.set(key, { color: col, po_no: po, po_qty: qty });
          } else if (qty > existing.po_qty) {
            existing.po_qty = qty;
          }
        }
      }
    });

    // 2. Search targets in client memory
    (targets || []).forEach(t => {
      if (t.job_no && t.job_no.trim().toLowerCase().includes(cleanJob)) {
        const col = (t.color || "").trim();
        const po = (t.po_no || "").trim();
        if (col) {
          const key = `${col.toLowerCase()}|||${po.toLowerCase()}`;
          const qty = Number(t.max_po_qty || t.target_qty) || 0;
          const existing = map.get(key);
          if (!existing) {
            map.set(key, { color: col, po_no: po, po_qty: qty });
          } else if (qty > existing.po_qty) {
            existing.po_qty = qty;
          }
        }
      }
    });

    // 3. Search heat seal entries in client memory
    (entries || []).forEach(e => {
      if (e.job_no && e.job_no.trim().toLowerCase().includes(cleanJob)) {
        const col = (e.color || "").trim();
        const po = (e.po_no || "").trim();
        if (col) {
          const key = `${col.toLowerCase()}|||${po.toLowerCase()}`;
          if (!map.has(key)) {
            map.set(key, { color: col, po_no: po, po_qty: 0 });
          }
        }
      }
    });

    return Array.from(map.values());
  };

  // Fetch job details (color & po number) when job_no is typed in the entry field
  useEffect(() => {
    if (foundTarget || !formData.job_no || formData.job_no.trim().length < 2) {
      setJobFetchStatus('idle');
      setJobResults([]);
      return;
    }

    const jobNoToSearch = formData.job_no.trim();

    // First check client CPU memory instantly (0ms network overhead)
    const localResults = performClientLocalJobLookup(jobNoToSearch);
    if (localResults.length > 0) {
      setJobResults(localResults);
      setFormData(prev => {
        if (prev.job_no?.trim() === jobNoToSearch) {
          return {
            ...prev,
            color: localResults[0].color || prev.color || "",
            po_no: localResults[0].po_no || prev.po_no || ""
          };
        }
        return prev;
      });
      setJobFetchStatus('found');
      setIsJobFetching(false);
      return;
    }

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
  }, [formData.job_no, foundTarget, cuttingEntries, entries, targets]);

  // Fetch job details (color & po number) when job_no is typed in the preset targets form
  useEffect(() => {
    if (!targetFormData.job_no || targetFormData.job_no.trim().length < 2) {
      setTargetJobFetchStatus('idle');
      setTargetJobResults([]);
      return;
    }

    const jobNoToSearch = targetFormData.job_no.trim();

    // First check client CPU memory instantly (0ms network overhead)
    const localResults = performClientLocalJobLookup(jobNoToSearch);
    if (localResults.length > 0) {
      setTargetJobResults(localResults);
      setTargetFormData(prev => {
        if (prev.job_no?.trim() === jobNoToSearch) {
          return {
            ...prev,
            color: localResults[0].color || prev.color || "",
            po_no: localResults[0].po_no || prev.po_no || ""
          };
        }
        return prev;
      });
      setTargetJobFetchStatus('found');
      setIsTargetJobFetching(false);
      return;
    }

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
  }, [targetFormData.job_no, cuttingEntries, entries, targets]);

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

    if (!canAccessHeatSeal && !editingId) {
      setAlertDialog({ isOpen: true, title: "Access Denied", message: "You do not have permission to enter heat seal data." });
      return;
    }

    if (isManager) {
      setAlertDialog({ isOpen: true, title: "Access Denied", message: "Managers can only view the hourly heatseal production." });
      return;
    }

    if (editingId && !canEditEverything) {
      setAlertDialog({ isOpen: true, title: "Access Denied", message: "Only Operators, Officers, and Administrators can edit records." });
      return;
    }

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
    if (!canDeleteEverything) {
      setAlertDialog({ isOpen: true, title: "Access Denied", message: "Only Officers and Administrators can delete entries." });
      return;
    }
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
    if (!canEditEverything) {
      setAlertDialog({ isOpen: true, title: "Access Denied", message: "Only Operators, Officers and Administrators can register predefined operators." });
      return;
    }
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
    if (!canDeleteEverything) {
      setAlertDialog({ isOpen: true, title: "Access Denied", message: "Only Officers and Administrators can delete predefined operators." });
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: "Delete Operator",
      message: "Are you sure you want to delete this predefined operator? This will clear their record from the directory.",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setIsDeletingOpId(id);
        try {
          await onDeleteOperator(id);
        } catch (err: any) {
          checkAndSetSchemaError(err);
          setAlertDialog({ isOpen: true, title: "Operation Failed", message: err.message || "Failed to delete operator." });
        } finally {
          setIsDeletingOpId(null);
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
    if (!canEditEverything) {
      setAlertDialog({ isOpen: true, title: "Access Denied", message: "Only Operators, Officers and Administrators can complete targets." });
      return;
    }
    setIsCompletingTargetId(id);
    try {
      const response = await onUpdateTarget(id, { status: 'completed' }) as any;
      
      if (response?.warning) {
        setAlertDialog({
          isOpen: true,
          title: "Partially Successful",
          message: "The target was updated, but the completion status couldn't be saved because the database schema is outdated. Please ask an administrator to run the status update SQL."
        });
      }

      // Reset found target in the entry form if it was the one being completed
      if (foundTarget && foundTarget.id === id) {
        setFoundTarget(null);
        setTargetSearchTriggered(true);
      }
    } catch (err: any) {
      console.error("Error completing target:", err);
      setAlertDialog({
        isOpen: true,
        title: "Completion Failed",
        message: err.message || "Failed to mark target as completed."
      });
    } finally {
      setIsCompletingTargetId(null);
    }
  };

  const handleAddTargetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditEverything) {
      setAlertDialog({ isOpen: true, title: "Access Denied", message: "Only Operators, Officers and Administrators can preset targets." });
      return;
    }
    const { target_date, shift, operator_id, operator_name, job_no, color, po_no, hourly_target } = targetFormData;
    if (!target_date || !shift || !operator_id || !job_no || !color || !po_no || !hourly_target) {
      setAlertDialog({ isOpen: true, title: "Missing Information", message: "All fields are required to preset a target assignment." });
      return;
    }
    setIsTargetSubmitting(true);
    try {
      const response = await onAddTarget(targetFormData) as any;
      setTargetFormData(prev => ({
        ...prev,
        job_no: "",
        color: "",
        po_no: "",
        hourly_target: 100
      }));
      
      if (response?.warning) {
        setAlertDialog({ 
          isOpen: true, 
          title: "Created with Warning", 
          message: "Target was created, but Status tracking is disabled because the database schema is outdated. Please ask an administrator to run the status update SQL." 
        });
      } else {
        setAlertDialog({ isOpen: true, title: "Success", message: "Target assignment successfully preset!" });
      }
    } catch (err: any) {
      checkAndSetSchemaError(err);
      setAlertDialog({ isOpen: true, title: "Operation Failed", message: err.message || "Failed to preset target assignment." });
    } finally {
      setIsTargetSubmitting(false);
    }
  };

  const handleDeleteTarget = (id: string) => {
    if (!canDeleteEverything) {
      setAlertDialog({ isOpen: true, title: "Access Denied", message: "Only Officers and Administrators can delete preset targets." });
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: "Delete Target",
      message: "Are you sure you want to cancel and delete this target assignment?",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setIsDeletingTargetId(id);
        try {
          await onDeleteTarget(id);
        } catch (err: any) {
          checkAndSetSchemaError(err);
          setAlertDialog({ isOpen: true, title: "Operation Failed", message: err.message || "Failed to delete target assignment." });
        } finally {
          setIsDeletingTargetId(null);
        }
      }
    });
  };

  const handleExportExcel = () => {
    const dayLabels = HOURS_LABELS.slice(0, 12);
    const nightLabels = HOURS_LABELS.slice(12, 24);

    const getExcelShiftRows = (shiftGroup: 'day' | 'night') => {
      const currentShifts = shiftGroup === 'day' ? ['D', 'A'] : ['N', 'B'];
      const labels = shiftGroup === 'day' ? dayLabels : nightLabels;

      const relevantTargets = (targets || []).filter(t => t.target_date === reportDate && currentShifts.includes(t.shift));
      const relevantEntries = entries.filter(e => e.entry_date === reportDate && currentShifts.includes(e.shift));

      const uniquePairs = new Map<string, { operator_id: string, operator_name: string, job_no: string, color?: string, po_no?: string, target_id?: string }>();
      
      // Identify rows from targets
      relevantTargets.forEach(t => {
         const key = `${t.operator_id}-${t.job_no}`;
         uniquePairs.set(key, { 
            operator_id: t.operator_id, 
            operator_name: t.operator_name, 
            job_no: t.job_no, 
            color: t.color,
            po_no: t.po_no,
            target_id: t.id
         });
      });

      // Identify rows from entries (in case there's no target for an entry)
      relevantEntries.forEach(e => {
         const key = `${e.operator_id}-${e.job_no || 'no-job'}`;
         if (!uniquePairs.has(key)) {
            uniquePairs.set(key, { 
               operator_id: e.operator_id, 
               operator_name: e.operator_name, 
               job_no: e.job_no || '', 
               color: e.color,
               po_no: e.po_no
            });
         }
      });

      return Array.from(uniquePairs.values()).map(pair => {
         const entry = relevantEntries.find(e => e.operator_id === pair.operator_id && (e.job_no || '') === pair.job_no);
         const target = relevantTargets.find(t => t.operator_id === pair.operator_id && t.job_no === pair.job_no);

         return {
            operator_name: pair.operator_name,
            job_no: pair.job_no,
            color: pair.color || entry?.color || target?.color || "-",
            po_no: pair.po_no || entry?.po_no || target?.po_no || "-",
            hourly_data: labels.map(slot => {
               const hourEntry = entry?.hourly_data?.find(h => h.hour_slot === slot);
               return {
                  hour_slot: slot,
                  production: hourEntry?.production || 0,
                  target: hourEntry?.target || target?.hourly_target || 0
               };
            })
         };
      }).sort((a, b) => {
         const nameCmp = a.operator_name.localeCompare(b.operator_name);
         if (nameCmp !== 0) return nameCmp;
         return a.job_no.localeCompare(b.job_no);
      });
    };

    const dayEntries = getExcelShiftRows('day');
    const nightEntries = getExcelShiftRows('night');

    const wb = utils.book_new();

    const getColLetter = (colIdx: number): string => {
      let temp = colIdx;
      let letter = "";
      while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
      }
      return letter;
    };

    const generateShiftSheet = (shiftEntries: any[], labels: string[], shiftName: string) => {
      const data: any[] = [];
      
      // Title Block
      data.push([
        { t: 's', v: `HEAT-SEAL HOURLY PRODUCTION REPORT — ${shiftName}` }
      ]);
      data.push([
        { t: 's', v: `Date: ${formatDate(reportDate)} | Shift Time: ${shiftName === "DAY SHIFT" ? "08:00 AM - 08:00 PM" : "08:00 PM - 08:00 AM"}` }
      ]);
      data.push([
        { t: 's', v: `Report generated on: ${new Date().toLocaleString()}` }
      ]);
      data.push([]); // Spacer row 4

      // Row 5 & 6: Summary cards
      const lastRow = 9 + shiftEntries.length;
      data.push([
        { t: 's', v: "SUMMARY METRICS:" },
        { t: 's', v: "TOTAL PRODUCTION" },
        "",
        { t: 's', v: "TOTAL TARGET" },
        "",
        { t: 's', v: "OVERALL EFFICIENCY" }
      ]);
      data.push([
        "",
        { t: 'n', f: `SUM(AP10:AP${lastRow})`, z: '#,##0' },
        "",
        { t: 'n', f: `SUM(AO10:AO${lastRow})`, z: '#,##0' },
        "",
        { t: 'n', f: `IF(D6>0, B6/D6, 0)`, z: '0.0%' }
      ]);
      data.push([]); // Spacer row 7

      // Row 8: Table Header Categories (Multi-level header)
      const catHeader: any[] = [];
      catHeader[0] = { t: 's', v: "OPERATOR & JOB INFO" };
      catHeader[1] = "";
      catHeader[2] = "";
      catHeader[3] = "";
      
      labels.forEach((hour, idx) => {
        const colIdx = 4 + idx * 3;
        catHeader[colIdx] = { t: 's', v: hour };
        catHeader[colIdx + 1] = "";
        catHeader[colIdx + 2] = "";
      });
      
      const totalsColIdx = 4 + labels.length * 3;
      catHeader[totalsColIdx] = { t: 's', v: "SHIFT SUMMARY TOTALS" };
      catHeader[totalsColIdx + 1] = "";
      catHeader[totalsColIdx + 2] = "";
      
      // Fill remaining columns in category header
      for (let c = 0; c < 43; c++) {
        if (catHeader[c] === undefined) catHeader[c] = "";
      }
      data.push(catHeader);

      // Row 9: Table Header Columns
      const subHeader: any[] = ["Operator Name", "Job No", "Color", "PO No"];
      labels.forEach(() => {
        subHeader.push("TGT", "PROD", "EFF%");
      });
      subHeader.push("TOTAL TGT", "TOTAL PROD", "AVG EFF");
      data.push(subHeader);

      // Rows 10+: Operator Rows
      shiftEntries.forEach((entry, opIdx) => {
        const R = 10 + opIdx;
        const row: any[] = [
          { t: 's', v: entry.operator_name },
          { t: 's', v: entry.job_no || "-" },
          { t: 's', v: entry.color || "-" },
          { t: 's', v: entry.po_no || "-" },
        ];

        labels.forEach((hour, hIdx) => {
          const hData = entry.hourly_data?.find((h: any) => h.hour_slot === hour);
          const p = Number(hData?.production) || 0;
          const t = Number(hData?.target) || 0;
          
          row.push({ t: 'n', v: t, z: '#,##0' });
          row.push({ t: 'n', v: p, z: '#,##0' });
          
          const tgtCol = getColLetter(4 + hIdx * 3);
          const prodCol = getColLetter(5 + hIdx * 3);
          row.push({ t: 'n', f: `IF(${tgtCol}${R}>0, ${prodCol}${R}/${tgtCol}${R}, 0)`, z: '0%' });
        });

        // Sum targets
        const tgtColsSum = labels.map((_, hIdx) => `${getColLetter(4 + hIdx * 3)}${R}`).join("+");
        row.push({ t: 'n', f: tgtColsSum, z: '#,##0' });

        // Sum production
        const prodColsSum = labels.map((_, hIdx) => `${getColLetter(5 + hIdx * 3)}${R}`).join("+");
        row.push({ t: 'n', f: prodColsSum, z: '#,##0' });

        // Avg Efficiency
        row.push({ t: 'n', f: `IF(AO${R}>0, AP${R}/AO${R}, 0)`, z: '0.0%' });

        data.push(row);
      });

      // Footer Row
      const footerRow = 10 + shiftEntries.length;
      const footer: any[] = [
        { t: 's', v: "SHIFT GRAND TOTALS" },
        "",
        "",
        "",
      ];

      labels.forEach((_, hIdx) => {
        const tgtCol = getColLetter(4 + hIdx * 3);
        const prodCol = getColLetter(5 + hIdx * 3);
        
        footer.push({ t: 'n', f: `SUM(${tgtCol}10:${tgtCol}${lastRow})`, z: '#,##0' });
        footer.push({ t: 'n', f: `SUM(${prodCol}10:${prodCol}${lastRow})`, z: '#,##0' });
        footer.push({ t: 'n', f: `IF(${tgtCol}${footerRow}>0, ${prodCol}${footerRow}/${tgtCol}${footerRow}, 0)`, z: '0%' });
      });

      footer.push({ t: 'n', f: `SUM(AO10:AO${lastRow})`, z: '#,##0' });
      footer.push({ t: 'n', f: `SUM(AP10:AP${lastRow})`, z: '#,##0' });
      footer.push({ t: 'n', f: `IF(AO${footerRow}>0, AP${footerRow}/AO${footerRow}, 0)`, z: '0.0%' });

      data.push(footer);

      const ws = utils.aoa_to_sheet(data);
      
      // Apply Merges
      const merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 42 } }, // Main title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 42 } }, // Meta info
        { s: { r: 2, c: 0 }, e: { r: 2, c: 42 } }, // Timestamp
        
        { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } }, // Tot Prod Label
        { s: { r: 4, c: 3 }, e: { r: 4, c: 4 } }, // Tot Tgt Label
        { s: { r: 4, c: 5 }, e: { r: 4, c: 6 } }, // Overall Eff Label
        
        { s: { r: 5, c: 1 }, e: { r: 5, c: 2 } }, // Tot Prod Val
        { s: { r: 5, c: 3 }, e: { r: 5, c: 4 } }, // Tot Tgt Val
        { s: { r: 5, c: 5 }, e: { r: 5, c: 6 } }, // Overall Eff Val
        
        { s: { r: 7, c: 0 }, e: { r: 7, c: 3 } }, // Operator Job Info category label
      ];
      
      labels.forEach((_, idx) => {
        merges.push({
          s: { r: 7, c: 4 + idx * 3 },
          e: { r: 7, c: 6 + idx * 3 }
        });
      });
      
      merges.push({
        s: { r: 7, c: 40 },
        e: { r: 7, c: 42 }
      });
      
      merges.push({
        s: { r: footerRow - 1, c: 0 },
        e: { r: footerRow - 1, c: 3 }
      });
      
      ws['!merges'] = merges;

      // Set column widths
      const wscols = [
        { wch: 22 }, // Operator Name
        { wch: 12 }, // Job No
        { wch: 12 }, // Color
        { wch: 12 }, // PO No
      ];
      labels.forEach(() => {
        wscols.push(
          { wch: 7 }, // TGT
          { wch: 7 }, // PROD
          { wch: 8 }  // EFF
        );
      });
      wscols.push(
        { wch: 12 }, // Total TGT
        { wch: 12 }, // Total PROD
        { wch: 12 }  // Avg EFF
      );
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
      const ws = utils.aoa_to_sheet([["No data available for selected date", formatDate(reportDate)]]);
      utils.book_append_sheet(wb, ws, "No Data");
    }

    writeFile(wb, `HeatSeal_Production_Report_${formatDate(reportDate)}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 relative">
      {/* Loading Progress Bar */}
      {isGlobalLoading && (
        <div className="fixed top-0 left-0 w-full h-1.5 z-[100] bg-indigo-100/30 dark:bg-indigo-950/20 overflow-hidden">
          <div className="h-full w-full bg-indigo-600 animate-[loading_1.5s_infinite_linear] origin-left shadow-[0_0_8px_rgba(79,70,229,0.6)]" />
        </div>
      )}
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
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
          {!isManager && (
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
          )}

          <button
            onClick={() => setActiveSubTab("hourly_tally")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeSubTab === "hourly_tally" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" 
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Layers size={16} />
            Hourly Heatseal Production
          </button>

          {canAccessHeatSeal && !isManager && (
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

          {canAccessHeatSeal && !isManager && (
          <button
            onClick={() => { handleOpenForm(); setActiveSubTab("entries"); }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-200 dark:shadow-none"
          >
            <Plus size={16} />
            New Entry
          </button>
          )}
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
                    <CustomDatePicker 
                      selectedDate={formData.entry_date} 
                      onChange={date => setFormData({ ...formData, entry_date: date })}
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
                  <div className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                    foundTarget 
                      ? (() => {
                          const achievedSoFar = getTargetAchievedQty(foundTarget.id, foundTarget);
                          const currentFormProd = (formData.hourly_data || []).reduce((acc, h) => acc + (Number(h.production) || 0), 0);
                          const totalAchieved = achievedSoFar + (editingId ? 0 : currentFormProd);
                          const targetMaxQty = foundTarget.target_qty || foundTarget.max_po_qty || getCuttingMaxPoQty(formData.job_no, formData.po_no, formData.color) || (foundTarget.hourly_target ? foundTarget.hourly_target * 10 : 0);
                          const isFilledUp = targetMaxQty > 0 && (totalAchieved >= targetMaxQty || foundTarget.status === 'completed');
                          return isFilledUp 
                            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800" 
                            : "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40";
                        })()
                      : "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
                  }`}>
                    {foundTarget ? (() => {
                      const achievedSoFar = getTargetAchievedQty(foundTarget.id, foundTarget);
                      const currentFormProd = (formData.hourly_data || []).reduce((acc, h) => acc + (Number(h.production) || 0), 0);
                      const totalAchieved = achievedSoFar + (editingId ? 0 : currentFormProd);
                      const targetMaxQty = foundTarget.target_qty || foundTarget.max_po_qty || getCuttingMaxPoQty(formData.job_no, formData.po_no, formData.color) || (foundTarget.hourly_target ? foundTarget.hourly_target * 10 : 0);
                      const fillPercent = targetMaxQty > 0 ? Math.min(100, Math.round((totalAchieved / targetMaxQty) * 100)) : 0;
                      const isFilledUp = targetMaxQty > 0 && (totalAchieved >= targetMaxQty || foundTarget.status === 'completed');

                      return (
                        <>
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2.5 rounded-xl text-white shrink-0 mt-0.5 ${
                              isFilledUp ? "bg-amber-500 shadow-md shadow-amber-200 dark:shadow-none" : "bg-emerald-600 shadow-md shadow-emerald-200 dark:shadow-none"
                            }`}>
                              {isFilledUp ? <CheckCircle2 size={20} /> : <Target size={20} />}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white">
                                  {isFilledUp ? "🎉 Target Quantity Filled Up!" : "Target Assignment Active"}
                                </h4>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  isFilledUp 
                                    ? "bg-amber-500 text-white animate-pulse" 
                                    : "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
                                }`}>
                                  {fillPercent}% Achieved ({totalAchieved.toLocaleString()} / {targetMaxQty > 0 ? targetMaxQty.toLocaleString() : "N/A"} Pcs)
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-700 dark:text-slate-300">
                                <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border text-[11px] font-bold">
                                  Job: {formData.job_no}
                                </span>
                                <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border text-[11px]">
                                  Color: {formData.color}
                                </span>
                                <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border text-[11px]">
                                  PO: {formData.po_no}
                                </span>
                                <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                  Hourly Target: {foundTarget.hourly_target} pcs/hr
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 ${isFilledUp ? "bg-amber-500" : "bg-emerald-500"}`}
                                  style={{ width: `${Math.min(100, fillPercent)}%` }}
                                />
                              </div>

                              {isFilledUp && (
                                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mt-2">
                                  Target of {targetMaxQty.toLocaleString()} pcs for PO {formData.po_no} is 100% completed. Please assign a new target to {formData.operator_name || foundTarget.operator_name}.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 w-full md:w-auto">
                            {canEditEverything && isFilledUp && (
                              <button 
                                type="button"
                                onClick={() => handleAssignNewTargetForOperator(foundTarget.operator_id, formData.operator_name || foundTarget.operator_name)}
                                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition"
                              >
                                <Plus size={14} className="stroke-[3]" />
                                Assign New Target
                              </button>
                            )}

                            {canEditEverything && (
                              <button 
                                type="button"
                                onClick={() => handleCompleteTarget(foundTarget.id)}
                                disabled={isCompletingTargetId === foundTarget.id}
                                className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition border border-slate-200 dark:border-slate-700 shadow-sm disabled:opacity-50"
                              >
                                {isCompletingTargetId === foundTarget.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} className="stroke-[3]" />}
                                {isFilledUp ? "Close Target" : "Finish Job / Switch"}
                              </button>
                            )}
                          </div>
                        </>
                      );
                    })() : (
                      <div className="flex items-center gap-3">
                        <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                        <div className="text-sm">
                          <span className="font-bold text-slate-800 dark:text-white">No beforehand target pre-allocation found</span> for Operator on this date/shift. 
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">An admin or officer can preset a target assignment beforehand to populate Targets, Job No, Color, PO No, and Max PO Qty.</p>
                        </div>
                      </div>
                    )}
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
                            {formatDate(entry.entry_date)}
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
                              {canEditEverything && (
                              <button
                                onClick={() => handleOpenForm(entry)}
                                disabled={isGlobalLoading}
                                className="p-1.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400 text-slate-400 dark:text-slate-400 rounded-lg transition disabled:opacity-50"
                                title="Edit"
                              >
                                <Edit size={14} />
                              </button>
                              )}
                              {canDeleteEverything && (
                               <button
                                  onClick={() => handleDelete(entry.id)}
                                  disabled={deletingId === entry.id}
                                  className="p-1.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-500 dark:text-rose-400 rounded-lg transition border border-rose-100/50 dark:border-rose-800/30"
                                  title="Delete Permanent Record"
                                >
                                  {deletingId === entry.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                              )}
                              {!canEditEverything && (
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
      {activeSubTab === "targets" && canAccessHeatSeal && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Preset Form */}
            {canEditEverything ? (
              <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm self-start">
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
                <Target size={18} className="text-indigo-500" />
                Preset Target Allocation
              </h3>
              
              <form onSubmit={handleAddTargetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Date *</label>
                  <CustomDatePicker 
                    selectedDate={targetFormData.target_date} 
                    onChange={date => setTargetFormData({ ...targetFormData, target_date: date })}
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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Set Target Qty (pcs)</label>
                    {targetFormData.max_po_qty ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">
                        Max PO: {targetFormData.max_po_qty.toLocaleString()} pcs
                      </span>
                    ) : null}
                  </div>
                  <input 
                    type="number" 
                    min="0"
                    value={targetFormData.target_qty || ""} 
                    onChange={e => setTargetFormData({ ...targetFormData, target_qty: Number(e.target.value) })}
                    placeholder={targetFormData.max_po_qty ? `Default Max PO: ${targetFormData.max_po_qty}` : "Total Target Qty"}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Max PO quantity automatically fetched from Cutting Entries. Operator is prompted for a new target upon completion.
                  </p>
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
            ) : (
              <div className="lg:col-span-1 bg-slate-50 dark:bg-slate-850 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 self-start text-center">
                <ShieldAlert size={36} className="mx-auto mb-3 text-slate-400" />
                <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1">Preset Access Restricted</h4>
                <p className="text-xs text-slate-500">Only Admins, Officers, and Operators can pre-allocate standard hourly targets.</p>
              </div>
            )}

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
                        <th className="py-2.5 px-3 font-semibold text-xs">Targets (Hourly / PO Max)</th>
                        <th className="py-2.5 px-3 font-semibold text-xs">Fill Status</th>
                        <th className="py-2.5 px-3 font-semibold text-xs text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {targets.map(t => {
                        const totalAchieved = getTargetAchievedQty(t.id, t);
                        const maxPoQty = t.max_po_qty || getCuttingMaxPoQty(t.job_no, t.po_no, t.color);
                        const totalTargetQty = t.target_qty || maxPoQty || (t.hourly_target * 10);
                        const fillPercent = totalTargetQty > 0 ? Math.min(100, Math.round((totalAchieved / totalTargetQty) * 100)) : 0;
                        const isFilledUp = totalTargetQty > 0 && (totalAchieved >= totalTargetQty || t.status === 'completed');

                        return (
                          <tr key={t.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${t.status === 'completed' ? 'opacity-60 bg-slate-50/20' : ''}`}>
                          <td className="py-3 px-3 font-mono text-xs whitespace-nowrap text-slate-800 dark:text-slate-200">{formatDate(t.target_date)}</td>
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
                          <td className="py-3 px-3 text-xs">
                            <div className="font-mono font-bold text-slate-800 dark:text-white">{t.hourly_target} pcs/hr</div>
                            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                              Target: {totalTargetQty > 0 ? totalTargetQty.toLocaleString() + ' pcs' : 'N/A'}
                            </div>
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
                                {canEditEverything ? (
                                  <>
                                    {t.status !== 'completed' && (
                                      <button
                                        onClick={() => handleCompleteTarget(t.id)}
                                        disabled={isCompletingTargetId === t.id}
                                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 rounded-lg transition disabled:opacity-50"
                                        title="Mark as Completed"
                                      >
                                        {isCompletingTargetId === t.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                      </button>
                                    )}
                                    {canDeleteEverything && (
                                      <button
                                        onClick={() => handleDeleteTarget(t.id)}
                                        disabled={isDeletingTargetId === t.id}
                                        className="p-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 text-slate-400 rounded-lg transition disabled:opacity-50"
                                        title="Delete Assignment"
                                      >
                                        {isDeletingTargetId === t.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                      </button>
                                    )}
                                  </>
                                ) : (
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
        </div>
      )}

      {/* TAB 3: OPERATORS DIRECTORY */}
      {activeSubTab === "operators" && canAccessHeatSeal && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Add Operator Directory Card */}
          {canEditEverything ? (
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
          ) : (
            <div className="lg:col-span-1 bg-slate-50 dark:bg-slate-850 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 self-start text-center">
              <ShieldAlert size={36} className="mx-auto mb-3 text-slate-400" />
              <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1">Add Access Restricted</h4>
              <p className="text-xs text-slate-500">Only Admins, Officers and Operators can register new predefined operators.</p>
            </div>
          )}

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
                            {canDeleteEverything ? (
                              <button
                                onClick={() => handleDeleteOperator(op.id)}
                                disabled={isDeletingOpId === op.id}
                                className="p-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 text-slate-400 rounded-lg transition disabled:opacity-50"
                                title="Delete Operator"
                              >
                                {isDeletingOpId === op.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Locked</span>
                            )}
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
                      Hourly Heatseal Production
                   </h3>
                   <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Shift-wise production grid for all active sessions on a specific day.</p>
                </div>
                <div className="flex items-center gap-3">
                   <button
                     onClick={handleExportExcel}
                     disabled={isGlobalLoading}
                     className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer mr-2 disabled:opacity-50"
                   >
                     <Download size={14} />
                     Export Excel
                   </button>
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Report Date:</label>
                   <div className="w-[140px]">
                     <CustomDatePicker 
                       selectedDate={reportDate} 
                       onChange={date => setReportDate(date)}
                       className="!h-8"
                     />
                   </div>
                </div>
             </div>

             {/* Tally Content */}
             <div className="p-6 space-y-10">
                {(() => {
                   const dayLabels = HOURS_LABELS.slice(0, 12);
                   const nightLabels = HOURS_LABELS.slice(12, 24);

                   // Logic to consolidate targets and actual entries into separate rows per job
                   const getShiftRows = (shiftGroup: 'day' | 'night') => {
                      const currentShifts = shiftGroup === 'day' ? ['D', 'A'] : ['N', 'B'];
                      const labels = shiftGroup === 'day' ? dayLabels : nightLabels;

                      const relevantTargets = targets.filter(t => t.target_date === reportDate && currentShifts.includes(t.shift));
                      const relevantEntries = entries.filter(e => e.entry_date === reportDate && currentShifts.includes(e.shift));

                      const uniquePairs = new Map<string, { operator_id: string, operator_name: string, job_no: string, color?: string, target_id?: string }>();
                      
                      // Identify rows from targets
                      relevantTargets.forEach(t => {
                         const key = `${t.operator_id}-${t.job_no}`;
                         uniquePairs.set(key, { 
                            operator_id: t.operator_id, 
                            operator_name: t.operator_name, 
                            job_no: t.job_no, 
                            color: t.color,
                            target_id: t.id
                         });
                      });

                      // Identify rows from entries (in case there's no target for an entry)
                      relevantEntries.forEach(e => {
                         const key = `${e.operator_id}-${e.job_no || 'no-job'}`;
                         if (!uniquePairs.has(key)) {
                            uniquePairs.set(key, { 
                               operator_id: e.operator_id, 
                               operator_name: e.operator_name, 
                               job_no: e.job_no || '', 
                               color: e.color
                            });
                         }
                      });

                      return Array.from(uniquePairs.values()).map(pair => {
                         // Find matching entry if it exists
                         const entry = relevantEntries.find(e => e.operator_id === pair.operator_id && (e.job_no || '') === pair.job_no);
                         const target = relevantTargets.find(t => t.operator_id === pair.operator_id && t.job_no === pair.job_no);

                         return {
                            id: entry?.id || `v-${pair.operator_id}-${pair.job_no}`,
                            operator_name: pair.operator_name,
                            job_no: pair.job_no,
                            color: pair.color || entry?.color || target?.color,
                            hourly_data: labels.map(slot => {
                               const hourEntry = entry?.hourly_data?.find(h => h.hour_slot === slot);
                               return {
                                  hour_slot: slot,
                                  production: hourEntry?.production || 0,
                                  target: hourEntry?.target || target?.hourly_target || 0
                               };
                            })
                         };
                      }).sort((a, b) => {
                         const nameCmp = a.operator_name.localeCompare(b.operator_name);
                         if (nameCmp !== 0) return nameCmp;
                         return a.job_no.localeCompare(b.job_no);
                      });
                   };

                   const dayEntries = getShiftRows('day');
                   const nightEntries = getShiftRows('night');

                   if (dayEntries.length === 0 && nightEntries.length === 0) {
                      return (
                         <div className="py-24 text-center text-slate-400 italic">
                            <div className="flex flex-col items-center gap-2">
                               <Calendar size={40} className="opacity-10 mb-2" />
                               <p className="font-bold text-sm tracking-widest uppercase">No production records found</p>
                               <p className="text-[10px] font-medium opacity-60">There are no tally entries submitted for {formatDate(reportDate)}.</p>
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
