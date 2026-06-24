import React, { useState, useEffect } from "react";
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
import { Machine, CuttingEntry, Buyer, UserRole } from "../types";

interface DataEntryFormProps {
  machines: Machine[];
  buyers?: Buyer[];
  onSubmitEntry: (entry: Omit<CuttingEntry, 'id' | 'created_by' | 'created_at' | 'updated_at'> & { id?: string; status: 'draft' | 'submitted' }) => Promise<{ success: boolean; error?: string }>;
  onWebImport: (entries: any[]) => Promise<{ success: boolean; count?: number; errors?: string[] }>;
}

export default function DataEntryForm({ machines, buyers = [], onSubmitEntry, onWebImport }: DataEntryFormProps) {
  // --- Form Tab State ---
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  // --- Single Entry Form State ---
  const initialFormState = {
    entry_date: new Date().toISOString().substring(0, 10),
    shift: "A",
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
    cutting_scrap_weight_kg: "",
    marker_length_inch: "",
    marker_efficiency_percent: "",
    remarks: ""
  };

  const [formData, setFormData] = useState(initialFormState);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHotkeys, setShowHotkeys] = useState(false);

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

  // Keyboard Hotkeys listener (Alt + S, Alt + D, Alt + C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        triggerSubmit('submitted');
      }
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        triggerSubmit('draft');
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
      if (!formData.cut_no.trim()) return setValidationError("Cutting Number (Cut No) is required.");
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
        item: formData.item.trim(),
        cut_no: formData.cut_no.toUpperCase().trim(),
        lay: Number(formData.lay) || 1,
        ratio: Number(formData.ratio) || 1,
        table_no: formData.table_no.trim() || 'TBL-1',
        fabric_type: formData.fabric_type.trim() || 'Knit Fabric',
        parts: formData.parts.trim() || 'Body',
        fabric_used_kg: Number(formData.fabric_used_kg) || 0,
        remnant_weight_kg: Number(formData.remnant_weight_kg) || 0,
        cutting_scrap_weight_kg: Number(formData.cutting_scrap_weight_kg) || 0,
        marker_length_inch: Number(formData.marker_length_inch) || 1,
        marker_efficiency_percent: Number(formData.marker_efficiency_percent) || 80,
        remarks: formData.remarks.trim(),
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
          <p className="text-xs text-slate-500 mt-1">Replacing paper cards and Excel sheets with validated database entry.</p>
        </div>

        <div className="flex gap-1 border-b border-slate-200 self-stretch sm:self-auto">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition duration-150 ${
              activeTab === 'single' 
                ? 'border-slate-800 text-slate-900' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Manual Form
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition duration-150 ${
              activeTab === 'bulk' 
                ? 'border-slate-800 text-slate-900' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
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
              <Keyboard size={13} className="text-slate-500" /> Operators Speed Mode: Use <kbd className="bg-white/80 px-1 py-0.5 rounded border border-slate-200 text-[10px] font-mono font-bold">Alt+S</kbd> to submit, <kbd className="bg-white/80 px-1 py-0.5 rounded border border-slate-200 text-[10px] font-mono font-bold">Alt+D</kbd> for drafts
            </span>
            <button 
              onClick={() => setShowHotkeys(!showHotkeys)}
              className="text-slate-700 hover:underline cursor-pointer font-semibold"
            >
              {showHotkeys ? "Hide keys" : "Show keys / hotkeys"}
            </button>
          </div>

          {showHotkeys && (
            <div className="bg-white border border-slate-200 p-3.5 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-500">
              <div><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono font-bold">Alt + S</kbd> : Submit for Approval</div>
              <div><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono font-bold">Alt + D</kbd> : Save to Local Draft Pool</div>
              <div><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono font-bold">Alt + C</kbd> : Clean Form Fields</div>
            </div>
          )}

          {/* Form Grid Sections - Sequential Series as Requested */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            
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
              <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
                <div className="w-36">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Date</label>
                  <input
                    type="date"
                    name="entry_date"
                    value={formData.entry_date}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-905 focus:outline-none transition-all text-slate-850"
                  />
                </div>
                <div className="w-32">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Shift</label>
                  <select
                    name="shift"
                    value={formData.shift}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-905 focus:outline-none transition-all text-slate-850 cursor-pointer"
                  >
                    <option value="A">Day Shift</option>
                    <option value="B">Night Shift</option>
                  </select>
                </div>
                <div className="w-40">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Machine</label>
                  <select
                    name="machine_id"
                    value={formData.machine_id}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-905 focus:outline-none transition-all text-slate-850 cursor-pointer"
                  >
                    <option value="">-- Choose Machine --</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>{m.machine_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Serial input grids organized in order */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              
              {/* 1. Buyer */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Buyer</label>
                <select
                  name="buyer"
                  value={formData.buyer}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium cursor-pointer"
                >
                  <option value="">-- Choose Buyer --</option>
                  {buyers.map(b => (
                    <option key={b.id || b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Job no */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Job no</label>
                <input
                  type="text"
                  name="job_no"
                  value={formData.job_no}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium"
                />
              </div>

              {/* 3. color */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Color</label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium"
                />
              </div>

              {/* 4. item */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Item</label>
                <input
                  type="text"
                  name="item"
                  value={formData.item}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium"
                />
              </div>

              {/* 5. cut no */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Cut no</label>
                <input
                  type="text"
                  name="cut_no"
                  value={formData.cut_no}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium"
                />
              </div>

              {/* 6. Lay */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Lay</label>
                <input
                  type="number"
                  name="lay"
                  value={formData.lay}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium"
                />
              </div>

              {/* 7. Ratio */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Ratio</label>
                <input
                  type="number"
                  name="ratio"
                  value={formData.ratio}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium"
                />
              </div>

              {/* 8. Table */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Table</label>
                <input
                  type="text"
                  name="table_no"
                  value={formData.table_no}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium"
                />
              </div>

              {/* 9. Fabric type */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Fabric type</label>
                <input
                  type="text"
                  name="fabric_type"
                  value={formData.fabric_type}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium"
                />
              </div>

              {/* 10. Parts(qty) */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Parts(qty)</label>
                <input
                  type="text"
                  name="parts"
                  value={formData.parts}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium"
                />
              </div>

              {/* 11. Fabric used kg */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Fabric used kg</label>
                <input
                  type="number"
                  step="0.001"
                  name="fabric_used_kg"
                  value={formData.fabric_used_kg}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium"
                />
              </div>

              {/* 12. Remenant */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Remenant (Remarks & Notes)</label>
                <input
                  type="text"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium"
                />
              </div>

              {/* 13. Weght or scrap */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Weght or scrap (KG)</label>
                <input
                  type="number"
                  step="0.001"
                  name="cutting_scrap_weight_kg"
                  value={formData.cutting_scrap_weight_kg}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium"
                />
              </div>

              {/* 14. market length */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Market length (Inches)</label>
                <input
                  type="number"
                  name="marker_length_inch"
                  value={formData.marker_length_inch}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium"
                />
              </div>

              {/* 15. maker efficiency % */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Maker efficiency %</label>
                <input
                  type="number"
                  step="0.1"
                  name="marker_efficiency_percent"
                  value={formData.marker_efficiency_percent}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium"
                />
              </div>

              {/* 16. remnant Kg */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Remnant Kg</label>
                <input
                  type="number"
                  step="0.001"
                  name="remnant_weight_kg"
                  value={formData.remnant_weight_kg}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-none transition-all text-slate-800 font-medium"
                />
              </div>
            </div>

            {/* Real-time Math Estimations */}
            <div className="bg-slate-100/50 border border-slate-200 p-4 rounded-xl space-y-2 mt-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles size={11} /> Real-time CAD metrics projection
              </span>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 pt-1 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold font-sans">Est. Spreading Scrap:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {formData.fabric_used_kg ? (Number(formData.fabric_used_kg) * 0.025).toFixed(2) : "0.00"} KG
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold font-sans">Est. CAD Marker Waste:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {formData.marker_efficiency_percent ? (100 - Number(formData.marker_efficiency_percent)).toFixed(1) : "0.0"}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold font-sans">Total Spanned Fabric Len:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {formData.marker_length_inch && formData.lay ? (Number(formData.marker_length_inch) * Number(formData.lay)).toLocaleString() : "0"} Inches
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
              
              {hasDraft && (
                <button
                  type="button"
                  onClick={loadLastDraft}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/15 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors font-sans"
                >
                  <RefreshCw size={12} className="animate-spin-hover" /> Restore Draft
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => triggerSubmit('draft')}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-sans"
              >
                <Save size={13} className="text-slate-400" /> Save Draft
              </button>
              <button
                type="button"
                onClick={() => triggerSubmit('submitted')}
                disabled={isSubmitting}
                className="px-5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm font-sans"
              >
                <Send size={13} /> Commit & Submit Cut Entry
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
              className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm font-sans"
            >
              <ClipboardPaste size={14} /> Run Bulk Integrity Checks & Save
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
