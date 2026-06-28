import React, { useState } from "react";
import { 
  Users, 
  Settings, 
  Cpu, 
  ShieldAlert, 
  Plus, 
  Logs, 
  Copy, 
  Check, 
  Database,
  Lock,
  Flame,
  Globe,
  Settings2,
  Download,
  Upload
} from "lucide-react";
import { Profile, Machine, AuditLog, UserRole, Buyer } from "../types";

interface AdminModuleProps {
  profiles: Profile[];
  machines: Machine[];
  auditLogs: AuditLog[];
  onUpdateRole: (id: string, role: UserRole) => void;
  onAddMachine: (name: string, type: string) => void;
  schemaDDL: string;
  rlsDDL: string;
  buyers?: Buyer[];
  onAddBuyer?: (name: string) => void;
  onDownloadBuyersCache?: () => void;
  onUploadBuyersCache?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function AdminModule({
  profiles,
  machines,
  auditLogs,
  onUpdateRole,
  onAddMachine,
  schemaDDL,
  rlsDDL,
  buyers = [],
  onAddBuyer,
  onDownloadBuyersCache,
  onUploadBuyersCache
}: AdminModuleProps) {
  // --- Admin Views State ---
  const [activeAdminTab, setActiveAdminTab] = useState<'iam' | 'machines' | 'buyers' | 'logs' | 'ddl'>('iam');

  // New Machine state
  const [newMacName, setNewMacName] = useState("");
  const [newMacType, setNewMacType] = useState("Auto");

  // New Buyer state
  const [newBuyerName, setNewBuyerName] = useState("");

  // Code Copy State helpers
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedRls, setCopiedRls] = useState(false);

  const handleCopy = (text: string, type: 'schema' | 'rls') => {
    navigator.clipboard.writeText(text);
    if (type === 'schema') {
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 1500);
    } else {
      setCopiedRls(true);
      setTimeout(() => setCopiedRls(false), 1500);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm font-sans">
      
      {/* Title & Section Selector */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-5 border-b border-slate-200 dark:border-slate-800 mb-6 gap-4" id="admin-header">
        <div>
          <h2 className="font-sans font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ShieldAlert size={18} className="text-[#2563EB]" /> Operations Control & IAM
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Full system diagnostic access, audits, user clearance rules, and DB bridges.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-850 text-xs font-bold">
          <button
            onClick={() => setActiveAdminTab('iam')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === 'iam' 
                ? 'bg-white dark:bg-slate-900 shadow-xs text-[#2563EB] border border-slate-200 dark:border-slate-800 font-extrabold' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users size={13} /> User IAM
          </button>
          <button
            onClick={() => setActiveAdminTab('machines')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === 'machines' 
                ? 'bg-white dark:bg-slate-900 shadow-xs text-[#2563EB] border border-slate-200 dark:border-slate-800 font-extrabold' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Cpu size={13} /> Machinery
          </button>
          <button
            onClick={() => setActiveAdminTab('buyers')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === 'buyers' 
                ? 'bg-white dark:bg-slate-900 shadow-xs text-[#2563EB] border border-slate-200 dark:border-slate-800 font-extrabold' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Settings2 size={13} /> Buyers
          </button>
          <button
            onClick={() => setActiveAdminTab('logs')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === 'logs' 
                ? 'bg-white dark:bg-slate-900 shadow-xs text-[#2563EB] border border-slate-200 dark:border-slate-800 font-extrabold' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Logs size={13} /> Audit Trail
          </button>
          <button
            onClick={() => setActiveAdminTab('ddl')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === 'ddl' 
                ? 'bg-white dark:bg-slate-900 shadow-xs text-[#2563EB] border border-slate-200 dark:border-slate-800 font-extrabold' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Database size={13} /> DB Schemas
          </button>
        </div>
      </div>

      {/* VIEW A: IAM PROFILES MANAGEMENT */}
      {activeAdminTab === 'iam' && (
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <h3 className="font-sans font-extrabold text-[11px] uppercase tracking-wider text-slate-850 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <Users size={13} className="text-[#2563EB]" /> Identity Access Level Matrix
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Manage factory clearance levels and job scope authorizations securely. The role updates instantly apply Row Level Security (RLS) query restrictions.
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs bg-white dark:bg-transparent shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="p-4 pl-5">Verified Operator Name</th>
                    <th className="p-4">Email Reference</th>
                    <th className="p-4">Department Branch</th>
                    <th className="p-4 text-right pr-5">Assigned Role Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                  {profiles.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                      <td className="p-4 font-extrabold text-slate-800 dark:text-slate-200 pl-5">{p.full_name}</td>
                      <td className="p-4 font-mono text-slate-500">{p.email}</td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">{p.department}</td>
                      <td className="p-4 text-right pr-5">
                        <select
                          value={p.role}
                          onChange={(e) => onUpdateRole(p.id, e.target.value as UserRole)}
                          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-1.5 px-3 font-mono text-[11px] font-bold text-slate-750 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition cursor-pointer shadow-xs"
                        >
                          <option value="operator">OPERATOR</option>
                          <option value="supervisor">OFFICER</option>
                          <option value="manager">MANAGER</option>
                          <option value="admin">ADMIN</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: CUTTING MACHINERY REGISTRY */}
      {activeAdminTab === 'machines' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Add machine panel card */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 text-xs h-fit col-span-1 shadow-xs">
            <h3 className="font-sans font-extrabold text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300">Register New Cutter</h3>
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Machine Label / Name</label>
              <input
                type="text"
                value={newMacName}
                onChange={e => setNewMacName(e.target.value)}
                placeholder="e.g., Auto Cutter Machine 3"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Model Class Feed</label>
              <select
                value={newMacType}
                onChange={e => setNewMacType(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-blue-500 transition outline-none cursor-pointer font-bold shadow-xs"
              >
                <option value="Auto">Auto (CNC Knife/Laser Laser PLC)</option>
                <option value="Manual">Manual (Vertical/Bandknife Manual blade)</option>
              </select>
            </div>

            <button
              onClick={() => {
                if (!newMacName.trim()) return alert("Machine name required.");
                onAddMachine(newMacName.trim(), newMacType);
                setNewMacName("");
              }}
              className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-md"
            >
              <Plus size={14} className="stroke-[2.5]" /> Add Cutting Hardware
            </button>
          </div>

          {/* Machine List Grid */}
          <div className="col-span-2 space-y-4">
            <h3 className="font-sans font-extrabold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Factory Hardware Deck</h3>
            
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs bg-white dark:bg-transparent shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 font-extrabold uppercase tracking-wider text-[10px]">
                      <th className="p-4 pl-5">Cutting Machine Label</th>
                      <th className="p-4">Mechanical Feed Type</th>
                      <th className="p-4 text-right pr-5">Identifier Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                    {machines.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                        <td className="p-4 font-extrabold text-slate-800 dark:text-slate-200 pl-5">{m.machine_name}</td>
                        <td className="p-4">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full text-[10px] uppercase font-extrabold tracking-wider border border-slate-200 dark:border-slate-700">
                            {m.machine_type}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-right text-slate-400 pr-5">{m.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* VIEW E: BUYERS DIRECTORY */}
      {activeAdminTab === 'buyers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Add buyer panel card */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 text-xs h-fit col-span-1 shadow-xs">
            <h3 className="font-sans font-extrabold text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300">Register New Buyer</h3>
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Buyer Name</label>
              <input
                type="text"
                value={newBuyerName}
                onChange={e => setNewBuyerName(e.target.value)}
                placeholder="e.g., NIKE GLOBAL"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs"
              />
            </div>

            <button
              onClick={() => {
                if (!newBuyerName.trim()) return alert("Buyer name required.");
                if (onAddBuyer) {
                  onAddBuyer(newBuyerName.trim().toUpperCase());
                }
                setNewBuyerName("");
              }}
              className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-md"
            >
              <Plus size={14} className="stroke-[2.5]" /> Add Buyer Partner
            </button>

            {/* Backup Cache file card section */}
            {(onDownloadBuyersCache || onUploadBuyersCache) && (
              <div className="border-t border-slate-200/60 dark:border-slate-800 pt-4 space-y-3">
                <h4 className="font-sans font-extrabold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Browser Cache Backup</h4>
                <p className="text-[10px] text-slate-550 dark:text-slate-450 leading-relaxed">
                  Export your active buyers list as a JSON file backup, or upload a previously saved backup file to restore cache and sync.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {onDownloadBuyersCache && (
                    <button
                      onClick={onDownloadBuyersCache}
                      className="w-full py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300/40 dark:border-slate-700/40 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      <Download size={13} className="text-blue-500" /> Export Backup File
                    </button>
                  )}
                  {onUploadBuyersCache && (
                    <label
                      className="w-full py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300/40 dark:border-slate-700/40 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      <Upload size={13} className="text-emerald-500" /> Import Backup File
                      <input
                        type="file"
                        accept=".json"
                        onChange={onUploadBuyersCache}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Buyers List Grid */}
          <div className="col-span-2 space-y-4">
            <h3 className="font-sans font-extrabold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Buyer Partners Directory</h3>
            
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs bg-white dark:bg-transparent shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 font-extrabold uppercase tracking-wider text-[10px]">
                      <th className="p-4 pl-5">Buyer Company Name</th>
                      <th className="p-4 text-right pr-5">Identifier Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                    {buyers.map(b => (
                      <tr key={b.id || b.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                        <td className="p-4 font-extrabold text-slate-800 dark:text-slate-200 pl-5">{b.name}</td>
                        <td className="p-4 font-mono text-right text-slate-400 pr-5">{b.id || 'Fallback Local'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* VIEW C: SYSTEM AUDIT LOGGER */}
      {activeAdminTab === 'logs' && (
        <div className="space-y-4 font-sans">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-200 font-sans uppercase tracking-wider text-[10px] font-extrabold">
            <span>Tracking system audits logs for verification audits</span>
            <span className="font-extrabold text-slate-700 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">{auditLogs.length} logs</span>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">Audit registries are empty.</div>
            ) : (
              auditLogs.map(log => {
                const badgeColor = 
                  log.action === 'create' ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-450 dark:bg-emerald-950/20 dark:border-emerald-900' :
                  log.action === 'edit' ? 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-450 dark:bg-blue-950/20 dark:border-blue-900' :
                  log.action === 'approve' ? 'text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-450 dark:bg-cyan-950/20 dark:border-cyan-900' :
                  'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-450 dark:bg-rose-950/20 dark:border-rose-900';

                return (
                  <div key={log.id} className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 rounded-2xl space-y-3 text-xs font-mono shadow-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                       <div className="flex items-center space-x-2.5">
                         <span className={`px-2.5 py-0.5 rounded-md text-[9px] uppercase font-black border tracking-wider ${badgeColor}`}>
                           {log.action}
                         </span>
                         <strong className="text-slate-800 dark:text-slate-200 font-extrabold">{log.user_email}</strong>
                         <span className="text-slate-400">acted on</span>
                         <span className="bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border border-slate-200 dark:border-slate-700">{log.entity_type} ({log.entity_id})</span>
                       </div>
                       <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{new Date(log.created_at).toLocaleString()}</span>
                    </div>

                    {(log.old_value || log.new_value) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] bg-slate-100/55 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-850 leading-relaxed max-w-full overflow-hidden">
                        {log.old_value && (
                          <div className="overflow-hidden">
                            <span className="text-rose-600 font-extrabold block mb-1.5 text-[10px] uppercase tracking-wider">(-) Old values:</span>
                            <pre className="overflow-x-auto text-slate-500 dark:text-slate-400 select-all font-mono whitespace-pre-wrap">{JSON.stringify(JSON.parse(log.old_value), null, 2)}</pre>
                          </div>
                        )}
                        {log.new_value && (
                          <div className="overflow-hidden">
                            <span className="text-emerald-600 font-extrabold block mb-1.5 text-[10px] uppercase tracking-wider">(+) New values:</span>
                            <pre className="overflow-x-auto text-slate-500 dark:text-slate-400 select-all font-mono whitespace-pre-wrap">{JSON.stringify(JSON.parse(log.new_value), null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW D: PRODUCTION SUPABASE SCHEMAS & RLS DDL BRIDGES */}
      {activeAdminTab === 'ddl' && (
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl text-xs space-y-2 leading-relaxed">
            <h4 className="font-extrabold text-slate-850 dark:text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Database size={13} className="text-[#2563EB]" /> Production Ready Supabase SQL Schemas
            </h4>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              This system replicates full row level security (RLS) constraints. You can run these actual SQL migrations on your live Supabase project to replicate this environment in production!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs font-mono">
            
            {/* SCHEMA DDL CODE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                <span className="flex items-center gap-1"><Logs size={11} className="text-blue-500" /> 1_schema_migrations.sql</span>
                <button
                  onClick={() => handleCopy(schemaDDL, 'schema')}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-300 dark:border-slate-700 text-[10px] rounded-xl flex items-center gap-1 cursor-pointer tracking-wider uppercase font-black shadow-xs transition"
                >
                  {copiedSchema ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  {copiedSchema ? "Copied" : "Copy SQL"}
                </button>
              </div>
              <textarea
                value={schemaDDL}
                readOnly
                rows={12}
                className="w-full bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl p-4.5 focus:outline-none focus:ring-2 focus:ring-blue-500 select-all h-[340px] font-mono text-[11px] shadow-xs"
              />
            </div>

            {/* RLS DDL CODE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                <span className="flex items-center gap-1"><Lock size={11} className="text-blue-500" /> 2_rls_security_rules.sql</span>
                <button
                  onClick={() => handleCopy(rlsDDL, 'rls')}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-300 dark:border-slate-700 text-[10px] rounded-xl flex items-center gap-1 cursor-pointer tracking-wider uppercase font-black shadow-xs transition"
                >
                  {copiedRls ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  {copiedRls ? "Copied" : "Copy SQL"}
                </button>
              </div>
              <textarea
                value={rlsDDL}
                readOnly
                rows={12}
                className="w-full bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl p-4.5 focus:outline-none focus:ring-2 focus:ring-blue-500 select-all h-[340px] font-mono text-[11px] shadow-xs"
              />
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
