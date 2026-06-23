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
  Settings2
} from "lucide-react";
import { Profile, Machine, AuditLog, UserRole } from "../types";

interface AdminModuleProps {
  profiles: Profile[];
  machines: Machine[];
  auditLogs: AuditLog[];
  onUpdateRole: (id: string, role: UserRole) => void;
  onAddMachine: (name: string, type: string) => void;
  schemaDDL: string;
  rlsDDL: string;
}

export default function AdminModule({
  profiles,
  machines,
  auditLogs,
  onUpdateRole,
  onAddMachine,
  schemaDDL,
  rlsDDL
}: AdminModuleProps) {
  // --- Admin Views State ---
  const [activeAdminTab, setActiveAdminTab] = useState<'iam' | 'machines' | 'logs' | 'ddl'>('iam');

  // New Machine state
  const [newMacName, setNewMacName] = useState("");
  const [newMacType, setNewMacType] = useState("Auto");

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
    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
      
      {/* Title & Section Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/50 mb-6 gap-4" id="admin-header">
        <div>
          <h2 className="font-sans font-bold text-sm uppercase tracking-widest text-slate-800 flex items-center gap-2">
            <ShieldAlert size={16} className="text-slate-600" /> Operations Control & IAM
          </h2>
          <p className="text-xs text-slate-500 mt-1">Full system diagnostic access, audits, user clearance rules, and DB bridges.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap items-center bg-slate-50 p-1.5 rounded-xl border border-slate-100 text-xs font-semibold">
          <button
            onClick={() => setActiveAdminTab('iam')}
            className={`px-3 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === 'iam' ? 'bg-white shadow-xs text-slate-800 border border-slate-100' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users size={12} /> User IAM
          </button>
          <button
            onClick={() => setActiveAdminTab('machines')}
            className={`px-3 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === 'machines' ? 'bg-white shadow-xs text-slate-800 border border-slate-100' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Cpu size={12} /> Machinery
          </button>
          <button
            onClick={() => setActiveAdminTab('logs')}
            className={`px-3 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === 'logs' ? 'bg-white shadow-xs text-slate-800 border border-slate-100' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Logs size={12} /> Audit Trail
          </button>
          <button
            onClick={() => setActiveAdminTab('ddl')}
            className={`px-3 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === 'ddl' ? 'bg-white shadow-xs text-slate-800 border border-slate-100' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Database size={12} /> DB Schemas
          </button>
        </div>
      </div>

      {/* VIEW A: IAM PROFILES MANAGEMENT */}
      {activeAdminTab === 'iam' && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
            <h3 className="font-sans font-semibold text-[11px] uppercase tracking-wider text-slate-900 mb-1 flex items-center gap-1.5">
              <Users size={12} /> Identity Access Level Matrix
            </h3>
            <p className="text-slate-500 dark:text-slate-400">Manage factory clearance levels and job scope authorizations securely. The role updates instantly apply Row Level Security (RLS) query restrictions.</p>
          </div>

          <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden text-xs bg-white dark:bg-transparent">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/30 dark:bg-slate-950 text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Verified Operator Name</th>
                  <th className="p-3">Email Reference</th>
                  <th className="p-3">Department Branch</th>
                  <th className="p-3 text-right">Assigned Role Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                {profiles.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-200">{p.full_name}</td>
                    <td className="p-3 font-mono text-slate-400">{p.email}</td>
                    <td className="p-3 text-slate-400 dark:text-slate-500">{p.department}</td>
                    <td className="p-3 select-none text-right">
                      <select
                        value={p.role}
                        onChange={(e) => onUpdateRole(p.id, e.target.value as UserRole)}
                        className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 font-mono text-[11px] font-semibold text-slate-700 focus:ring-1 focus:ring-slate-905 focus:outline-none transition"
                      >
                        <option value="operator">OPERATOR</option>
                        <option value="supervisor">SUPERVISOR</option>
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
      )}

      {/* VIEW B: CUTTING MACHINERY REGISTRY */}
      {activeAdminTab === 'machines' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Add machine panel card */}
          <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-xl p-5 space-y-4 text-xs h-fit col-span-1">
            <h3 className="font-sans font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400">Register New Cutter</h3>
            <div>
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Machine Label / Name</label>
              <input
                type="text"
                value={newMacName}
                onChange={e => setNewMacName(e.target.value)}
                placeholder="e.g., Auto Cutter Machine 3"
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 outline-none focus:ring-1 focus:ring-slate-950 focus:border-slate-950 transition"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Model Class Feed</label>
              <select
                value={newMacType}
                onChange={e => setNewMacType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2 focus:ring-1 focus:ring-slate-950 focus:border-slate-950 transition outline-none cursor-pointer"
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
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer focus:ring-2 focus:ring-slate-950"
            >
              <Plus size={14} /> Add Cutting Hardware
            </button>
          </div>

          {/* Machine List Grid */}
          <div className="col-span-2 space-y-4">
            <h3 className="font-sans font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Factory Hardware Deck</h3>
            
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden text-xs bg-white dark:bg-transparent">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-100/30 dark:bg-slate-950 text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3">Cutting Machine Label</th>
                    <th className="p-3">Mechanical Feed Type</th>
                    <th className="p-3 text-right">Identifier Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                  {machines.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="p-3 font-bold text-slate-700 dark:text-slate-200">{m.machine_name}</td>
                      <td className="p-3"><span className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-lg text-[9px] uppercase font-bold tracking-wider">{m.machine_type}</span></td>
                      <td className="p-3 font-mono text-right text-slate-400 dark:text-slate-500">{m.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* VIEW C: SYSTEM AUDIT LOGGER */}
      {activeAdminTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-100 font-sans uppercase tracking-wider text-[10px] font-bold">
            <span>Tracking system audits logs for verification audits</span>
            <span className="font-bold text-slate-705 font-mono">{auditLogs.length} logs</span>
          </div>

          <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">Audit registries are empty.</div>
            ) : (
              auditLogs.map(log => {
                const badgeColor = 
                  log.action === 'create' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/10' :
                  log.action === 'edit' ? 'text-slate-600 bg-slate-100 border-slate-200' :
                  log.action === 'approve' ? 'text-cyan-500 bg-cyan-500/10 border-cyan-500/10' :
                  'text-rose-500 bg-rose-500/10 border-rose-500/10';

                return (
                  <div key={log.id} className="p-3.5 border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/10 rounded-xl space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                       <div className="flex items-center space-x-2">
                         <span className={`px-2 py-0.5 rounded-lg text-[9px] uppercase font-bold border ${badgeColor}`}>
                           {log.action}
                         </span>
                         <strong className="text-slate-700 dark:text-slate-200">{log.user_email}</strong>
                         <span className="text-slate-400">acted on</span>
                         <span className="bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg text-[10px] font-semibold">{log.entity_type} ({log.entity_id})</span>
                       </div>
                       <span className="text-slate-450 text-[10px] text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                    </div>

                    {(log.old_value || log.new_value) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] bg-slate-150-dense bg-slate-100/50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800/60 leading-relaxed max-w-full overflow-hidden">
                        {log.old_value && (
                          <div className="overflow-hidden">
                            <span className="text-rose-500 font-bold block mb-1">(-) Old values:</span>
                            <pre className="overflow-x-auto text-slate-400 select-all font-mono whitespace-pre-wrap">{JSON.stringify(JSON.parse(log.old_value), null, 2)}</pre>
                          </div>
                        )}
                        {log.new_value && (
                          <div className="overflow-hidden">
                            <span className="text-emerald-500 font-bold block mb-1">(+) New values:</span>
                            <pre className="overflow-x-auto text-slate-400 select-all font-mono whitespace-pre-wrap">{JSON.stringify(JSON.parse(log.new_value), null, 2)}</pre>
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
          <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-xl text-xs space-y-1.5 leading-relaxed">
            <h4 className="font-bold text-slate-900 uppercase tracking-widest text-[9px] flex items-center gap-1.5">
              <Database size={13} /> Production Ready Supabase SQL Schemas
            </h4>
            <p className="text-slate-500 dark:text-slate-400">
              This system replicates full row level security (RLS) constraints. You can run these actual SQL migrations on your live Supabase project to replicate this environment in production!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs font-mono">
            
            {/* SCHEMA DDL CODE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                <span className="flex items-center gap-1"><Logs size={11} /> 1_schema_migrations.sql</span>
                <button
                  onClick={() => handleCopy(schemaDDL, 'schema')}
                  className="px-2.5 py-1.1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 border border-slate-200 dark:border-slate-800/80 text-[9px] rounded-lg flex items-center gap-1 cursor-pointer tracking-wider uppercase font-bold"
                >
                  {copiedSchema ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  {copiedSchema ? "Copied" : "Copy SQL"}
                </button>
              </div>
              <textarea
                value={schemaDDL}
                readOnly
                rows={12}
                className="w-full bg-slate-50 border border-slate-200 text-slate-600 rounded-xl p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-950 select-all h-[320px] font-mono text-[10.5px]"
              />
            </div>

            {/* RLS DDL CODE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                <span className="flex items-center gap-1"><Lock size={11} /> 2_rls_security_rules.sql</span>
                <button
                  onClick={() => handleCopy(rlsDDL, 'rls')}
                  className="px-2.5 py-1.1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 border border-slate-200 dark:border-slate-800/80 text-[9px] rounded-lg flex items-center gap-1 cursor-pointer tracking-wider uppercase font-bold"
                >
                  {copiedRls ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  {copiedRls ? "Copied" : "Copy SQL"}
                </button>
              </div>
              <textarea
                value={rlsDDL}
                readOnly
                rows={12}
                className="w-full bg-slate-50 border border-slate-200 text-slate-600 rounded-xl p-3.5 focus:outline-none focus:ring-1 focus:ring-slate-950 select-all h-[320px] font-mono text-[10.5px]"
              />
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
