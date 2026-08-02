import React, { useState, useMemo } from "react";
import { 
  Plus, Search, Download, Trash2, CheckCircle2, AlertTriangle, 
  ChevronDown, ChevronUp, FileSpreadsheet, RefreshCw, Edit, X, Calendar, User, Hash, HelpCircle, Eye, Activity, SlidersHorizontal
} from "lucide-react";
import { FabricMetricsEntry, Buyer, UserRole, Profile } from "../types";
import * as XLSX from "xlsx";
import { sortSizes } from "../utils/calculations";

interface FabricMetricsModuleProps {
  fabricMetrics: FabricMetricsEntry[];
  buyers: Buyer[];
  currentProfile: Profile | null;
  onSubmitEntry: (data: Partial<FabricMetricsEntry>) => Promise<any>;
  onUpdateEntry: (id: string, data: Partial<FabricMetricsEntry>) => Promise<any>;
  onDeleteEntry: (id: string) => Promise<any>;
  onApproveEntry: (id: string, status: "approved" | "rejected") => Promise<any>;
  onRefresh: () => void;
}

const SIZE_GROUPS = {
  "Alpha (XXS-7XL)": ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL"],
  "Baby (New Born-2)": ["New Born", "0000", "000", "00", "0", "1", "2"],
  "Toddler (1T-5T)": ["1T", "2T", "3T", "4T", "5T"],
  "Kids Numeric (1-9)": ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  "Adult Numeric (8-24)": ["8", "9", "10", "12", "14", "16", "18", "20", "22", "24"]
};

export default function FabricMetricsModule({
  fabricMetrics = [],
  buyers = [],
  currentProfile,
  onSubmitEntry,
  onUpdateEntry,
  onDeleteEntry,
  onApproveEntry,
  onRefresh
}: FabricMetricsModuleProps) {
  const userRole = currentProfile?.role || "operator";
  const userEmail = currentProfile?.email || "";

  // Form State
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [activeSizeGroup, setActiveSizeGroup] = useState<string>("Alpha (XXS-7XL)");
  
  const [formData, setFormData] = useState<Partial<FabricMetricsEntry>>({
    entry_date: new Date().toISOString().split("T")[0],
    buyer: "",
    job_no: "",
    color: "",
    item: "",
    fabric_type: "",
    po_no: "",
    po_order_qty: 0,
    booking_kg: 0,
    booking_gsm: 0,
    booking_dia: 0,
    net_consumption: 0,
    gross_consumption: 0,
    rib_fabric_type: "",
    rib_gsm: undefined,
    rib_dia: undefined,
    rib_consumption: undefined,
    has_back_neck_tape: false,
    back_neck_tape_con: undefined,
    back_neck_tape_gsm: undefined,
    back_neck_tape_dia: undefined,
    has_neck_binding: false,
    neck_binding_con: undefined,
    neck_binding_gsm: undefined,
    neck_binding_dia: undefined,
    size_bookings: {},
    status: "draft"
  });

  // UI States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter Logic
  const filteredEntries = useMemo(() => {
    return fabricMetrics.filter(entry => {
      const matchSearch = 
        entry.job_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.color?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.fabric_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.po_no?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchBuyer = selectedBuyer ? entry.buyer === selectedBuyer : true;
      const matchStatus = selectedStatus ? entry.status === selectedStatus : true;
      
      return matchSearch && matchBuyer && matchStatus;
    });
  }, [fabricMetrics, searchTerm, selectedBuyer, selectedStatus]);

  // Handle Form Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        // Reset sub-fields if unchecking
        ...(name === "has_back_neck_tape" && !checked ? {
          back_neck_tape_con: undefined,
          back_neck_tape_gsm: undefined,
          back_neck_tape_dia: undefined
        } : {}),
        ...(name === "has_neck_binding" && !checked ? {
          neck_binding_con: undefined,
          neck_binding_gsm: undefined,
          neck_binding_dia: undefined
        } : {})
      }));
    } else {
      setFormData(prev => {
        const rawVal = value === "" ? "" : (type === "number" ? parseFloat(value) || 0 : value);
        const nextState = {
          ...prev,
          [name]: rawVal
        };
        if (name === "gross_consumption" || name === "po_order_qty") {
          const gross = name === "gross_consumption" ? (parseFloat(value) || 0) : (prev.gross_consumption || 0);
          const pcs = name === "po_order_qty" ? (parseInt(value) || 0) : (prev.po_order_qty || 0);
          if (gross > 0 && pcs > 0) {
            nextState.booking_kg = parseFloat(((pcs * gross) / 12).toFixed(3));
          }
        }
        return nextState;
      });
    }
  };

  const handleSizeBookingChange = (size: string, valStr: string) => {
    const val = parseInt(valStr) || 0;
    const currentBookings = formData.size_bookings || {};
    const updatedBookings = { ...currentBookings };
    
    if (val <= 0) {
      delete updatedBookings[size];
    } else {
      updatedBookings[size] = val;
    }
    
    // Sum up all sizes for total order pcs
    const totalPcs = Object.values(updatedBookings).reduce((sum: number, cur: number) => sum + cur, 0);
    
    // Recalculate booking_kg if gross_consumption is present
    const gross = formData.gross_consumption || 0;
    const computedBookingKg = gross > 0 ? parseFloat(((totalPcs * gross) / 12).toFixed(3)) : formData.booking_kg;
    
    setFormData(prev => ({
      ...prev,
      size_bookings: updatedBookings,
      po_order_qty: totalPcs,
      booking_kg: computedBookingKg > 0 ? computedBookingKg : prev.booking_kg
    }));
  };

  const handleClearSizeBookings = () => {
    setFormData(prev => ({
      ...prev,
      size_bookings: {},
      po_order_qty: 0,
      booking_kg: 0
    }));
  };

  // Submit Logic
  const handleSubmit = async (e: React.FormEvent, submitStatus: "draft" | "submitted" = "draft") => {
    e.preventDefault();
    setFormError("");
    
    if (!formData.entry_date || !formData.buyer || !formData.job_no || !formData.color || !formData.item || !formData.fabric_type || !formData.po_no) {
      setFormError("Please fill out all required core fields (Date, Buyer, Job No, Color, Item, Fabric Type, PO Number).");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        status: submitStatus as any
      };

      if (isEditing) {
        await onUpdateEntry(isEditing, payload);
        setIsEditing(null);
      } else {
        await onSubmitEntry(payload);
      }

      // Reset form
      setFormData({
        entry_date: new Date().toISOString().split("T")[0],
        buyer: "",
        job_no: "",
        color: "",
        item: "",
        fabric_type: "",
        po_no: "",
        po_order_qty: 0,
        booking_kg: 0,
        booking_gsm: 0,
        booking_dia: 0,
        net_consumption: 0,
        gross_consumption: 0,
        rib_fabric_type: "",
        rib_gsm: undefined,
        rib_dia: undefined,
        rib_consumption: undefined,
        has_back_neck_tape: false,
        back_neck_tape_con: undefined,
        back_neck_tape_gsm: undefined,
        back_neck_tape_dia: undefined,
        has_neck_binding: false,
        neck_binding_con: undefined,
        neck_binding_gsm: undefined,
        neck_binding_dia: undefined,
        size_bookings: {},
        status: "draft"
      });
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || "An error occurred while saving the fabric metrics.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set form to edit an existing entry
  const handleEditClick = (entry: FabricMetricsEntry) => {
    setIsEditing(entry.id);
    
    // Auto-select size group based on size_bookings keys
    if (entry.size_bookings && Object.keys(entry.size_bookings).length > 0) {
      const firstSize = Object.keys(entry.size_bookings)[0];
      const matchingGroup = Object.entries(SIZE_GROUPS).find(([groupName, sizes]) => sizes.includes(firstSize));
      if (matchingGroup) {
        setActiveSizeGroup(matchingGroup[0]);
      }
    }

    setFormData({
      entry_date: entry.entry_date,
      buyer: entry.buyer,
      job_no: entry.job_no,
      color: entry.color,
      item: entry.item,
      fabric_type: entry.fabric_type,
      po_no: entry.po_no,
      po_order_qty: entry.po_order_qty,
      booking_kg: entry.booking_kg,
      booking_gsm: entry.booking_gsm,
      booking_dia: entry.booking_dia,
      net_consumption: entry.net_consumption,
      gross_consumption: entry.gross_consumption,
      rib_fabric_type: entry.rib_fabric_type || "",
      rib_gsm: entry.rib_gsm,
      rib_dia: entry.rib_dia,
      rib_consumption: entry.rib_consumption,
      has_back_neck_tape: entry.has_back_neck_tape,
      back_neck_tape_con: entry.back_neck_tape_con,
      back_neck_tape_gsm: entry.back_neck_tape_gsm,
      back_neck_tape_dia: entry.back_neck_tape_dia,
      has_neck_binding: entry.has_neck_binding,
      neck_binding_con: entry.neck_binding_con,
      neck_binding_gsm: entry.neck_binding_gsm,
      neck_binding_dia: entry.neck_binding_dia,
      size_bookings: entry.size_bookings || {},
      status: entry.status
    });
    // Scroll smoothly to form
    const formElement = document.getElementById("fabric-form-container");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setFormData({
      entry_date: new Date().toISOString().split("T")[0],
      buyer: "",
      job_no: "",
      color: "",
      item: "",
      fabric_type: "",
      po_no: "",
      po_order_qty: 0,
      booking_kg: 0,
      booking_gsm: 0,
      booking_dia: 0,
      net_consumption: 0,
      gross_consumption: 0,
      rib_fabric_type: "",
      rib_gsm: undefined,
      rib_dia: undefined,
      rib_consumption: undefined,
      has_back_neck_tape: false,
      back_neck_tape_con: undefined,
      back_neck_tape_gsm: undefined,
      back_neck_tape_dia: undefined,
      has_neck_binding: false,
      neck_binding_con: undefined,
      neck_binding_gsm: undefined,
      neck_binding_dia: undefined,
      size_bookings: {},
      status: "draft"
    });
  };

  // Delete Entry
  const handleDeleteClick = async (id: string) => {
    try {
      await onDeleteEntry(id);
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err) {
      alert("Failed to delete entry: " + err);
    }
  };

  // Approve Entry
  const handleApprove = async (id: string, status: "approved" | "rejected") => {
    try {
      await onApproveEntry(id, status);
      onRefresh();
    } catch (err) {
      alert("Failed to update status: " + err);
    }
  };

  // Export to Excel (Full high contrast format)
  const exportToExcel = () => {
    const dataToExport = filteredEntries.map(entry => ({
      "Date": entry.entry_date,
      "Buyer": entry.buyer,
      "Job No": entry.job_no,
      "Color": entry.color,
      "Item": entry.item,
      "Fabric Type": entry.fabric_type,
      "PO Number": entry.po_no,
      "PO Qty": entry.po_order_qty,
      "Booking (KG)": entry.booking_kg,
      "Booking GSM": entry.booking_gsm,
      "Booking DIA": entry.booking_dia,
      "Net Consumption": entry.net_consumption,
      "Gross Consumption": entry.gross_consumption,
      "Rib Fabric Type": entry.rib_fabric_type || "N/A",
      "Rib GSM": entry.rib_gsm || "N/A",
      "Rib DIA": entry.rib_dia || "N/A",
      "Rib Consumption": entry.rib_consumption || "N/A",
      "Back Neck Tape?": entry.has_back_neck_tape ? "Yes" : "No",
      "Back Neck Tape Con": entry.back_neck_tape_con || "N/A",
      "Back Neck Tape GSM": entry.back_neck_tape_gsm || "N/A",
      "Back Neck Tape DIA": entry.back_neck_tape_dia || "N/A",
      "Neck Binding?": entry.has_neck_binding ? "Yes" : "No",
      "Neck Binding Con": entry.neck_binding_con || "N/A",
      "Neck Binding GSM": entry.neck_binding_gsm || "N/A",
      "Neck Binding DIA": entry.neck_binding_dia || "N/A",
      "Status": entry.status.toUpperCase(),
      "Created By": entry.created_by
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fabric Metrics");
    
    // Auto fit column widths
    const maxLens = Object.keys(dataToExport[0] || {}).map(key => {
      let max = key.length;
      dataToExport.forEach(row => {
        const val = String((row as any)[key] || "");
        if (val.length > max) max = val.length;
      });
      return { wch: max + 3 };
    });
    worksheet["!cols"] = maxLens;

    XLSX.writeFile(workbook, `fabric_metrics_export_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-8">
      {/* 1. Form Section */}
      <div id="fabric-form-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <SlidersHorizontal size={18} />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {isEditing ? "Update Fabric Specification Metrics" : "Fabric Metrics Specification Sheet"}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Initialize fabric specifications for cutting works. All specs act as job standards.
            </p>
          </div>
          {isEditing && (
            <button
              onClick={cancelEdit}
              className="mt-3 md:mt-0 flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <X size={14} /> Cancel Editing
            </button>
          )}
        </div>

        {formError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border-l-4 border-red-500 text-red-700 dark:text-red-300 rounded-r-lg flex items-start gap-2.5 text-xs">
            <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
            <div>
              <p className="font-semibold">Validation Notice</p>
              <p>{formError}</p>
            </div>
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, "submitted")} className="space-y-6">
          {/* Header Specs Group */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Primary Order Identifiers
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <input
                    type="date"
                    name="entry_date"
                    value={formData.entry_date || ""}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Buyer *</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <select
                    name="buyer"
                    value={formData.buyer || ""}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select Buyer</option>
                    {buyers.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Job No *</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <input
                    type="text"
                    name="job_no"
                    placeholder="e.g. JB-10293"
                    value={formData.job_no || ""}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Color *</label>
                <input
                  type="text"
                  name="color"
                  placeholder="e.g. Navy Blue"
                  value={formData.color || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Item *</label>
                <input
                  type="text"
                  name="item"
                  placeholder="e.g. T-Shirt"
                  value={formData.item || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Fabric Type *</label>
                <input
                  type="text"
                  name="fabric_type"
                  placeholder="e.g. 100% Cotton S/J"
                  value={formData.fabric_type || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">PO Number *</label>
                <input
                  type="text"
                  name="po_no"
                  placeholder="e.g. PO-88273"
                  value={formData.po_no || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">PO Order Qty</label>
                <input
                  type="number"
                  name="po_order_qty"
                  min="0"
                  placeholder="0"
                  value={formData.po_order_qty === 0 ? "" : formData.po_order_qty}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Size-Wise Fabric Booking Card */}
          <div className="border border-indigo-100 dark:border-slate-800 p-4 rounded-xl space-y-4 bg-indigo-50/20 dark:bg-slate-900/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100/50 dark:border-slate-800/50 pb-3">
              <div>
                <h3 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span> Size-Wise Fabric Booking (Master)
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Define fabric booking quantity by sizes in Pcs. The total sums up to PO Order Qty and automatically calculates Booking KG based on Gross Consumption.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={activeSizeGroup}
                  onChange={(e) => setActiveSizeGroup(e.target.value)}
                  className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
                >
                  {Object.keys(SIZE_GROUPS).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleClearSizeBookings}
                  className="px-2 py-1 text-[10px] text-red-600 hover:text-red-700 font-semibold border border-red-200 rounded hover:bg-red-50 transition"
                >
                  Clear Sizes
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {SIZE_GROUPS[activeSizeGroup as keyof typeof SIZE_GROUPS].map((size) => {
                const val = formData.size_bookings?.[size] || "";
                return (
                  <div key={size} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/85 p-2 rounded shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-slate-700 transition">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 font-mono text-center">{size}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={val}
                      onChange={(e) => handleSizeBookingChange(size, e.target.value)}
                      className="w-full px-1.5 py-1 border border-slate-200 dark:border-slate-800 rounded text-xs bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 font-semibold text-center"
                    />
                  </div>
                );
              })}
            </div>

            {formData.size_bookings && Object.keys(formData.size_bookings).length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-150 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-indigo-700 dark:text-indigo-400 font-semibold bg-indigo-50/10 p-2 rounded gap-2">
                <span>Selected Sizes Booking breakdown:</span>
                <span className="font-mono flex flex-wrap gap-2 justify-end">
                  {sortSizes(Object.keys(formData.size_bookings)).map((sz) => {
                    const wk = formData.size_bookings[sz];
                    return (
                      <span key={sz} className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-slate-800 text-[10px]">{sz}: <strong>{wk} pcs</strong></span>
                    );
                  })}
                  <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px]">Total Qty: <strong>{formData.po_order_qty || 0} pcs</strong></span>
                </span>
              </div>
            )}
          </div>

          {/* Core Booking Metrics Group */}
          <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Core Fabric Specifications
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Booking KG</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  name="booking_kg"
                  placeholder="0.00"
                  value={formData.booking_kg === 0 ? "" : formData.booking_kg}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Booking GSM</label>
                <input
                  type="number"
                  min="0"
                  name="booking_gsm"
                  placeholder="0"
                  value={formData.booking_gsm === 0 ? "" : formData.booking_gsm}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Booking DIA</label>
                <input
                  type="number"
                  min="0"
                  name="booking_dia"
                  placeholder="0"
                  value={formData.booking_dia === 0 ? "" : formData.booking_dia}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Net Consumption</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  name="net_consumption"
                  placeholder="0.000"
                  value={formData.net_consumption === 0 ? "" : formData.net_consumption}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Gross Consumption</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  name="gross_consumption"
                  placeholder="0.000"
                  value={formData.gross_consumption === 0 ? "" : formData.gross_consumption}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Rib Specifications (Optional/Auxiliary) */}
          <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> RIB Fabric Specification (Optional)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Rib Fabric Type</label>
                <input
                  type="text"
                  name="rib_fabric_type"
                  placeholder="e.g. 1x1 Lycra Rib"
                  value={formData.rib_fabric_type || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">RIB GSM</label>
                <input
                  type="number"
                  min="0"
                  name="rib_gsm"
                  placeholder="0"
                  value={formData.rib_gsm || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">RIB DIA</label>
                <input
                  type="number"
                  min="0"
                  name="rib_dia"
                  placeholder="0"
                  value={formData.rib_dia || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">RIB Consumption</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  name="rib_consumption"
                  placeholder="0.000"
                  value={formData.rib_consumption || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Conditional Accessory Tapes section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Back Neck Tape Checkbox Specifications */}
            <div className="border border-slate-150 dark:border-slate-800 p-4 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="has_back_neck_tape"
                    checked={!!formData.has_back_neck_tape}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Include Back Neck Tape
                  </span>
                </label>
              </div>

              {formData.has_back_neck_tape && (
                <div className="overflow-hidden pt-2 grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CON</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      name="back_neck_tape_con"
                      placeholder="0.000"
                      value={formData.back_neck_tape_con || ""}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">GSM</label>
                    <input
                      type="number"
                      min="0"
                      name="back_neck_tape_gsm"
                      placeholder="0"
                      value={formData.back_neck_tape_gsm || ""}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">DIA</label>
                    <input
                      type="number"
                      min="0"
                      name="back_neck_tape_dia"
                      placeholder="0"
                      value={formData.back_neck_tape_dia || ""}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Neck Binding Checkbox Specifications */}
            <div className="border border-slate-150 dark:border-slate-800 p-4 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="has_neck_binding"
                    checked={!!formData.has_neck_binding}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Include Neck Binding
                  </span>
                </label>
              </div>

              {formData.has_neck_binding && (
                <div className="overflow-hidden pt-2 grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CON</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      name="neck_binding_con"
                      placeholder="0.000"
                      value={formData.neck_binding_con || ""}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">GSM</label>
                    <input
                      type="number"
                      min="0"
                      name="neck_binding_gsm"
                      placeholder="0"
                      value={formData.neck_binding_gsm || ""}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">DIA</label>
                    <input
                      type="number"
                      min="0"
                      name="neck_binding_dia"
                      placeholder="0"
                      value={formData.neck_binding_dia || ""}
                      onChange={handleChange}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    handleSubmit({ preventDefault: () => {} } as any, "draft");
                  }}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2"
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <RefreshCw className="animate-spin" size={14} /> : null}
                  Update Specification
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, "draft")}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2"
                >
                  Save as Draft
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={14} />}
                  Commit Fabric Specs
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* 2. Ledger Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span> Fabric Metrics Specification Ledger
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Ledger of active and drafted job specification standards. Use these to verify cutting yields.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onRefresh}
              className="p-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 transition"
              title="Refresh ledger"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <FileSpreadsheet size={14} /> Export Specs
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-xl">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Search Keywords</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Search Job No, PO, color..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Filter by Buyer</label>
            <select
              value={selectedBuyer}
              onChange={(e) => setSelectedBuyer(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">All Buyers</option>
              {buyers.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Status Filter</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Specs Standard</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Buyer / Job No</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Fabric Description</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Booking Specs</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Consumption</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-center">Trim Specs</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-center">Status</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No fabric specifications found matching the current standards.
                  </td>
                </tr>
              ) : (
                filteredEntries.map(entry => {
                  const isExpanded = expandedId === entry.id;
                  const isDeleteConfirmed = deleteConfirmId === entry.id;

                  return (
                    <React.Fragment key={entry.id}>
                      <tr className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition text-slate-900 dark:text-slate-100 ${isExpanded ? "bg-slate-50/30 dark:bg-slate-850/10" : ""}`}>
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-semibold">{entry.entry_date}</div>
                          <div className="text-[10px] text-slate-400 font-mono">PO: {entry.po_no}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-bold text-slate-900 dark:text-white uppercase">{entry.buyer}</div>
                          <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{entry.job_no}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-medium">{entry.fabric_type}</div>
                          <div className="text-[10px] text-slate-400">Color: {entry.color} • {entry.item}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-semibold">{Number(entry.booking_kg).toFixed(1)} KG</div>
                          <div className="text-[10px] text-slate-400">GSM: {entry.booking_gsm} • DIA: {entry.booking_dia}"</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-semibold">G: {Number(entry.gross_consumption).toFixed(3)}</div>
                          <div className="text-[10px] text-slate-400">N: {Number(entry.net_consumption).toFixed(3)} dz/kg</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex justify-center items-center gap-1">
                            {entry.rib_fabric_type && (
                              <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 text-[9px] rounded font-medium">RIB</span>
                            )}
                            {entry.has_back_neck_tape && (
                              <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 text-[9px] rounded font-medium">TAPE</span>
                            )}
                            {entry.has_neck_binding && (
                              <span className="px-1.5 py-0.5 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900 text-[9px] rounded font-medium">BIND</span>
                            )}
                            {!entry.rib_fabric_type && !entry.has_back_neck_tape && !entry.has_neck_binding && (
                              <span className="text-[10px] text-slate-400 font-mono">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            entry.status === "approved" 
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                              : entry.status === "submitted"
                                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded"
                              title="Toggle full details specs"
                            >
                              <Eye size={14} />
                            </button>

                            {/* Operator / Admin Draft Edits */}
                            {(entry.status === "draft" || userRole === "admin" || userRole === "supervisor") && (
                              <button
                                onClick={() => handleEditClick(entry)}
                                className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded"
                                title="Edit specs"
                              >
                                <Edit size={14} />
                              </button>
                            )}

                            {/* Supervisor Approvals */}
                            {entry.status === "submitted" && (userRole === "supervisor" || userRole === "admin") && (
                              <button
                                onClick={() => handleApprove(entry.id, "approved")}
                                className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded"
                                title="Approve specifications"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            )}

                            {/* Delete Button */}
                            {isDeleteConfirmed ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDeleteClick(entry.id)}
                                  className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              (entry.status === "draft" || userRole === "admin" || userRole === "supervisor") && (
                                <button
                                  onClick={() => setDeleteConfirmId(entry.id)}
                                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 rounded"
                                  title="Delete specification"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanding Sub-Ledger for Specs Detail sheet */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50 dark:bg-slate-850/20">
                          <td colSpan={8} className="py-4 px-6 border-b border-slate-200 dark:border-slate-800">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-700 dark:text-slate-300">
                              {/* Left specs: Basic Specs summary */}
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm space-y-2">
                                <h4 className="font-bold text-slate-900 dark:text-white border-b pb-1 mb-2 uppercase text-[11px] tracking-wider text-indigo-600 dark:text-indigo-400">
                                  Standard Order Yield Specs
                                </h4>
                                <div className="flex justify-between"><span>PO Order Qty:</span> <strong className="text-slate-900 dark:text-white">{entry.po_order_qty} pcs</strong></div>
                                <div className="flex justify-between"><span>Booking Fabric:</span> <strong className="text-slate-900 dark:text-white">{entry.booking_kg} KG</strong></div>
                                <div className="flex justify-between"><span>Booking GSM:</span> <strong className="text-slate-900 dark:text-white">{entry.booking_gsm}</strong></div>
                                <div className="flex justify-between"><span>Booking DIA:</span> <strong className="text-slate-900 dark:text-white">{entry.booking_dia}"</strong></div>
                                <div className="flex justify-between"><span>Gross Consumption:</span> <strong className="text-slate-900 dark:text-white">{entry.gross_consumption} dz/kg</strong></div>
                                <div className="flex justify-between"><span>Net Consumption:</span> <strong className="text-slate-900 dark:text-white">{entry.net_consumption} dz/kg</strong></div>
                              </div>

                              {/* Center specs: RIB detailed parameters */}
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm space-y-2">
                                <h4 className="font-bold text-slate-900 dark:text-white border-b pb-1 mb-2 uppercase text-[11px] tracking-wider text-amber-600 dark:text-amber-400">
                                  RIB Trim Details
                                </h4>
                                {entry.rib_fabric_type ? (
                                  <>
                                    <div className="flex justify-between"><span>Rib Fabric Type:</span> <strong className="text-slate-900 dark:text-white">{entry.rib_fabric_type}</strong></div>
                                    <div className="flex justify-between"><span>Rib GSM:</span> <strong className="text-slate-900 dark:text-white">{entry.rib_gsm || "-"}</strong></div>
                                    <div className="flex justify-between"><span>Rib DIA:</span> <strong className="text-slate-900 dark:text-white">{entry.rib_dia || "-"}</strong></div>
                                    <div className="flex justify-between"><span>Rib Consumption:</span> <strong className="text-slate-900 dark:text-white">{entry.rib_consumption || "-"} dz/kg</strong></div>
                                  </>
                                ) : (
                                  <div className="py-4 text-center text-slate-400">No RIB trim required for this standard order item.</div>
                                )}
                              </div>

                              {/* Right specs: Accessories Tapes & Bindings */}
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm space-y-4">
                                <div>
                                  <h4 className="font-bold text-slate-900 dark:text-white border-b pb-1 mb-2 uppercase text-[11px] tracking-wider text-indigo-600 dark:text-indigo-400">
                                    Back Neck Tape Specs
                                  </h4>
                                  {entry.has_back_neck_tape ? (
                                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                                      <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded">
                                        <div className="text-slate-400 text-[9px] uppercase font-bold">CON</div>
                                        <strong className="text-slate-900 dark:text-white">{entry.back_neck_tape_con || "-"}</strong>
                                      </div>
                                      <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded">
                                        <div className="text-slate-400 text-[9px] uppercase font-bold">GSM</div>
                                        <strong className="text-slate-900 dark:text-white">{entry.back_neck_tape_gsm || "-"}</strong>
                                      </div>
                                      <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded">
                                        <div className="text-slate-400 text-[9px] uppercase font-bold">DIA</div>
                                        <strong className="text-slate-900 dark:text-white">{entry.back_neck_tape_dia || "-"}</strong>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-slate-400 text-[11px]">No Back Neck Tape specification.</div>
                                  )}
                                </div>

                                <div>
                                  <h4 className="font-bold text-slate-900 dark:text-white border-b pb-1 mb-2 uppercase text-[11px] tracking-wider text-sky-600 dark:text-sky-400">
                                    Neck Binding Specs
                                  </h4>
                                  {entry.has_neck_binding ? (
                                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                                      <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded">
                                        <div className="text-slate-400 text-[9px] uppercase font-bold">CON</div>
                                        <strong className="text-slate-900 dark:text-white">{entry.neck_binding_con || "-"}</strong>
                                      </div>
                                      <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded">
                                        <div className="text-slate-400 text-[9px] uppercase font-bold">GSM</div>
                                        <strong className="text-slate-900 dark:text-white">{entry.neck_binding_gsm || "-"}</strong>
                                      </div>
                                      <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded">
                                        <div className="text-slate-400 text-[9px] uppercase font-bold">DIA</div>
                                        <strong className="text-slate-900 dark:text-white">{entry.neck_binding_dia || "-"}</strong>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-slate-400 text-[11px]">No Neck Binding specification.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {entry.size_bookings && Object.keys(entry.size_bookings).length > 0 && (
                              <div className="mt-4 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                                <h4 className="font-bold text-slate-900 dark:text-white pb-1 border-b uppercase text-[10px] tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
                                  Size-Wise Fabric Booking Breakdown
                                </h4>
                                <div className="flex flex-wrap gap-2 items-center">
                                  {sortSizes(Object.keys(entry.size_bookings)).map((sz) => {
                                    const qty = entry.size_bookings[sz];
                                    return (
                                      <div key={sz} className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800/50 text-[11px] flex items-center gap-1.5">
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-[10px] bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">{sz}</span>
                                        <span className="text-slate-500">Booking:</span>
                                        <strong className="text-slate-900 dark:text-white font-mono">{qty} kg</strong>
                                      </div>
                                    );
                                  })}
                                  <div className="sm:ml-auto bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono">
                                    Total Booking: {entry.booking_kg} kg
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="mt-3 text-[10px] text-slate-400 text-right">
                              Logged by: <span className="font-mono">{entry.created_by}</span>
                              {entry.approved_by && (
                                <> • Approved by: <span className="font-mono">{entry.approved_by}</span></>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
