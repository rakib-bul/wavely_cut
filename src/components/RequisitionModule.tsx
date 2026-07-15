import React, { useState, useMemo } from "react";
import { Requisition, Profile } from "../types";
import { 
  ClipboardList, 
  Plus, 
  Edit2, 
  Trash2, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  FileText, 
  Package, 
  Check, 
  X, 
  CheckCircle, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  FileSpreadsheet, 
  Clock,
  History,
  Info,
  Lock
} from "lucide-react";

interface RequisitionModuleProps {
  requisitions: Requisition[];
  currentProfile: Profile;
  onAddRequisition: (req: Omit<Requisition, 'id' | 'status' | 'created_at'>) => void;
  onApproveRequisition: (id: string, approvedBy: string) => void;
  onRejectRequisition: (id: string, rejectedBy: string) => void;
  onUpdateRequisition: (id: string, updated: Partial<Requisition>) => void;
  onDeleteRequisition: (id: string) => void;
}

export default function RequisitionModule({
  requisitions,
  currentProfile,
  onAddRequisition,
  onApproveRequisition,
  onRejectRequisition,
  onUpdateRequisition,
  onDeleteRequisition
}: RequisitionModuleProps) {
  const isOfficerOrAdmin = ["admin", "supervisor", "manager"].includes(currentProfile?.role);

  if (currentProfile?.can_access_requisition === false) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto" id="requisition-no-access">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-5 border border-rose-100 dark:border-rose-900/30 shadow-xs">
          <Lock size={28} />
        </div>
        <h2 className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">Access Restricted</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed">
          Requisition module access has been locked by Admin for your profile.
        </p>
      </div>
    );
  }

  // --- Inner Tabs ---
  // Option: 'issue_receive' (Issue and Receive View) or 'approval' (Approval Form & Workflow)
  const [activeOption, setActiveOption] = useState<'issue_receive' | 'approval'>('issue_receive');
  
  // Sub-tabs for Issue & Receive Option
  const [issueReceiveSubTab, setIssueReceiveSubTab] = useState<'all' | 'issue' | 'receive'>('all');
  
  // Sub-tabs for Approval Option
  const [approvalSubTab, setApprovalSubTab] = useState<'new' | 'pending' | 'history'>('new');

  // --- Search & Filter States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterReceived, setFilterReceived] = useState<'all' | 'received' | 'not_received'>('all');

  // --- Form States for New Requisition ---
  const [newReqId, setNewReqId] = useState(() => `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newRequestPerson, setNewRequestPerson] = useState(currentProfile?.full_name || "");
  const [newQty, setNewQty] = useState<number | "">("");
  const [newSentDate, setNewSentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newReceivedDate, setNewReceivedDate] = useState("");
  const [newWorkOrderNo, setNewWorkOrderNo] = useState("");
  const [newMrriNo, setNewMrriNo] = useState("");
  const [newIssueNo, setNewIssueNo] = useState("");
  const [newRemarks, setNewRemarks] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // --- Editing Modal States ---
  const [editingReq, setEditingReq] = useState<Requisition | null>(null);
  const [editReceivedDate, setEditReceivedDate] = useState("");
  const [editMrriNo, setEditMrriNo] = useState("");
  const [editIssueNo, setEditIssueNo] = useState("");
  const [editRemarks, setEditRemarks] = useState("");

  // --- Smart Auto-Generation Helper ---
  const regenerateReqId = () => {
    setNewReqId(`REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  // --- Handle New Requisition Submit ---
  const handleCreateRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!newReqId.trim()) return setFormError("Requisition ID is required.");
    if (!newItemDescription.trim()) return setFormError("Item description is required.");
    if (!newRequestPerson.trim()) return setFormError("Request Person is required.");
    if (newQty === "" || Number(newQty) <= 0) return setFormError("Quantity must be greater than zero.");
    if (!newSentDate) return setFormError("Sent Date is required.");
    if (!newWorkOrderNo.trim()) return setFormError("Work Order Number is required.");

    // Check if requisition ID already exists
    if (requisitions.some(r => r.req_id.toLowerCase() === newReqId.toLowerCase().trim())) {
      return setFormError("Requisition ID already exists. Please generate a unique one.");
    }

    onAddRequisition({
      req_id: newReqId.trim(),
      item_description: newItemDescription.trim(),
      request_person: newRequestPerson.trim(),
      qty: Number(newQty),
      sent_date: newSentDate,
      received_date: newReceivedDate ? newReceivedDate : undefined,
      work_order_no: newWorkOrderNo.trim(),
      mrri_no: newMrriNo.trim(),
      issue_no: newIssueNo.trim(),
      remarks: newRemarks.trim()
    });

    setFormSuccess(`Requisition ${newReqId} created successfully & set to pending approval!`);
    
    // Reset Form Fields
    regenerateReqId();
    setNewItemDescription("");
    setNewQty("");
    setNewWorkOrderNo("");
    setNewMrriNo("");
    setNewIssueNo("");
    setNewRemarks("");
    setNewReceivedDate("");

    // Auto navigate to pending tab
    setTimeout(() => {
      setApprovalSubTab('pending');
      setFormSuccess(null);
    }, 1500);
  };

  // --- Handle Quick Receive (Issue & Receive Option) ---
  const [receivingReq, setReceivingReq] = useState<Requisition | null>(null);
  const [quickReceivedDate, setQuickReceivedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quickMrriNo, setQuickMrriNo] = useState("");
  const [quickIssueNo, setQuickIssueNo] = useState("");

  const handleOpenReceiveModal = (req: Requisition) => {
    setReceivingReq(req);
    setQuickReceivedDate(new Date().toISOString().split('T')[0]);
    setQuickMrriNo(req.mrri_no || "");
    setQuickIssueNo(req.issue_no || "");
  };

  const handleSaveReceiveDetails = () => {
    if (!receivingReq) return;
    if (!quickReceivedDate) return alert("Received date is required.");

    onUpdateRequisition(receivingReq.id, {
      received_date: quickReceivedDate,
      mrri_no: quickMrriNo.trim(),
      issue_no: quickIssueNo.trim()
    });

    setReceivingReq(null);
  };

  // --- Handle Edit Requisition ---
  const handleOpenEditModal = (req: Requisition) => {
    setEditingReq(req);
    setEditReceivedDate(req.received_date || "");
    setEditMrriNo(req.mrri_no || "");
    setEditIssueNo(req.issue_no || "");
    setEditRemarks(req.remarks || "");
  };

  const handleSaveEdit = () => {
    if (!editingReq) return;
    onUpdateRequisition(editingReq.id, {
      received_date: editReceivedDate || undefined,
      mrri_no: editMrriNo,
      issue_no: editIssueNo,
      remarks: editRemarks
    });
    setEditingReq(null);
  };

  // --- Filter and Search Logic ---
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter(req => {
      // 1. Search term (item description, request person, req_id, work order no, issue no, mrri no)
      const matchesSearch = 
        req.req_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.item_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.request_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.work_order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.issue_no && req.issue_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (req.mrri_no && req.mrri_no.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // 2. Inner Tab logic for 'issue_receive' option
      if (activeOption === 'issue_receive') {
        if (issueReceiveSubTab === 'issue') {
          // Issues are approved requests that are sent
          return req.status === 'approved';
        }
        if (issueReceiveSubTab === 'receive') {
          // Receives are approved requests that have been marked received
          return req.status === 'approved' && !!req.received_date;
        }
      }

      // 3. Status Filters (only if relevant or global filter)
      if (filterStatus !== 'all' && req.status !== filterStatus) return false;

      // 4. Received Filters
      if (filterReceived === 'received' && !req.received_date) return false;
      if (filterReceived === 'not_received' && req.received_date) return false;

      return true;
    });
  }, [requisitions, searchTerm, filterStatus, filterReceived, activeOption, issueReceiveSubTab]);

  // --- Pending Approvals Count ---
  const pendingCount = useMemo(() => {
    return requisitions.filter(r => r.status === 'pending').length;
  }, [requisitions]);

  // --- Export to CSV ---
  const exportToCSV = () => {
    const headers = ["Requisition ID", "Item Description", "Request Person", "Qty", "Sent Date", "Received Date", "Work Order No", "MRRI No", "Issue No", "Remarks", "Status"];
    const rows = filteredRequisitions.map(r => [
      r.req_id,
      r.item_description,
      r.request_person,
      r.qty,
      r.sent_date,
      r.received_date || "Not Received",
      r.work_order_no,
      r.mrri_no || "N/A",
      r.issue_no || "N/A",
      r.remarks || "",
      r.status.toUpperCase()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Requisition_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION WITH NAVIGATION OPTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <ClipboardList size={22} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                Requisition Management
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Issue and receive requisitions, submit requests, and manage approval chains.
              </p>
            </div>
          </div>
        </div>

        {/* Outer Navigation Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
          <button
            onClick={() => setActiveOption('issue_receive')}
            className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeOption === 'issue_receive'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <RefreshCw size={14} className={activeOption === 'issue_receive' ? "text-indigo-500 animate-spin-slow" : ""} />
            Issue & Receive Option
          </button>
          <button
            onClick={() => setActiveOption('approval')}
            className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 relative ${
              activeOption === 'approval'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <CheckCircle size={14} className={activeOption === 'approval' ? "text-emerald-500" : ""} />
            Approval Form
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1 bg-rose-500 text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================
          OPTION A: ISSUE & RECEIVE OPTION
          ======================================================== */}
      {activeOption === 'issue_receive' && (
        <div className="space-y-6">
          
          {/* Filters & Sub-navigation bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Inner Option Sub-tabs */}
              <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800/60 w-fit">
                <button
                  onClick={() => setIssueReceiveSubTab('all')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    issueReceiveSubTab === 'all'
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  All Requisitions
                </button>
                <button
                  onClick={() => setIssueReceiveSubTab('issue')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    issueReceiveSubTab === 'issue'
                      ? "bg-indigo-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <ArrowUpRight size={13} />
                  Issue Ledger (Approved)
                </button>
                <button
                  onClick={() => setIssueReceiveSubTab('receive')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    issueReceiveSubTab === 'receive'
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <ArrowDownLeft size={13} />
                  Received Ledger
                </button>
              </div>

              {/* Action Buttons & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px]">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search ledger entries..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-700 dark:text-slate-300 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                {/* Received Filter */}
                <select
                  value={filterReceived}
                  onChange={(e) => setFilterReceived(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs py-2 px-3 text-slate-700 dark:text-slate-300 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                >
                  <option value="all">Received Status: All</option>
                  <option value="received">Received Only</option>
                  <option value="not_received">Not Received Yet</option>
                </select>

                <button
                  onClick={exportToCSV}
                  className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/50 rounded-xl px-3.5 py-2 text-xs font-black hover:bg-indigo-100 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FileSpreadsheet size={14} />
                  Export Ledger
                </button>
              </div>
            </div>
          </div>

          {/* TABLE OF REQUISITIONS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/80">
                    <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500">Requisition Details</th>
                    <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500">Item Description</th>
                    <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500">Requestor</th>
                    <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500 text-center">Qty</th>
                    <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500">Dates</th>
                    <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500">Identifiers</th>
                    <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500">Approval State</th>
                    <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredRequisitions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-full text-slate-400">
                            <ClipboardList size={32} />
                          </div>
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">No Requisitions Found</span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Create a requisition inside the "Approval Form" tab or adjust your filters.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRequisitions.map((req) => (
                      <tr 
                        key={req.id} 
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-all text-slate-700 dark:text-slate-300"
                      >
                        {/* ID & WO */}
                        <td className="p-4">
                          <div className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
                            {req.req_id}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            WO: <span className="font-bold font-mono text-slate-600 dark:text-slate-300">{req.work_order_no}</span>
                          </div>
                        </td>

                        {/* Item Desc & Remarks */}
                        <td className="p-4 max-w-[220px]">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {req.item_description}
                          </div>
                          {req.remarks && (
                            <div className="text-[10px] text-slate-400 truncate mt-0.5" title={req.remarks}>
                              "{req.remarks}"
                            </div>
                          )}
                        </td>

                        {/* Request Person */}
                        <td className="p-4">
                          <div className="text-xs font-bold flex items-center gap-1">
                            <User size={12} className="text-slate-400" />
                            {req.request_person}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            Requested on: {req.created_at.slice(0, 10)}
                          </div>
                        </td>

                        {/* Qty */}
                        <td className="p-4 text-center">
                          <span className="font-mono font-black text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-800 dark:text-slate-200">
                            {req.qty.toLocaleString()}
                          </span>
                        </td>

                        {/* Dates */}
                        <td className="p-4">
                          <div className="flex flex-col gap-1 text-[11px]">
                            <span className="flex items-center gap-1">
                              <span className="text-[9px] font-black uppercase text-slate-400 w-10">Sent:</span>
                              <span className="font-mono font-bold">{req.sent_date}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-[9px] font-black uppercase text-slate-400 w-10">Recv:</span>
                              {req.received_date ? (
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded">
                                  {req.received_date}
                                </span>
                              ) : (
                                <span className="text-amber-500 italic text-[10px]">Pending Receipt</span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Identifiers */}
                        <td className="p-4 text-xs font-medium">
                          <div className="flex flex-col gap-0.5">
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-black">MRRI No:</span>{" "}
                              <span className="font-mono font-bold">{req.mrri_no || "—"}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-black">Issue No:</span>{" "}
                              <span className="font-mono font-bold">{req.issue_no || "—"}</span>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            req.status === 'approved'
                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40"
                              : req.status === 'rejected'
                              ? "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40"
                              : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              req.status === 'approved' ? 'bg-emerald-500' : req.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-500'
                            }`} />
                            {req.status}
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Receive Action */}
                            {req.status === 'approved' && !req.received_date && (
                              <button
                                onClick={() => handleOpenReceiveModal(req)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs"
                                title="Mark as Received"
                              >
                                Receive
                              </button>
                            )}

                            {/* Edit Action */}
                            <button
                              onClick={() => handleOpenEditModal(req)}
                              className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-all cursor-pointer"
                              title="Edit Details"
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Delete Action for authorized or admins */}
                            {currentProfile.role === 'admin' && (
                              <button
                                onClick={() => {
                                  if (confirm(`Delete Requisition ${req.req_id}?`)) {
                                    onDeleteRequisition(req.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          OPTION B: APPROVAL FORM
          ======================================================== */}
      {activeOption === 'approval' && (
        <div className="space-y-6">
          
          {/* Sub tabs for Approval section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
            <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800/60 w-fit">
              <button
                onClick={() => setApprovalSubTab('new')}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  approvalSubTab === 'new'
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Plus size={14} />
                New Requisitions
              </button>
              {isOfficerOrAdmin && (
                <button
                  onClick={() => setApprovalSubTab('pending')}
                  className={`px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    approvalSubTab === 'pending'
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Clock size={14} />
                  Pending Approval
                  {pendingCount > 0 && (
                    <span className={`text-[10px] font-black ml-1 px-1.5 py-0.5 rounded-full ${approvalSubTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-rose-500 text-white'}`}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setApprovalSubTab('history')}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  approvalSubTab === 'history'
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <History size={14} />
                Approval History
              </button>
            </div>
          </div>

          {/* 1. SUB-TAB: NEW REQUISITIONS */}
          {approvalSubTab === 'new' && (
            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm">
              <div className="mb-6 flex items-center gap-2">
                <Package size={20} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Submit New Requisition</h3>
              </div>

              {formError && (
                <div className="mb-5 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-pulse">
                  <CheckCircle size={14} />
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleCreateRequisition} className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Requisition ID */}
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                      Requisition ID <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newReqId}
                        onChange={(e) => setNewReqId(e.target.value)}
                        placeholder="REQ-YYYY-XXXX"
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={regenerateReqId}
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-2 text-[10px] font-extrabold rounded-xl text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                        title="Generate Unique ID"
                      >
                        Auto
                      </button>
                    </div>
                  </div>

                  {/* Work Order No */}
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                      Work Order No <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newWorkOrderNo}
                      onChange={(e) => setNewWorkOrderNo(e.target.value)}
                      placeholder="e.g. WO-5421"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* Item Description */}
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Item Description <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    placeholder="Describe the requested machinery parts, sewing thread, fabrics, buttons, etc."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Request Person */}
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                      Request Person <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newRequestPerson}
                      onChange={(e) => setNewRequestPerson(e.target.value)}
                      placeholder="Name of requester"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                      Quantity <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={newQty}
                      onChange={(e) => setNewQty(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 50"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {/* Sent Date */}
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                      Sent Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newSentDate}
                      onChange={(e) => setNewSentDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 my-4 pt-4">
                  <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider block mb-3">
                    Receipt details (Optional during request phase)
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* MRRI No */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">MRRI No</label>
                      <input
                        type="text"
                        value={newMrriNo}
                        onChange={(e) => setNewMrriNo(e.target.value)}
                        placeholder="e.g. MRRI-421"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      />
                    </div>

                    {/* Issue No */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Issue No</label>
                      <input
                        type="text"
                        value={newIssueNo}
                        onChange={(e) => setNewIssueNo(e.target.value)}
                        placeholder="e.g. ISS-9840"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      />
                    </div>

                    {/* Received Date */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Received Date</label>
                      <input
                        type="date"
                        value={newReceivedDate}
                        onChange={(e) => setNewReceivedDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Remarks
                  </label>
                  <textarea
                    value={newRemarks}
                    onChange={(e) => setNewRemarks(e.target.value)}
                    placeholder="Enter any specific quality constraints, supplier information or special instructions..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-xs shadow-indigo-600/10"
                  >
                    Submit Requisition
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2. SUB-TAB: PENDING APPROVAL */}
          {approvalSubTab === 'pending' && (
            !isOfficerOrAdmin ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xs text-center text-slate-500">
                Only Admin and Officers are authorized to approve or reject requisitions.
              </div>
            ) : (
              <div className="space-y-4">
                
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Pending Requests Approval Chain</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Authorize or reject newly filed requisitions before they can enter the active Issue and Receive registers.
                  </p>
                </div>

              {requisitions.filter(r => r.status === 'pending').length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 rounded-2xl shadow-xs text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                    <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-600">
                      <CheckCircle size={32} />
                    </div>
                    <span className="font-extrabold text-sm text-slate-850 dark:text-white">All Caught Up!</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      There are currently no requisitions waiting for approval in the system database.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {requisitions.filter(r => r.status === 'pending').map((req) => (
                    <div 
                      key={req.id} 
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-amber-500/30 transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
                              {req.req_id}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                              {req.item_description}
                            </h4>
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30">
                            <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                            Pending Approval
                          </span>
                        </div>

                        {/* Bento Grid layout within the Card */}
                        <div className="grid grid-cols-2 gap-4 my-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Requested By</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{req.request_person}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Quantity</span>
                            <span className="font-mono font-black text-slate-800 dark:text-slate-200">{req.qty.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Work Order No</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{req.work_order_no}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Sent Date</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{req.sent_date}</span>
                          </div>
                        </div>

                        {req.remarks && (
                          <div className="p-3 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 flex gap-2">
                            <Info size={14} className="text-slate-400 shrink-0" />
                            <p className="italic">"{req.remarks}"</p>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          Submitted on {req.created_at.slice(0, 10)}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onRejectRequisition(req.id, currentProfile.full_name)}
                            className="bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer flex items-center gap-1"
                          >
                            <X size={14} />
                            Reject
                          </button>
                          <button
                            onClick={() => onApproveRequisition(req.id, currentProfile.full_name)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-xs font-black shadow-xs shadow-emerald-600/10 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Check size={14} />
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )
          )}

          {/* 3. SUB-TAB: APPROVAL HISTORY */}
          {approvalSubTab === 'history' && (
            <div className="space-y-4">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Processed Requisition Archives</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  History of approved or rejected requisitions, processed by supervisors or administrative officers.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/80">
                        <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500">ID</th>
                        <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500">Item</th>
                        <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500">Requested By</th>
                        <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500 text-center">Qty</th>
                        <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500">WO No</th>
                        <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500">Decided By</th>
                        <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500">Decided Date</th>
                        <th className="p-4 text-[10px] uppercase font-black tracking-wider text-slate-500">Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {requisitions.filter(r => r.status !== 'pending').length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-slate-400">
                            No processed requisition records in archives.
                          </td>
                        </tr>
                      ) : (
                        requisitions.filter(r => r.status !== 'pending').map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all text-slate-700 dark:text-slate-300 text-xs">
                            <td className="p-4 font-mono font-black text-indigo-600 dark:text-indigo-400">{req.req_id}</td>
                            <td className="p-4 font-bold">{req.item_description}</td>
                            <td className="p-4">{req.request_person}</td>
                            <td className="p-4 text-center font-mono font-bold">{req.qty.toLocaleString()}</td>
                            <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{req.work_order_no}</td>
                            <td className="p-4 flex items-center gap-1 font-semibold">
                              <User size={12} className="text-slate-400" />
                              {req.approved_by || "Administrator"}
                            </td>
                            <td className="p-4 font-mono text-slate-500">{req.approved_at || req.created_at.slice(0, 10)}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                req.status === 'approved'
                                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40"
                                  : "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40"
                              }`}>
                                {req.status === 'approved' ? 'Approved' : 'Rejected'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL A: QUICK RECEIVE DETAILS (Option: Issue & Receive)
          ======================================================== */}
      {receivingReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-950 dark:text-white text-sm uppercase flex items-center gap-2">
                <ArrowDownLeft size={16} className="text-emerald-500" />
                Record Receipt Details
              </h3>
              <button 
                onClick={() => setReceivingReq(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-900 space-y-1">
              <div><span className="font-extrabold text-slate-400">Req ID:</span> <span className="font-mono font-black text-indigo-600">{receivingReq.req_id}</span></div>
              <div><span className="font-extrabold text-slate-400">Item:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{receivingReq.item_description}</span></div>
              <div><span className="font-extrabold text-slate-400">Sent Qty:</span> <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{receivingReq.qty.toLocaleString()}</span></div>
            </div>

            <div className="space-y-3.5 pt-1">
              {/* Received Date */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Received Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={quickReceivedDate}
                  onChange={(e) => setQuickReceivedDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              {/* MRRI No */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  MRRI No
                </label>
                <input
                  type="text"
                  value={quickMrriNo}
                  onChange={(e) => setQuickMrriNo(e.target.value)}
                  placeholder="e.g. MRRI-421"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              {/* Issue No */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Issue No
                </label>
                <input
                  type="text"
                  value={quickIssueNo}
                  onChange={(e) => setQuickIssueNo(e.target.value)}
                  placeholder="e.g. ISS-9840"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReceivingReq(null)}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReceiveDetails}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Submit Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL B: COMPREHENSIVE EDIT MODAL
          ======================================================== */}
      {editingReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-950 dark:text-white text-sm uppercase flex items-center gap-2">
                <Edit2 size={16} className="text-indigo-500" />
                Update Ledger Details
              </h3>
              <button 
                onClick={() => setEditingReq(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Received Date */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Received Date
                </label>
                <input
                  type="date"
                  value={editReceivedDate}
                  onChange={(e) => setEditReceivedDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              {/* MRRI No */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  MRRI No
                </label>
                <input
                  type="text"
                  value={editMrriNo}
                  onChange={(e) => setEditMrriNo(e.target.value)}
                  placeholder="e.g. MRRI-421"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              {/* Issue No */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Issue No
                </label>
                <input
                  type="text"
                  value={editIssueNo}
                  onChange={(e) => setEditIssueNo(e.target.value)}
                  placeholder="e.g. ISS-9840"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Update remarks..."
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingReq(null)}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Save Updates
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
