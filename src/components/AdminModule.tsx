import React, { useState } from "react";
import { formatDateTime } from "../utils/dateUtils";
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
  Upload,
  UserPlus,
  Megaphone,
  Camera,
  ImagePlus,
  X,
  Coins,
  AlertTriangle
} from "lucide-react";
import { Profile, Machine, AuditLog, UserRole, Buyer } from "../types";

interface AdminModuleProps {
  profiles: Profile[];
  machines: Machine[];
  auditLogs: AuditLog[];
  onUpdateRole: (id: string, role: UserRole) => void;
  onUpdateAvatar?: (id: string, avatarUrl: string) => Promise<void>;
  onUpdatePermissions?: (
    id: string, 
    can_access_cutting_entry: boolean, 
    can_access_remnant_entry: boolean, 
    can_access_heat_seal_entry: boolean,
    can_access_poly_entry: boolean
  ) => Promise<void>;
  onAddMachine: (name: string, type: string) => void;
  schemaDDL: string;
  rlsDDL: string;
  buyers?: Buyer[];
  onAddBuyer?: (name: string) => void;
  onDownloadBuyersCache?: () => void;
  onUploadBuyersCache?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  jobNoDigits?: number;
  onUpdateJobNoDigits?: (digits: number) => void;
  isPoNumberRequired?: boolean;
  onUpdatePoRequired?: (required: boolean) => void;
  onAddUser?: (user: { email: string; password: string; full_name: string; role: UserRole; department: string }) => Promise<{ success: boolean; error?: string }>;
  whatsNewTitle?: string;
  whatsNewContent?: string;
  whatsNewUpdatedAt?: string;
  onUpdateWhatsNew?: (title: string, content: string) => Promise<void>;
  polyPrice?: number;
  onUpdatePolyPrice?: (price: number) => Promise<void>;
}

export default function AdminModule({
  profiles,
  machines,
  auditLogs,
  onUpdateRole,
  onUpdateAvatar,
  onUpdatePermissions,
  onAddMachine,
  schemaDDL,
  rlsDDL,
  buyers = [],
  onAddBuyer,
  onDownloadBuyersCache,
  onUploadBuyersCache,
  jobNoDigits = 7,
  onUpdateJobNoDigits,
  isPoNumberRequired = false,
  onUpdatePoRequired,
  onAddUser,
  whatsNewTitle = "",
  whatsNewContent = "",
  whatsNewUpdatedAt = "",
  onUpdateWhatsNew,
  polyPrice = 1.50,
  onUpdatePolyPrice
}: AdminModuleProps) {
  // --- Admin Views State ---
  const [activeAdminTab, setActiveAdminTab] = useState<'iam' | 'machines' | 'buyers' | 'settings' | 'logs' | 'ddl'>('iam');

  const [localDigits, setLocalDigits] = useState(jobNoDigits);
  const [isSaving, setIsSaving] = useState(false);

  // Poly Price States
  const [localPolyPrice, setLocalPolyPrice] = useState(String(polyPrice));
  const [isSavingPolyPrice, setIsSavingPolyPrice] = useState(false);

  // Whats New Editor States
  const [localTitle, setLocalTitle] = useState(whatsNewTitle);
  const [localContent, setLocalContent] = useState(whatsNewContent);
  const [isSavingWhatsNew, setIsSavingWhatsNew] = useState(false);

  React.useEffect(() => {
    setLocalPolyPrice(String(polyPrice));
  }, [polyPrice]);

  React.useEffect(() => {
    setLocalTitle(whatsNewTitle);
  }, [whatsNewTitle]);

  React.useEffect(() => {
    setLocalContent(whatsNewContent);
  }, [whatsNewContent]);

  // Profile picture editor states
  const [selectedProfileForAvatar, setSelectedProfileForAvatar] = useState<Profile | null>(null);
  const [avatarInputType, setAvatarInputType] = useState<'url' | 'file'>('url');
  const [avatarUrlInputValue, setAvatarUrlInputValue] = useState('');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Direct User Creation States
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("operator");
  const [newUserDept, setNewUserDept] = useState("Cutting Deck 1");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userCreationError, setUserCreationError] = useState<string | null>(null);
  const [userCreationSuccess, setUserCreationSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    setLocalDigits(jobNoDigits);
  }, [jobNoDigits]);

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddUser) return;
    if (!newUserFullName.trim() || !newUserEmail.trim() || !newUserPassword.trim() || !newUserDept.trim()) {
      setUserCreationError("All fields are required to register a new user.");
      return;
    }

    setIsCreatingUser(true);
    setUserCreationError(null);
    setUserCreationSuccess(null);

    try {
      const result = await onAddUser({
        email: newUserEmail.trim(),
        password: newUserPassword,
        full_name: newUserFullName.trim(),
        role: newUserRole,
        department: newUserDept.trim()
      });

      if (result.success) {
        setUserCreationSuccess(`Successfully registered operator account for: ${newUserFullName.trim()}`);
        setNewUserFullName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserRole("operator");
        setNewUserDept("Cutting Deck 1");
      } else {
        setUserCreationError(result.error || "Failed to register user account.");
      }
    } catch (err: any) {
      setUserCreationError(err.message || "An unexpected error occurred.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!onUpdateJobNoDigits) return;
    setIsSaving(true);
    try {
      await onUpdateJobNoDigits(localDigits);
    } catch (err: any) {
      alert("Error persisting settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // New Machine state
  const [newMacName, setNewMacName] = useState("");
  const [newMacType, setNewMacType] = useState("Auto");

  // New Buyer state
  const [newBuyerName, setNewBuyerName] = useState("");

  // Code Copy State helpers
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedRls, setCopiedRls] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

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
            onClick={() => setActiveAdminTab('settings')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === 'settings' 
                ? 'bg-white dark:bg-slate-900 shadow-xs text-[#2563EB] border border-slate-200 dark:border-slate-800 font-extrabold' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Settings size={13} /> System Settings
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Direct Create User Card Column 1 */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 text-xs h-fit col-span-1 shadow-xs">
            <h3 className="font-sans font-extrabold text-[11px] uppercase tracking-wider text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
              <UserPlus size={13} className="text-[#2563EB]" /> Register New Staff Member
            </h3>

            {userCreationError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-900 rounded-xl text-rose-600 dark:text-rose-400 font-medium">
                {userCreationError}
              </div>
            )}

            {userCreationSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 rounded-xl text-emerald-600 dark:text-emerald-400 font-medium">
                {userCreationSuccess}
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Verified Operator Name</label>
                <input
                  type="text"
                  required
                  value={newUserFullName}
                  onChange={e => setNewUserFullName(e.target.value)}
                  placeholder="e.g. JOHN DOE"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Email Reference</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="e.g. john@factory.com"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Password Access Code</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Department / Shift Station</label>
                <input
                  type="text"
                  required
                  value={newUserDept}
                  onChange={e => setNewUserDept(e.target.value)}
                  placeholder="e.g. Cutting Deck 1"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Assigned Role Check</label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as UserRole)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3.5 focus:ring-2 focus:ring-blue-500 transition outline-none cursor-pointer font-bold shadow-xs text-slate-800 dark:text-slate-200"
                >
                  <option value="operator">OPERATOR</option>
                  <option value="supervisor">OFFICER</option>
                  <option value="manager">MANAGER</option>
                  <option value="admin">ADMIN</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isCreatingUser}
                className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-2"
              >
                {isCreatingUser ? (
                  <span>Registering...</span>
                ) : (
                  <>
                    <Plus size={14} className="stroke-[2.5]" /> Create Account
                  </>
                )}
              </button>
            </form>
          </div>

          {/* List and Details Column 2 & 3 */}
          <div className="col-span-2 space-y-4">
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
                      <th className="p-4">Email & Branch</th>
                      <th className="p-4 text-center">Entry Permissions</th>
                      <th className="p-4 text-right pr-5">Assigned Role Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                    {profiles.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                        <td className="p-4 pl-5">
                          <div className="flex items-center gap-3">
                            {/* Profile Picture / Avatar representation */}
                            <div className="relative group/avatar cursor-pointer shrink-0" onClick={() => setSelectedProfileForAvatar(p)}>
                              {p.avatar_url ? (
                                <img
                                  src={p.avatar_url}
                                  alt={p.full_name}
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center text-xs font-black uppercase border border-slate-200/80 dark:border-slate-800">
                                  {p.full_name.slice(0, 2)}
                                </div>
                              )}
                              {/* Hover Edit Overlay overlay button */}
                              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition duration-200">
                                <Camera size={13} className="stroke-[2.5]" />
                              </div>
                            </div>

                            <div>
                              <div className="font-extrabold text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                                <span>{p.full_name}</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedProfileForAvatar(p)}
                                  title="Edit Photo"
                                  className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer p-0.5 rounded"
                                >
                                  <ImagePlus size={11} />
                                </button>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">ID: {p.id.substring(0, 8)}...</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-slate-500 block">{p.email}</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{p.department}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-650 dark:text-slate-300 select-none" title="Allow/deny access to Cutting entries form">
                              <input 
                                type="checkbox"
                                checked={p.can_access_cutting_entry !== false}
                                onChange={(e) => {
                                  if (onUpdatePermissions) {
                                    onUpdatePermissions(
                                      p.id, 
                                      e.target.checked, 
                                      p.can_access_remnant_entry !== false,
                                      p.can_access_heat_seal_entry !== false,
                                      p.can_access_poly_entry !== false
                                    );
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="text-[10px] font-extrabold uppercase tracking-wider">Cutting Form</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-650 dark:text-slate-300 select-none" title="Allow/deny access to Remnant Entry form">
                              <input 
                                type="checkbox"
                                checked={p.can_access_remnant_entry !== false}
                                onChange={(e) => {
                                  if (onUpdatePermissions) {
                                    onUpdatePermissions(
                                      p.id, 
                                      p.can_access_cutting_entry !== false, 
                                      e.target.checked,
                                      p.can_access_heat_seal_entry !== false,
                                      p.can_access_poly_entry !== false
                                    );
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="text-[10px] font-extrabold uppercase tracking-wider">Remnant Form</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-650 dark:text-slate-300 select-none" title="Allow/deny access to Heat Seal Entry form">
                              <input 
                                type="checkbox"
                                checked={p.can_access_heat_seal_entry !== false}
                                onChange={(e) => {
                                  if (onUpdatePermissions) {
                                    onUpdatePermissions(
                                      p.id, 
                                      p.can_access_cutting_entry !== false, 
                                      p.can_access_remnant_entry !== false,
                                      e.target.checked,
                                      p.can_access_poly_entry !== false
                                    );
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="text-[10px] font-extrabold uppercase tracking-wider">Heat Seal</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-650 dark:text-slate-300 select-none" title="Allow/deny access to Poly Tracking form">
                              <input 
                                type="checkbox"
                                checked={p.can_access_poly_entry !== false}
                                onChange={(e) => {
                                  if (onUpdatePermissions) {
                                    onUpdatePermissions(
                                      p.id, 
                                      p.can_access_cutting_entry !== false, 
                                      p.can_access_remnant_entry !== false,
                                      p.can_access_heat_seal_entry !== false,
                                      e.target.checked
                                    );
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="text-[10px] font-extrabold uppercase tracking-wider">Poly Tracking</span>
                            </label>
                          </div>
                        </td>
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
                       <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{formatDateTime(log.created_at)}</span>
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

      {/* VIEW S: SYSTEM SETTINGS */}
      {activeAdminTab === 'settings' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-850">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Settings size={16} className="text-[#2563EB]" /> Job Number Digit Control
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mb-6 font-medium">
              Configure the exact length of the Job Order No required for cutting entry submissions system-wide.
              Increasing or decreasing this setting will dynamically enforce validation checks for all new entries, updates, and bulk imports.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs max-w-md">
              <div className="flex-1">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Required Digits</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setLocalDigits(prev => Math.max(1, prev - 1))}
                    disabled={localDigits <= 1}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 transition-all font-black disabled:opacity-40 disabled:cursor-not-allowed text-lg"
                  >
                    -
                  </button>
                  <span className="text-2xl font-black text-slate-800 dark:text-slate-100 w-12 text-center">
                    {localDigits}
                  </span>
                  <button
                    onClick={() => setLocalDigits(prev => Math.min(20, prev + 1))}
                    disabled={localDigits >= 20}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 transition-all font-black disabled:opacity-40 disabled:cursor-not-allowed text-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex-1 w-full border-t sm:border-t-0 sm:border-l border-slate-150 dark:border-slate-800 pt-4 sm:pt-0 sm:pl-6">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Format Example</span>
                <span className="font-mono text-xs font-extrabold text-[#2563EB] tracking-widest block bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850">
                  {"9".repeat(localDigits)}
                </span>
                <span className="text-[9px] text-slate-400 mt-1 block">Exactly {localDigits} numeric characters only.</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSaving ? "Saving Configuration..." : "Save Configuration"}
              </button>
              {localDigits !== jobNoDigits && (
                <span className="text-xs text-amber-500 font-semibold animate-pulse">
                  You have unsaved adjustments.
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-850">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Settings size={16} className="text-[#2563EB]" /> Data Entry Requirements
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mb-6 font-medium">
              Toggle mandatory field requirements for the cutting entry form.
            </p>

            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs max-w-md">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Require PO Number</span>
              <button
                onClick={() => onUpdatePoRequired?.(!isPoNumberRequired)}
                className={`w-12 h-6 rounded-full transition-all ${isPoNumberRequired ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${isPoNumberRequired ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Poly Price Financial Rate Configuration */}
          <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-850">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Coins size={16} className="text-emerald-600 dark:text-emerald-400" /> Poly Re-Use Financial Metrics Setting
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mb-6 font-medium">
              Configure the assigned price value of a re-used poly bag. This value is used to calculate the saved money metrics inside the Daily Poly Received and Re-Use module.
              <span className="block mt-1 font-bold text-slate-700 dark:text-slate-300">Saved Money = Re-used Poly Bags × Assigned Price Rate</span>
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs max-w-md">
              <div className="flex-1 w-full">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Assigned Price Per Bag (BDT ৳)</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={localPolyPrice}
                    onChange={e => setLocalPolyPrice(e.target.value)}
                    placeholder="1.50"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-xs text-slate-850 dark:text-slate-100 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={async () => {
                  const parsed = parseFloat(localPolyPrice);
                  if (isNaN(parsed) || parsed < 0) {
                    alert("Please enter a valid non-negative price value.");
                    return;
                  }
                  setIsSavingPolyPrice(true);
                  try {
                    await onUpdatePolyPrice?.(parsed);
                    alert("Poly bag price setting updated successfully.");
                  } catch (err: any) {
                    alert("Failed to update poly price: " + err.message);
                  } finally {
                    setIsSavingPolyPrice(false);
                  }
                }}
                disabled={isSavingPolyPrice}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSavingPolyPrice ? "Saving Price..." : "Save Price Rate"}
              </button>
              {localPolyPrice !== String(polyPrice) && (
                <span className="text-xs text-amber-500 font-semibold animate-pulse">
                  Unsaved price adjustments.
                </span>
              )}
            </div>
          </div>

          {/* Whats New Announcement Card */}
          <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-850">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Megaphone size={16} className="text-[#2563EB]" /> "What's New" Launcher Broadcast
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mb-6 font-medium">
              Compose a custom announcement to display automatically to all users upon launching the application. Use this to notify staff of feature releases, shift updates, or procedural changes.
            </p>

            <div className="space-y-4 max-w-2xl bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Announcement Title</label>
                <input
                  type="text"
                  value={localTitle}
                  onChange={e => setLocalTitle(e.target.value)}
                  placeholder="e.g. Version 2.0 - Auto-calculations & Stripe Fabric Support"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs text-slate-850 dark:text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Announcement Content / Release Notes</label>
                <textarea
                  value={localContent}
                  onChange={e => setLocalContent(e.target.value)}
                  rows={5}
                  placeholder="Write the release notes or announcements here..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3.5 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs text-slate-800 dark:text-slate-200 text-xs font-sans"
                />
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 pt-2 text-xs font-semibold">
                <span className="text-slate-400">Status:</span>
                {whatsNewTitle ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black">
                    🟢 Active Broadcast
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black">
                    ⚪ Inactive
                  </span>
                )}
                {whatsNewUpdatedAt && (
                  <span className="text-[10px] text-slate-400 font-mono font-medium ml-auto">
                    Published: {formatDateTime(whatsNewUpdatedAt)}
                  </span>
                )}
              </div>

              <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex flex-wrap items-center gap-3">
                <button
                  onClick={async () => {
                    if (!onUpdateWhatsNew) return;
                    setIsSavingWhatsNew(true);
                    try {
                      await onUpdateWhatsNew(localTitle, localContent);
                    } catch (err: any) {
                      alert("Error updating announcement: " + err.message);
                    } finally {
                      setIsSavingWhatsNew(false);
                    }
                  }}
                  disabled={isSavingWhatsNew || (!localTitle.trim() && (localTitle !== whatsNewTitle || localContent !== whatsNewContent))}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-40"
                >
                  {isSavingWhatsNew ? "Publishing..." : "Publish Announcement"}
                </button>

                {whatsNewTitle && (
                  <button
                    onClick={() => {
                      if (!onUpdateWhatsNew) return;
                      setConfirmDialog({
                        isOpen: true,
                        title: "Clear Announcement",
                        message: "Are you sure you want to clear and disable the active launcher announcement?",
                        onConfirm: async () => {
                          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                          setIsSavingWhatsNew(true);
                          try {
                            await onUpdateWhatsNew("", "");
                            setLocalTitle("");
                            setLocalContent("");
                          } catch (err: any) {
                            alert("Error clearing announcement: " + err.message);
                          } finally {
                            setIsSavingWhatsNew(false);
                          }
                        }
                      });
                    }}
                    disabled={isSavingWhatsNew}
                    className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    Clear Announcement
                  </button>
                )}

                {(localTitle !== whatsNewTitle || localContent !== whatsNewContent) && (
                  <span className="text-[11px] text-amber-500 font-bold animate-pulse ml-auto">
                    Unpublished changes detected
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PROFILE AVATAR EDITOR MODAL --- */}
      {selectedProfileForAvatar && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full text-xs space-y-6 shadow-2xl relative animate-fade-in">
            
            <button
              onClick={() => {
                setSelectedProfileForAvatar(null);
                setAvatarUrlInputValue('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="space-y-1.5 pr-8">
              <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest block font-sans">
                Admin Management Tool
              </span>
              <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                Update Profile Picture
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Configure avatar image for <span className="font-bold text-slate-800 dark:text-slate-200">{selectedProfileForAvatar.full_name}</span> ({selectedProfileForAvatar.email}).
              </p>
            </div>

            {/* Quick Preview Area */}
            <div className="flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-800 gap-3">
              <div className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Live Preview</div>
              <div className="relative">
                {avatarUrlInputValue || selectedProfileForAvatar.avatar_url ? (
                  <img
                    src={avatarUrlInputValue || selectedProfileForAvatar.avatar_url}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = "https://placehold.co/150x150/e2e8f0/475569?text=Invalid+Image";
                    }}
                    className="w-24 h-24 rounded-full object-cover border-2 border-blue-500 shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center text-3xl font-black uppercase border-2 border-slate-200 dark:border-slate-800">
                    {selectedProfileForAvatar.full_name.slice(0, 2)}
                  </div>
                )}
              </div>
            </div>

            {/* Selector Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-850">
              <button
                type="button"
                onClick={() => setAvatarInputType('url')}
                className={`flex-1 py-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  avatarInputType === 'url'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                Direct Web URL
              </button>
              <button
                type="button"
                onClick={() => setAvatarInputType('file')}
                className={`flex-1 py-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  avatarInputType === 'file'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                Local Image Upload
              </button>
            </div>

            {/* Inputs Block */}
            {avatarInputType === 'url' ? (
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Web Image Destination Link
                </label>
                <input
                  type="url"
                  value={avatarUrlInputValue}
                  onChange={(e) => setAvatarUrlInputValue(e.target.value)}
                  placeholder="Paste URL (e.g. https://images.unsplash.com/...)"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3.5 font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs text-xs text-slate-800 dark:text-slate-100 font-mono"
                />
                <span className="text-[10px] text-slate-400 block leading-relaxed font-medium">
                  Provide an absolute HTTP/HTTPS URL path pointing directly to an image asset.
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Select or Drop Image
                </label>
                
                {/* Drag & Drop Area */}
                <div
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      if (!file.type.startsWith('image/')) {
                        alert('Only image files are allowed.');
                        return;
                      }
                      if (file.size > 2 * 1024 * 1024) {
                        alert('File exceeds 2MB limit. Please select a smaller image.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result && typeof event.target.result === 'string') {
                          setAvatarUrlInputValue(event.target.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className={`w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition gap-2 ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/20'
                  }`}
                >
                  <Upload size={24} className="text-slate-400 dark:text-slate-500 mb-1" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">
                    Drag and drop your image file here
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    Supports JPG, PNG, WEBP, GIF (Max size 2MB)
                  </p>
                  
                  <label className="mt-2 px-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black cursor-pointer shadow-xs transition">
                    Browse File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          if (file.size > 2 * 1024 * 1024) {
                            alert('File exceeds 2MB limit. Please select a smaller image.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result && typeof event.target.result === 'string') {
                              setAvatarUrlInputValue(event.target.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
              {selectedProfileForAvatar.avatar_url && (
                <button
                  type="button"
                  onClick={() => {
                    if (!onUpdateAvatar) return;
                    setConfirmDialog({
                      isOpen: true,
                      title: "Remove Avatar",
                      message: "Remove profile picture for this user?",
                      onConfirm: async () => {
                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                        setIsSavingAvatar(true);
                        try {
                          await onUpdateAvatar(selectedProfileForAvatar.id, "");
                          setSelectedProfileForAvatar(null);
                          setAvatarUrlInputValue('');
                        } catch (err: any) {
                          alert("Failed to remove avatar: " + err.message);
                        } finally {
                          setIsSavingAvatar(false);
                        }
                      }
                    });
                  }}
                  disabled={isSavingAvatar}
                  className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-rose-200 dark:border-rose-950/50 hover:border-rose-300 text-rose-600 dark:text-rose-400 rounded-xl transition font-bold text-[11px] flex items-center gap-1 shadow-sm cursor-pointer mr-auto"
                >
                  Remove Picture
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedProfileForAvatar(null);
                  setAvatarUrlInputValue('');
                }}
                className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition font-bold text-[11px] cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={async () => {
                  if (!onUpdateAvatar) return;
                  if (!avatarUrlInputValue.trim() && avatarUrlInputValue !== selectedProfileForAvatar.avatar_url) {
                    alert("Please specify a valid picture source.");
                    return;
                  }
                  setIsSavingAvatar(true);
                  try {
                    await onUpdateAvatar(selectedProfileForAvatar.id, avatarUrlInputValue.trim());
                    setSelectedProfileForAvatar(null);
                    setAvatarUrlInputValue('');
                  } catch (err: any) {
                    alert("Error saving profile picture: " + err.message);
                  } finally {
                    setIsSavingAvatar(false);
                  }
                }}
                disabled={isSavingAvatar || (!avatarUrlInputValue.trim() && avatarUrlInputValue !== selectedProfileForAvatar.avatar_url)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl transition font-bold text-[11px] shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingAvatar ? "Saving..." : "Apply Picture"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirm Modal */}
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

    </div>
  );
}
