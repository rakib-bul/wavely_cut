import React, { useState, useEffect, useMemo } from "react";
import { CustomDatePicker } from "./common/DatePicker";
import { 
  Save, 
  Send, 
  Trash2, 
  Layers, 
  HelpCircle, 
  Sparkles, 
  Keyboard, 
  AlertCircle, 
  CopyCheck, 
  CheckCircle2, 
  FileText,
  BadgeAlert,
  ClipboardPaste,
  RefreshCw,
  Cpu
} from "lucide-react";
import { Machine, CuttingEntry, Buyer, UserRole, FabricMetricsEntry } from "../types";
import { getCurrentProductionDateAndShift, sortSizes } from "../utils/calculations";

interface DataEntryFormProps {
  machines: Machine[];
  buyers?: Buyer[];
  fabricMetrics?: FabricMetricsEntry[];
  onSubmitEntry: (entry: Omit<CuttingEntry, 'id' | 'created_by' | 'created_at' | 'updated_at'> & { id?: string; status: 'draft' | 'submitted' }) => Promise<{ success: boolean; error?: string }>;
  onWebImport: (entries: any[]) => Promise<{ success: boolean; count?: number; errors?: string[] }>;
  jobNoDigits?: number;
  isPoNumberRequired?: boolean;
  colorTypeMetrics?: any;
}

const PREDEFINED_ITEMS = [
  "T-Shirt Short Sleeve",
  "T-Shirt Long Sleeve",
  "Polo Shirt",
  "Top",
  "Bottom",
  "Top+Bottom",
  "Pant",
  "Jacket",
  "Hoodie",
  "Rumper",
  "Pocket",
  "Contrast Panel",
  "Tank Top"
];

const PREDEFINED_FABRICS = [
  "Singel Jersey",
  "Heavy Jersey",
  "Fleece",
  "Slub Jersey",
  "Mesh",
  "Waffle",
  "Terry",
  "Rib",
  "Ottoman Jersey",
  "Interlock",
  "Viscose",
  "Lycra",
  "PK",
  "RFD/Wash"
];

const SUPERVISORS = [
  "Sohel Rana",
  "Jwel Rana",
  "Nurujamman",
  "Mehedi Hasan",
  "Arif",
  "Rakib",
  "Noyon",
  "Biplob",
  "Mortuza",
  "Nayem",
  "Riazul Islam",
  "Jamil Hossain",
  "Bappy Sorkar",
  "Ashraful",
  "Khorshed",
  "Zahid",
  "Raju Islam"
];

export default function DataEntryForm({ 
  machines, 
  buyers = [], 
  fabricMetrics = [], 
  onSubmitEntry, 
  onWebImport, 
  jobNoDigits = 7, 
  isPoNumberRequired = false, 
  colorTypeMetrics 
}: DataEntryFormProps) {
  // --- Form Tab State ---
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  // --- Single Entry Form State ---
  const { entry_date: defaultDate, shift: defaultShift } = getCurrentProductionDateAndShift();
  const initialFormState = {
    entry_date: defaultDate,
    shift: defaultShift,
    machine_id: machines[0]?.id || "",
    buyer: "",
    job_no: "",
    color: "",
    item: "",
    cut_no: "",
    lay: "",
    ratio: "",
    table_no: "",
    fabric_type: "",
    parts: "",
    fabric_used_kg: "",
    remnant_weight_kg: "",
    booking_consumption: "",
    cutting_scrap_weight_kg: "",
    marker_length_inch: "",
    marker_consumption: "",
    marker_efficiency_percent: "",
    remarks: "",
    po_no: "",
    supervisor_name: "",
    order_qty: "",
    color_type: "Solid",
    sizes: {} as Record<string, number>
  };

  const [formData, setFormData] = useState(initialFormState);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHotkeys, setShowHotkeys] = useState(false);
  const [forceCustomItem, setForceCustomItem] = useState(false);
  const [forceCustomFabric, setForceCustomFabric] = useState(false);
  const [forceCustomBuyer, setForceCustomBuyer] = useState(false);
  const [newSizeName, setNewSizeName] = useState("");

  // Master Fabric Metric Sync States
  const [selectedMasterMetricId, setSelectedMasterMetricId] = useState<string>("");
  const [searchSyncTerm, setSearchSyncTerm] = useState<string>("");
  const [selectedSyncBuyer, setSelectedSyncBuyer] = useState<string>("");

  const handleSelectMasterMetric = (metricId: string) => {
    setSelectedMasterMetricId(metricId);
    if (!metricId) {
      setFormData(initialFormState);
      return;
    }

    const matched = fabricMetrics.find(m => m.id === metricId);
    if (matched) {
      // Initialize sizes with 0 for all keys defined in the master booking
      const initialSizes: Record<string, number> = {};
      if (matched.size_bookings) {
        Object.keys(matched.size_bookings).forEach(k => {
          initialSizes[k] = 0;
        });
      }

      setFormData(prev => ({
        ...prev,
        buyer: matched.buyer || "",
        job_no: matched.job_no || "",
        color: matched.color || "",
        item: matched.item || "",
        fabric_type: matched.fabric_type || "",
        po_no: matched.po_no || "",
        booking_consumption: matched.gross_consumption ? matched.gross_consumption.toString() : "",
        order_qty: matched.po_order_qty ? matched.po_order_qty.toString() : "",
        sizes: initialSizes
      }));
      // Reset force custom indicators if matched is predefined
      if (matched.item && PREDEFINED_ITEMS.includes(matched.item)) {
        setForceCustomItem(false);
      } else {
        setForceCustomItem(true);
      }
      if (matched.fabric_type && PREDEFINED_FABRICS.includes(matched.fabric_type)) {
        setForceCustomFabric(false);
      } else {
        setForceCustomFabric(true);
      }
      if (matched.buyer && buyers.some(b => b.name.toUpperCase() === matched.buyer.toUpperCase())) {
        setForceCustomBuyer(false);
      } else {
        setForceCustomBuyer(true);
      }
    }
  };

  const filteredSyncMetrics = useMemo(() => {
    return fabricMetrics.filter(m => {
      const matchBuyer = selectedSyncBuyer ? m.buyer === selectedSyncBuyer : true;
      const matchTerm = searchSyncTerm ? (
        m.job_no?.toLowerCase().includes(searchSyncTerm.toLowerCase()) ||
        m.po_no?.toLowerCase().includes(searchSyncTerm.toLowerCase()) ||
        m.color?.toLowerCase().includes(searchSyncTerm.toLowerCase()) ||
        m.item?.toLowerCase().includes(searchSyncTerm.toLowerCase())
      ) : true;
      return matchBuyer && matchTerm;
    });
  }, [fabricMetrics, selectedSyncBuyer, searchSyncTerm]);

  const jobSuggestions = useMemo(() => {
    if (!formData.buyer) return [];
    return fabricMetrics.filter(m => {
      const matchBuyer = m.buyer?.toUpperCase() === formData.buyer.toUpperCase();
      const matchJob = formData.job_no 
        ? m.job_no?.toLowerCase().includes(formData.job_no.toLowerCase())
        : true;
      return matchBuyer && matchJob;
    });
  }, [fabricMetrics, formData.buyer, formData.job_no]);

  // --- Autosave Draft State ---
  const [hasDraft, setHasDraft] = useState(false);

  // Load autosaved draft on mount
  useEffect(() => {
    const saved = localStorage.getItem("garments_cutting_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.shift === "Day") parsed.shift = "A";
        else if (parsed.shift === "Night") parsed.shift = "B";
        else if (!["A", "B"].includes(parsed.shift)) parsed.shift = "A";
        setFormData(parsed);
        setHasDraft(true);
        if (parsed.item && !PREDEFINED_ITEMS.includes(parsed.item)) {
          setForceCustomItem(true);
        }
        if (parsed.fabric_type && !PREDEFINED_FABRICS.includes(parsed.fabric_type)) {
          setForceCustomFabric(true);
        }
        if (parsed.buyer && !buyers.some(b => b.name.toUpperCase() === parsed.buyer.toUpperCase())) {
          setForceCustomBuyer(true);
        }
      } catch (e) {
        console.error("Failed to parse autosaved draft", e);
      }
    }
  }, []);

  // Sync draft to localStorage on change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      // Don't save if it is completely blank initial state
      if (formData.buyer || formData.job_no || formData.cut_no) {
        localStorage.setItem("garments_cutting_draft", JSON.stringify(formData));
        setHasDraft(true);
      }
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [formData]);

  // Handle Input Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setValidationError(null);
    setSubmitSuccess(null);
  };

  const handleSizeRatioChange = (size: string, ratioVal: string) => {
    const rVal = parseInt(ratioVal) || 0;
    const nextSizes = {
      ...(formData.sizes || {}),
      [size]: rVal
    };
    if (rVal <= 0) {
      delete nextSizes[size];
    }
    
    const totalRatioSum = Object.values(nextSizes).reduce((sum, curr) => sum + curr, 0);
    
    setFormData(prev => ({
      ...prev,
      sizes: nextSizes,
      ratio: totalRatioSum > 0 ? String(totalRatioSum) : prev.ratio
    }));
  };

  const handleAddCustomSize = () => {
    const sz = newSizeName.trim().toUpperCase();
    if (!sz) return;
    if (formData.sizes && formData.sizes[sz] !== undefined) return;
    
    setFormData(prev => ({
      ...prev,
      sizes: {
        ...(prev.sizes || {}),
        [sz]: 0
      }
    }));
    setNewSizeName("");
  };

  // Keyboard Hotkeys listener (Alt + S, Alt + C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        triggerSubmit('submitted');
      }
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        clearForm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [formData]);

  // Submit trigger action
  const triggerSubmit = async (status: 'draft' | 'submitted') => {
    setValidationError(null);
    setSubmitSuccess(null);

    // Validation (only validate full fields if submitting, allow drafts to be incomplete)
    if (status === 'submitted') {
      if (!formData.buyer.trim()) return setValidationError("Buyer Name is required.");
      if (!formData.job_no.trim()) return setValidationError("Job Order No is required.");
      
      const jobNoStr = formData.job_no.trim();
      const digitsPattern = new RegExp(`^\\d{${jobNoDigits}}$`);
      if (!digitsPattern.test(jobNoStr)) {
        return setValidationError(`Job Order No must be exactly ${jobNoDigits} digits (numbers only).`);
      }

      if (!formData.cut_no.trim()) return setValidationError("Cutting Number (Cut No) is required.");
      if (isPoNumberRequired && !formData.po_no.trim()) return setValidationError("PO Number is required.");
      if (!formData.color.trim()) return setValidationError("Fabric Color is required.");
      if (!formData.item.trim()) return setValidationError("Garment Item name is required.");
      if (!formData.machine_id) return setValidationError("Please assign a Cutting Machine.");
      
      const layNum = Number(formData.lay);
      if (!layNum || layNum <= 0) return setValidationError("Lay Layers count must be a positive integer.");
      
      const ratioNum = Number(formData.ratio);
      if (!ratioNum || ratioNum <= 0) return setValidationError("Size Marker Ratio must be a positive integer.");

      const fabricUsed = Number(formData.fabric_used_kg);
      if (isNaN(fabricUsed) || fabricUsed < 0) return setValidationError("Fabric Used (KG) must be a positive decimal number.");

      const markerEff = Number(formData.marker_efficiency_percent);
      if (!markerEff || markerEff <= 0 || markerEff > 100) return setValidationError("Marker Efficiency must be between 1% and 100%.");

      // --- COLOR-TYPE WISE METRICS VALIDATION ---
      const orderQtyVal = Number(formData.order_qty);
      if (formData.order_qty && !isNaN(orderQtyVal) && orderQtyVal > 0) {
        const colorType = formData.color_type || "Solid";
        const selectedBuyer = (formData.buyer || "").trim().toUpperCase();
        const actualCutQty = layNum * ratioNum;
        
        const metrics = colorTypeMetrics || {
          "Solid": { "above_10000": 3.0, "between_5001_9999": 4.0, "between_2001_5000": 5.0, "between_1000_2000": 6.0, "below_1000": 8.0 },
          "RFD Wash": { "above_10000": 8.0, "between_5001_9999": 10.0, "between_2001_5000": 12.0, "between_1000_2000": 14.0, "below_1000": 17.0 },
          "RFD Wash(Print/Embordery)": { "above_10000": 9.5, "between_5001_9999": 11.5, "between_2001_5000": 13.8, "between_1000_2000": 18.0, "below_1000": 19.5 },
          "Print/Embordery Send": { "above_10000": 9.5, "between_5001_9999": 11.5, "between_2001_5000": 13.8, "between_1000_2000": 18.0, "below_1000": 19.5 },
          "Print & Embordery Send": { "above_10000": 9.5, "between_5001_9999": 11.5, "between_2001_5000": 13.8, "between_1000_2000": 18.0, "below_1000": 19.5 }
        };

        const typeConfig = metrics[colorType];
        let typeRules = null;

        if (typeConfig) {
          if (typeConfig.default !== undefined || typeConfig.buyers !== undefined) {
            const buyersMap = typeConfig.buyers || {};
            const matchingBuyerKey = Object.keys(buyersMap).find(
              k => k.trim().toUpperCase() === selectedBuyer
            );
            if (matchingBuyerKey) {
              typeRules = buyersMap[matchingBuyerKey];
            } else {
              typeRules = typeConfig.default;
            }
          } else {
            typeRules = typeConfig;
          }
        }

        if (typeRules) {
          let percentage = 0;
          if (orderQtyVal >= 10000) {
            percentage = Number(typeRules.above_10000);
          } else if (orderQtyVal >= 5001) {
            percentage = Number(typeRules.between_5001_9999);
          } else if (orderQtyVal >= 2001) {
            percentage = Number(typeRules.between_2001_5000);
          } else if (orderQtyVal >= 1000) {
            percentage = Number(typeRules.between_1000_2000);
          } else {
            percentage = Number(typeRules.below_1000);
          }

          const allowedAllowance = orderQtyVal * (percentage / 100);
          const maxAllowedCutQty = orderQtyVal + allowedAllowance;

          if (actualCutQty > maxAllowedCutQty) {
            return setValidationError(
              `Validation Error: Actual Cut Qty (${actualCutQty.toLocaleString()} pcs) exceeds the maximum allowed quantity (${maxAllowedCutQty.toLocaleString()} pcs) for ${colorType} color type. Allowed allowance is ${percentage}% (${allowedAllowance.toLocaleString()} pcs) for order quantity of ${orderQtyVal.toLocaleString()} pcs.`
            );
          }
        }
      }
    } else {
      // For draft mode, at least some identifier is good
      if (!formData.buyer.trim() && !formData.job_no.trim() && !formData.cut_no.trim()) {
        return setValidationError("Please provide at least a Buyer, Job No, or Cut No to save a draft.");
      }
    }

    setIsSubmitting(true);
    try {
      const formattedData = {
        entry_date: formData.entry_date,
        shift: formData.shift,
        machine_id: formData.machine_id || machines[0]?.id || "",
        buyer: formData.buyer.toUpperCase().trim(),
        job_no: formData.job_no.toUpperCase().trim(),
        color: formData.color.trim(),
        po_no: formData.po_no ? formData.po_no.trim() : "",
        item: formData.item.trim(),
        cut_no: formData.cut_no.toUpperCase().trim(),
        lay: Number(formData.lay) || 1,
        ratio: Number(formData.ratio) || 1,
        table_no: formData.table_no.trim() || '1',
        fabric_type: formData.fabric_type.trim() || 'Knit Fabric',
        parts: formData.parts.trim() || 'Body',
        fabric_used_kg: Number(formData.fabric_used_kg) || 0,
        remnant_weight_kg: Number(formData.remnant_weight_kg) || 0,
        booking_consumption: formData.booking_consumption !== "" ? Number(formData.booking_consumption) : undefined,
        cutting_consumption: (Number(formData.lay) * Number(formData.ratio)) > 0 ? (Number(formData.fabric_used_kg) / (Number(formData.lay) * Number(formData.ratio))) * 12 : 0,
        cutting_scrap_weight_kg: Number(formData.cutting_scrap_weight_kg) || 0,
        marker_length_inch: Number(formData.marker_length_inch) || 1,
        marker_consumption: formData.marker_consumption !== "" ? Number(formData.marker_consumption) : undefined,
        marker_efficiency_percent: Number(formData.marker_efficiency_percent) || 80,
        remarks: formData.remarks.trim(),
        supervisor_name: formData.supervisor_name || undefined,
        order_qty: formData.order_qty !== "" ? Number(formData.order_qty) : undefined,
        color_type: formData.color_type || "Solid",
        fabric_metric_id: selectedMasterMetricId || undefined,
        sizes: formData.sizes || {},
        status
      };

      const res = await onSubmitEntry(formattedData);
      if (res.success) {
        setSubmitSuccess(`Cutting record Cut #${formattedData.cut_no} saved successfully as ${status.toUpperCase()}!`);
        // Clear autosave draft
        localStorage.removeItem("garments_cutting_draft");
        setHasDraft(false);
        // Reset form variables
        setFormData({
          ...initialFormState,
          entry_date: formData.entry_date,
          shift: formData.shift,
          machine_id: formData.machine_id
        });
        setForceCustomItem(false);
        setForceCustomFabric(false);
      } else {
        setValidationError(res.error || "An database submission error occurred.");
      }
    } catch (err: any) {
      setValidationError(err.message || "Network submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearForm = () => {
    setFormData(initialFormState);
    localStorage.removeItem("garments_cutting_draft");
    setHasDraft(false);
    setValidationError(null);
    setSubmitSuccess(null);
    setForceCustomItem(false);
    setForceCustomFabric(false);
  };

  const loadLastDraft = () => {
    const saved = localStorage.getItem("garments_cutting_draft");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.shift === "Day") parsed.shift = "A";
      else if (parsed.shift === "Night") parsed.shift = "B";
      else if (!["A", "B"].includes(parsed.shift)) parsed.shift = "A";
      setFormData(parsed);
      setValidationError(null);
      setSubmitSuccess("Restored your autosaved cutting form parameters.");
      if (parsed.item && !PREDEFINED_ITEMS.includes(parsed.item)) {
        setForceCustomItem(true);
      } else {
        setForceCustomItem(false);
      }
      if (parsed.fabric_type && !PREDEFINED_FABRICS.includes(parsed.fabric_type)) {
        setForceCustomFabric(true);
      } else {
        setForceCustomFabric(false);
      }
    }
  };

  // --- Bulk Entry State ---
  const [bulkText, setBulkText] = useState("");
  const [bulkStatus, setBulkStatus] = useState<{ success?: number; errors?: string[] } | null>(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const handleBulkSubmit = async () => {
    setBulkStatus(null);
    if (!bulkText.trim()) {
      alert("Please paste data in the bulk textbox first.");
      return;
    }

    setIsBulkSubmitting(true);
    try {
      // Support simple TSV or CSV pasting or JSON array!
      let rows: any[] = [];
      const trimmed = bulkText.trim();
      
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        // Handle JSON Array paste
        rows = JSON.parse(trimmed);
      } else {
        // Handle Tab-Delimited (copied from Excel!) or CSV rows
        const lines = trimmed.split("\n");
        const header = lines[0].toLowerCase().split(/[,\t]/).map(h => h.trim());
        
        // Let's parse default CSV-like columns
        // Standard expected column order:
        // entry_date | shift | machine_name | buyer | job_no | color | item | cut_no | lay | ratio | fabric_type | fabric_used_kg | marker_length_inch | marker_efficiency_percent
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(/[,\t]/).map(v => v.trim());
          const item: any = {};
          
          header.forEach((col, index) => {
            const val = values[index];
            if (val !== undefined) {
              item[col] = val;
            }
          });

          // Match machine_name with machine_id
          let matchedMachine = machines[0]?.id;
          if (item.machine_name) {
            const m = machines.find(mac => mac.machine_name.toLowerCase().includes(item.machine_name.toLowerCase()));
            if (m) matchedMachine = m.id;
          }
          item.machine_id = item.machine_id || matchedMachine;

          rows.push(item);
        }
      }

      if (rows.length === 0) {
        throw new Error("No parsable cutting rows found. Confirm headers and spacing.");
      }

      const res = await onWebImport(rows);
      setBulkStatus({
        success: res.count,
        errors: res.errors
      });
      if (res.success) {
        setBulkText("");
      }
    } catch (err: any) {
      setBulkStatus({
        errors: [err.message || "Bulk parse failure. Ensure correct Excel pasting."]
      });
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const loadBulkSample = () => {
    // Sample CSV that operators can paste
    const sample = `entry_date,shift,buyer,job_no,color,item,cut_no,lay,ratio,fabric_type,fabric_used_kg,marker_length_inch,marker_efficiency_percent,table_no,parts
2026-06-23,A,ZARA CO.,JB-2026-9049,Red,T-Shirt,CUT-120,120,6,Knit Jersey,410.5,185.0,85.5,TBL-04,Body+Sleeves
2026-06-23,B,GAP GLOBAL,JB-2026-3021,Denim Blue,Denim Jeans,CUT-012,150,4,Cotton Denim,620.0,310.0,82.0,TBL-01,Panels+Pockets`;
    setBulkText(sample);
    setBulkStatus(null);
  };

  return (
    <div className="font-sans">
      
      {/* Header and Mode switch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-2 border-b border-slate-200 dark:border-slate-800 gap-4" id="data-entry-header">
        <div>
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <ClipboardPaste size={18} className="text-slate-600" /> Wavely Cut Floor Logs
          </h2>
        </div>

        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 self-stretch sm:self-auto font-sans">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all duration-150 cursor-pointer ${
              activeTab === 'single' 
                ? 'border-[#2563EB] text-[#2563EB]' 
                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Manual Form
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all duration-150 cursor-pointer ${
              activeTab === 'bulk' 
                ? 'border-[#2563EB] text-[#2563EB]' 
                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Bulk Excel Paste-In
          </button>
        </div>
      </div>

      {/* SINGLE ENTRY TAB */}
      {activeTab === 'single' ? (
        <div className="space-y-6">
          
          {/* Status / Error Alert elements */}
          {validationError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-3.5 rounded-lg text-xs flex items-center gap-2">
              <BadgeAlert size={15} />
              <span>{validationError}</span>
            </div>
          )}

          {submitSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>{submitSuccess}</span>
            </div>
          )}

          {/* Hotkey Guide Indicator */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg text-[11px] text-slate-800 font-medium">
            <span className="flex items-center gap-2">
              <Keyboard size={13} className="text-slate-500" /> Operators Speed Mode: Use <kbd className="bg-white/80 px-1 py-0.5 rounded border border-slate-200 text-[10px] font-mono font-bold">Alt+S</kbd> to submit
            </span>
            <button 
              onClick={() => setShowHotkeys(!showHotkeys)}
              className="text-slate-700 hover:underline cursor-pointer font-semibold"
            >
              {showHotkeys ? "Hide keys" : "Show keys / hotkeys"}
            </button>
          </div>

          {showHotkeys && (
            <div className="bg-white border border-slate-200 p-3.5 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-500">
              <div><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono font-bold">Alt + S</kbd> : Submit for Approval</div>
              <div><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono font-bold">Alt + C</kbd> : Clean Form Fields</div>
            </div>
          )}

          {/* Form Grid Sections - Sequential Series as Requested */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
            
            {/* Context Header with Title and Date/Shift/Machine on extreme top-right */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-5 border-b border-slate-150 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
                  Cutting Record Parameters
                </h3>
                <p className="text-[11px] text-slate-400">
                  Fill in cutting measurements sequentially in numerical order
                </p>
              </div>
              
              {/* Context Block: Date, Shift, Machine */}
              <div className="flex flex-wrap items-center gap-4 self-start lg:self-auto font-sans">
                <div className="w-40">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Date</label>
                  <CustomDatePicker 
                    selectedDate={formData.entry_date} 
                    onChange={date => setFormData({ ...formData, entry_date: date })}
                  />
                </div>
                <div className="w-36">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Shift</label>
                  <select
                    name="shift"
                    value={formData.shift}
                    onChange={handleInputChange}
                    className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs"
                  >
                    <option value="A">Day Shift</option>
                    <option value="B">Night Shift</option>
                  </select>
                </div>
                <div className="w-44">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Machine</label>
                  <select
                    name="machine_id"
                    value={formData.machine_id}
                    onChange={handleInputChange}
                    className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs"
                  >
                    <option value="">-- Choose Machine --</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>{m.machine_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Master Fabric Spec Synchronization Drawer */}
            <div className="border border-indigo-150 dark:border-slate-800 p-4 rounded-xl bg-indigo-50/25 dark:bg-slate-900/10 space-y-3 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-100/40 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-500" /> Sync with Fabric Metrics Master
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Search and select a pre-defined Fabric Metric to auto-populate Buyer, Job, Color, Item, PO, and Consumption.</p>
                </div>
                {selectedMasterMetricId && (
                  <button
                    type="button"
                    onClick={() => handleSelectMasterMetric("")}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 text-[10px] rounded font-semibold border border-rose-200/50 transition cursor-pointer"
                  >
                    Disconnect Master
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Filter by Buyer</label>
                  <select
                    value={selectedSyncBuyer}
                    onChange={(e) => setSelectedSyncBuyer(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-250 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold"
                  >
                    <option value="">-- All Buyers --</option>
                    {buyers.map(b => (
                      <option key={b.id || b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Search Job, PO, Color, Item</label>
                  <input
                    type="text"
                    placeholder="e.g. JB-10293..."
                    value={searchSyncTerm}
                    onChange={(e) => setSearchSyncTerm(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-250 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Specs Scroller */}
              <div className="space-y-2">
                <label className="block text-[9px] font-bold text-slate-400 uppercase">Available Pre-defined Master Specs ({filteredSyncMetrics.length})</label>
                {filteredSyncMetrics.length === 0 ? (
                  <div className="p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center text-[11px] text-slate-400">
                    No matching fabric metric entries found. Create them in the Fabric Specifications panel first.
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto border border-slate-250 dark:border-slate-800 rounded-lg divide-y divide-slate-150 dark:divide-slate-850 bg-white dark:bg-slate-950">
                    {filteredSyncMetrics.map((metric) => {
                      const isSelected = selectedMasterMetricId === metric.id;
                      return (
                        <button
                          key={metric.id}
                          type="button"
                          onClick={() => handleSelectMasterMetric(metric.id)}
                          className={`w-full text-left p-2.5 flex items-center justify-between text-xs transition duration-150 cursor-pointer ${
                            isSelected 
                              ? "bg-indigo-50/70 dark:bg-slate-800/60 font-medium text-indigo-700 dark:text-indigo-400 border-l-2 border-indigo-600" 
                              : "hover:bg-slate-50/50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div>
                            <div className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                              <span>Job: {metric.job_no}</span>
                              <span className="text-[10px] text-slate-400 font-normal">• Buyer: {metric.buyer}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {metric.item} | {metric.color} | PO: {metric.po_no}
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <span className="text-[10px] bg-indigo-100/50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                              Cons: {metric.gross_consumption} kg/dz
                            </span>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Display details of active master spec */}
              {selectedMasterMetricId && (() => {
                const activeSpec = fabricMetrics.find(m => m.id === selectedMasterMetricId);
                if (!activeSpec) return null;
                return (
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="block text-[9px] uppercase text-slate-400 font-bold">Booking Weight</span>
                      <strong className="text-slate-900 dark:text-white">{activeSpec.booking_kg || "-"} kg</strong>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase text-slate-400 font-bold">Booking GSM / DIA</span>
                      <strong className="text-slate-900 dark:text-white">{activeSpec.booking_gsm || "-"} / {activeSpec.booking_dia ? `${activeSpec.booking_dia}"` : "-"}</strong>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase text-slate-400 font-bold">Rib Fabric</span>
                      <strong className="text-slate-900 dark:text-white">{activeSpec.rib_fabric_type || "None"}</strong>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase text-slate-400 font-bold">Gross Cons / Order Qty</span>
                      <strong className="text-slate-900 dark:text-white">{activeSpec.gross_consumption || "-"} kg/dz ({activeSpec.po_order_qty || 0} pcs)</strong>
                    </div>

                    {activeSpec.size_bookings && Object.keys(activeSpec.size_bookings).length > 0 && (
                      <div className="col-span-2 sm:col-span-4 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="block text-[9px] uppercase text-slate-400 font-bold mb-1">Pre-defined Size-Wise Booking Quantity Breakdown</span>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(activeSpec.size_bookings).map(([sz, wk]) => (
                            <span key={sz} className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-[10px] px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                              {sz}: <strong className="text-slate-900 dark:text-white font-mono">{wk} pcs</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Serial input grids organized in order */}
            {/* Serial input grids organized in order */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 font-sans text-slate-700 dark:text-slate-200">
              
              {/* 1. Buyer */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Buyer</label>
                <div className="space-y-2">
                  <select
                    name="buyer_select"
                    value={formData.buyer ? (buyers.some(b => b.name.toUpperCase() === formData.buyer.toUpperCase()) ? formData.buyer : "custom") : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "custom") {
                        setFormData(prev => ({ ...prev, buyer: "" }));
                        setForceCustomBuyer(true);
                        setSelectedSyncBuyer("");
                      } else {
                        setFormData(prev => ({ ...prev, buyer: val }));
                        setForceCustomBuyer(false);
                        setSelectedSyncBuyer(val);
                      }
                    }}
                    className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs"
                  >
                    <option value="">-- Choose Buyer --</option>
                    {buyers.map(b => (
                      <option key={b.id || b.name} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                    <option value="custom">Custom / Other</option>
                  </select>

                  {(forceCustomBuyer || (formData.buyer !== "" && !buyers.some(b => b.name.toUpperCase() === formData.buyer.toUpperCase()))) && (
                    <input
                      type="text"
                      name="buyer"
                      placeholder="Type custom buyer partner"
                      value={formData.buyer}
                      onChange={(e) => {
                        handleInputChange(e);
                        setSelectedSyncBuyer(e.target.value);
                      }}
                      className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs animate-fade-in"
                    />
                  )}
                </div>
              </div>

              {/* 2. Job no */}
              <div className="relative">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Job no</label>
                <input
                  type="text"
                  name="job_no"
                  value={formData.job_no}
                  onChange={handleInputChange}
                  placeholder={`e.g. ${"1234567890".substring(0, jobNoDigits)}`}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Must be exactly {jobNoDigits} numeric digits.</p>

                {/* Inline suggestions based on selected/typed Buyer and Job No */}
                {formData.buyer && !selectedMasterMetricId && jobSuggestions.length > 0 && (
                  <div className="mt-2 p-2 border border-indigo-100 dark:border-slate-800 bg-indigo-50/20 dark:bg-slate-900/20 rounded-lg space-y-1 z-10 relative">
                    <span className="block text-[9px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                      💡 Found Pre-defined Specs for {formData.buyer}:
                    </span>
                    <div className="max-h-28 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800">
                      {jobSuggestions.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectMasterMetric(m.id)}
                          className="w-full text-left p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 text-[10px] text-slate-700 dark:text-slate-300 flex items-center justify-between transition cursor-pointer"
                        >
                          <div className="truncate pr-2">
                            <span className="font-bold text-slate-900 dark:text-white">Job {m.job_no}</span> • {m.color} ({m.item})
                          </div>
                          <span className="font-mono text-[9px] text-indigo-600 dark:text-indigo-400 shrink-0 font-bold">
                            Cons: {m.gross_consumption}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Synced confirmation indicator */}
                {selectedMasterMetricId && (
                  <div className="mt-2 p-2 bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800 rounded-lg flex items-center justify-between text-[10px] z-10 relative animate-fade-in">
                    <span className="text-emerald-800 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Synced with Master Fabric Spec
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectMasterMetric("")}
                      className="text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>

              {/* 3. color */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Color</label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
                />
              </div>

              {/* 3a. PO Number */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">PO Number</label>
                <input
                  type="text"
                  name="po_no"
                  value={formData.po_no}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
                />
              </div>



              {/* 4. item */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Item</label>
                <div className="space-y-2">
                  <select
                    name="item_select"
                    value={formData.item ? (PREDEFINED_ITEMS.includes(formData.item) ? formData.item : "custom") : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "custom") {
                        setFormData(prev => ({ ...prev, item: "" }));
                        setForceCustomItem(true);
                      } else {
                        setFormData(prev => ({ ...prev, item: val }));
                        setForceCustomItem(false);
                      }
                    }}
                    className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs"
                  >
                    <option value="">-- Choose Item --</option>
                    {PREDEFINED_ITEMS.map(it => (
                      <option key={it} value={it}>{it}</option>
                    ))}
                    <option value="custom">Custom / Other</option>
                  </select>

                  {(forceCustomItem || (formData.item !== "" && !PREDEFINED_ITEMS.includes(formData.item))) && (
                    <input
                      type="text"
                      name="item"
                      placeholder="Type custom garment item"
                      value={formData.item}
                      onChange={handleInputChange}
                      className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs animate-fade-in"
                    />
                  )}
                </div>
              </div>

              {/* 5. cut no */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Cut no</label>
                <input
                  type="text"
                  name="cut_no"
                  value={formData.cut_no}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
                />
              </div>

              {/* 6. Lay */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Lay</label>
                <input
                  type="number"
                  name="lay"
                  value={formData.lay}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
                />
              </div>

              {/* 7. Ratio */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Ratio</label>
                <input
                  type="number"
                  name="ratio"
                  value={formData.ratio}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
                />
              </div>

              {/* Size-Wise Marker Ratio Breakdown */}
              <div className="col-span-1 md:col-span-2 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mt-1 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-3 border-b border-slate-200/50 dark:border-slate-800">
                  <div>
                    <span className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">
                      Size-Wise Production Breakdown
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Enter marker ratio per size. Total ratio and production quantities will be computed automatically.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Custom Size"
                      value={newSizeName}
                      onChange={(e) => setNewSizeName(e.target.value)}
                      className="w-20 h-7 text-[10px] px-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSize}
                      className="h-7 px-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-850 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-300 text-[10px] rounded-md font-bold transition cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {(() => {
                  const activeSpec = selectedMasterMetricId
                    ? fabricMetrics.find(m => m.id === selectedMasterMetricId)
                    : null;
                  const activeSpecSizes = activeSpec?.size_bookings ? Object.keys(activeSpec.size_bookings) : [];
                  const defaultSizes = ["S", "M", "L", "XL", "XXL"];
                  
                  const allVisibleSizes = sortSizes(Array.from(new Set([
                    ...Object.keys(formData.sizes || {}),
                    ...(activeSpecSizes.length > 0 ? activeSpecSizes : (Object.keys(formData.sizes || {}).length === 0 ? defaultSizes : []))
                  ])));

                  if (allVisibleSizes.length === 0) {
                    return (
                      <p className="text-[11px] text-slate-400 text-center py-2">
                        No sizes configured. Use the custom size input above to add sizes.
                      </p>
                    );
                  }

                  const layVal = Number(formData.lay) || 0;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {allVisibleSizes.map(sz => {
                        const ratioVal = formData.sizes?.[sz] !== undefined ? formData.sizes[sz] : 0;
                        const computedQty = layVal * ratioVal;

                        return (
                          <div key={sz} className="bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-250 dark:border-slate-800 flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{sz}</span>
                              {computedQty > 0 && (
                                <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1 py-0.2 rounded">
                                  {computedQty} pcs
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-medium">Ratio:</span>
                              <input
                                type="number"
                                min="0"
                                value={ratioVal === 0 ? "" : ratioVal}
                                onChange={(e) => handleSizeRatioChange(sz, e.target.value)}
                                placeholder="0"
                                className="w-full h-7 text-xs text-center border border-slate-250 dark:border-slate-750 rounded bg-slate-50/50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* 8. Table */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Table</label>
                <select
                  name="table_no"
                  value={formData.table_no}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs"
                >
                  <option value="">-- Choose Table --</option>
                  <option value="1">Table 1</option>
                  <option value="2">Table 2</option>
                  <option value="3">Table 3</option>
                  <option value="4">Table 4</option>
                  <option value="5">Table 5</option>
                  <option value="6">Table 6</option>
                  <option value="7">Table 7</option>
                </select>
              </div>

              {/* 9. Fabric type */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Fabric type</label>
                <div className="space-y-2">
                  <select
                    name="fabric_type_select"
                    value={formData.fabric_type ? (PREDEFINED_FABRICS.includes(formData.fabric_type) ? formData.fabric_type : "custom") : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "custom") {
                        setFormData(prev => ({ ...prev, fabric_type: "" }));
                        setForceCustomFabric(true);
                      } else {
                        setFormData(prev => ({ ...prev, fabric_type: val }));
                        setForceCustomFabric(false);
                      }
                    }}
                    className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs"
                  >
                    <option value="">-- Choose Fabric --</option>
                    {PREDEFINED_FABRICS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                    <option value="custom">Custom / Other</option>
                  </select>

                  {(forceCustomFabric || (formData.fabric_type !== "" && !PREDEFINED_FABRICS.includes(formData.fabric_type))) && (
                    <input
                      type="text"
                      name="fabric_type"
                      placeholder="Type custom fabric type"
                      value={formData.fabric_type}
                      onChange={handleInputChange}
                      className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs animate-fade-in"
                    />
                  )}
                </div>
              </div>

              {/* 10. Parts(qty) */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Parts(qty)</label>
                <input
                  type="text"
                  name="parts"
                  value={formData.parts}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
                />
              </div>

              {/* 11. Fabric Weight Used (KG) */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Fabric Weight Used (KG)</label>
                <input
                  type="number"
                  step="0.001"
                  name="fabric_used_kg"
                  value={formData.fabric_used_kg}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
                />
              </div>

              {/* 12. Remnants Weight (KG) */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Remnants Weight (KG)</label>
                <input
                  type="text"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
                />
              </div>

              {/* 13. Cutting Scrap (KG) */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Cutting Scrap (KG)</label>
                <input
                  type="number"
                  step="0.001"
                  name="cutting_scrap_weight_kg"
                  value={formData.cutting_scrap_weight_kg}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
                />
              </div>

              {/* Marker Length Inch */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Marker Length Inch</label>
                <input
                  type="number"
                  step="0.01"
                  name="marker_length_inch"
                  value={formData.marker_length_inch}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
                />
              </div>
              
              {/* 15. Marker Efficiency % */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Marker Efficiency %</label>
                <input
                  type="number"
                  step="0.1"
                  name="marker_efficiency_percent"
                  value={formData.marker_efficiency_percent}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
                />
              </div>

              {/* 16. Spreading Scrap (KG) */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Spreading Scrap (KG)</label>
                <input
                  type="number"
                  step="0.001"
                  name="remnant_weight_kg"
                  value={formData.remnant_weight_kg}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
                />
              </div>

              {/* 16a. Booking Consumption */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Booking Consumption</label>
                <input
                  type="number"
                  step="0.001"
                  name="booking_consumption"
                  value={formData.booking_consumption}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
                />
              </div>

              {/* Marker Consumption */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Marker Consumption</label>
                <input
                  type="number"
                  step="0.001"
                  name="marker_consumption"
                  value={formData.marker_consumption}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-xs"
                />
              </div>

              {/* 16c. Supervisor Name */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Supervisor Name</label>
                <select
                  name="supervisor_name"
                  value={formData.supervisor_name}
                  onChange={handleInputChange}
                  className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs"
                >
                  <option value="">-- Choose Supervisor --</option>
                  {SUPERVISORS.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Real-time Math Estimations */}
            <div className="bg-slate-100/50 border border-slate-200 p-4 rounded-xl space-y-2 mt-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles size={11} /> Real-time CAD metrics projection
              </span>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 pt-1 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold font-sans">Total Cut Qty:</span>
                  <span className="font-mono font-bold text-indigo-600">
                    {formData.lay && formData.ratio ? (Number(formData.lay) * Number(formData.ratio)).toLocaleString() : "0"} pcs
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold font-sans">Total Marker Length (inch):</span>
                  <span className="font-mono font-bold text-indigo-600">
                    {formData.lay && formData.marker_length_inch ? (Number(formData.lay) * Number(formData.marker_length_inch)).toFixed(1) : "0.0"} Inches
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold font-sans">Total Fabric Used (inch):</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {formData.lay && formData.marker_length_inch && formData.marker_efficiency_percent ? (Number(formData.lay) * Number(formData.marker_length_inch) * Number(formData.marker_efficiency_percent) / 100).toFixed(1) : "0.0"} Inches
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold font-sans">Scrap% per Marker:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {formData.marker_efficiency_percent ? (100 - Number(formData.marker_efficiency_percent)).toFixed(1) : "0.0"}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold font-sans">% of Cutting Scrap:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {formData.cutting_scrap_weight_kg && formData.fabric_used_kg && Number(formData.fabric_used_kg) > 0 ? ((Number(formData.cutting_scrap_weight_kg) / Number(formData.fabric_used_kg)) * 100).toFixed(2) : "0.00"}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions bar */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-5 text-xs">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={clearForm}
                className="px-4 py-2 text-slate-400 hover:text-rose-600 font-medium cursor-pointer transition-colors font-sans"
              >
                Clear Fields
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => triggerSubmit('submitted')}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl transition-all font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md font-sans"
              >
                <Send size={14} className="stroke-[2.5]" /> Commit & Submit Cut Entry
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* BULK ENTRY TAB */
        <div className="space-y-4">
          
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-2 leading-relaxed">
            <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[10px] font-sans">Excel Copier Instructions</h4>
            <p className="text-slate-500 font-sans">
              Copy rows from an Excel production plan, or prepare comma-separated rows keeping the headers below. Perfect for data entry operators compiling daily registers at the end of shifts.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button 
                onClick={loadBulkSample}
                className="text-slate-700 hover:underline font-semibold font-sans"
              >
                Load Sample TSV/CSV Rows
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Pasted Raw Text Rows</label>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="entry_date,shift,buyer,job_no,color,item,cut_no,lay,ratio,fabric_type,fabric_used_kg,marker_length_inch,marker_efficiency_percent,table_no,parts..."
              rows={10}
              className="w-full bg-slate-50 text-slate-700 font-mono text-xs border border-slate-200 rounded-lg p-4 focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none"
            />
          </div>

          {bulkStatus && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-2">
              {bulkStatus.success !== undefined && bulkStatus.success > 0 && (
                <div className="text-emerald-600 font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Successfully bulk imported {bulkStatus.success} new cutting entries into ledger!
                </div>
              )}
              {bulkStatus.errors && bulkStatus.errors.length > 0 && (
                <div className="space-y-1">
                  <span className="text-rose-600 font-medium flex items-center gap-1.5">
                    <BadgeAlert size={14} /> Skipped or erroneous rows:
                  </span>
                  <ul className="list-disc pl-5 text-slate-500 space-y-0.5 text-[11px]">
                    {bulkStatus.errors.map((e, idx) => <li key={idx}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleBulkSubmit}
              disabled={isBulkSubmitting || !bulkText.trim()}
              className="px-6 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md font-sans"
            >
              <ClipboardPaste size={14} className="stroke-[2.5]" /> Run Bulk Integrity Checks & Save
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
