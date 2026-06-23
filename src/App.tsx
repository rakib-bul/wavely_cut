import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "./components/Sidebar";
import KPICards from "./components/KPICards";
import DashboardCharts from "./components/DashboardCharts";
import DataEntryForm from "./components/DataEntryForm";
import ReportsModule from "./components/ReportsModule";
import AnalyticsModule from "./components/AnalyticsModule";
import AdminModule from "./components/AdminModule";
import { Profile, Machine, Buyer, CuttingEntry, AuditLog, UserRole } from "./types";
import { compileDashboardKPIs } from "./utils/calculations";
import { SCHEMA_DDL_STRING, RLS_DDL_STRING } from "./db/ddl_strings";
import { 
  BarChart, 
  Settings, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle,
  Lightbulb,
  X,
  Plus,
  RefreshCw,
  Lock,
  User,
  Shield,
  Moon,
  Sun,
  AlertCircle,
  Key
} from "lucide-react";

export default function App() {
  // --- Active Tab State ---
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // --- Auth UI States ---
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [loginMode, setLoginMode] = useState<"secure" | "sandbox">("secure");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // --- Active Profile State ---
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(() => {
    try {
      const saved = localStorage.getItem("erp_active_profile");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [profiles, setProfiles] = useState<Profile[]>([]);

  // --- Core Entity States ---
  const [machines, setMachines] = useState<Machine[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [entries, setEntries] = useState<CuttingEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // --- Loading / Network feedback ---
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Selected Edit Modal State ---
  const [editingEntry, setEditingEntry] = useState<CuttingEntry | null>(null);
  const [editSuccessMessage, setEditSuccessMessage] = useState<string | null>(null);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

  // --- Ensure dark theme class is removed ---
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  // --- Fetch Data from Backend ---
  const fetchData = async () => {
    if (!currentProfile) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // Setup headers simulating active auth profile
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      // 1. Fetch Machines
      const macRes = await fetch("/api/machines", { headers });
      if (!macRes.ok) throw new Error("Failed to load machine definitions.");
      const macData = await macRes.json();
      setMachines(macData);

      // 1.5 Fetch Buyers
      const buyerRes = await fetch("/api/buyers", { headers });
      if (buyerRes.ok) {
        const buyerData = await buyerRes.json();
        setBuyers(buyerData);
      }

      // 2. Fetch Cutting Entries (Restricted based on active user's role on server)
      const entRes = await fetch("/api/entries", { headers });
      if (!entRes.ok) throw new Error("Failed to load cutting entry ledgers.");
      const entData = await entRes.json();
      setEntries(entData);

      // 3. Fetch Audit Logs (Strictly safe; only load if active role is admin)
      if (currentProfile.role === "admin") {
        const logRes = await fetch("/api/logs", { headers });
        if (logRes.ok) {
          const logData = await logRes.json();
          setAuditLogs(logData);
        }
      }

      // 4. Fetch Profiles list
      const profRes = await fetch("/api/profiles", { headers });
      if (profRes.ok) {
        const profData = await profRes.json();
        setProfiles(profData);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An error occurred fetching ledger databases.");
    } finally {
      setIsLoading(false);
    }
  };

  // Refetch when currently logged-in profile shifts
  useEffect(() => {
    fetchData();
  }, [currentProfile]);

  // --- SWITCH SIMULATED PROFILE (User Switching) ---
  const handleSwitchProfile = (p: Profile) => {
    setCurrentProfile(p);
    localStorage.setItem("erp_active_profile", JSON.stringify(p));
    // If operator/manager doesn't have access to tab, reset to general dashboard
    const protectedRolesMap: { [tab: string]: UserRole[] } = {
      admin: ["admin"],
      analytics: ["supervisor", "manager", "admin"],
      data_entry: ["operator", "supervisor", "admin"]
    };

    const allowedRoles = protectedRolesMap[activeTab];
    if (allowedRoles && !allowedRoles.includes(p.role)) {
      setActiveTab("dashboard");
    }
  };

  const handleLogout = () => {
    setCurrentProfile(null);
    localStorage.removeItem("erp_active_profile");
  };

  // --- SUBMIT SINGLE ENTRY ACTION ---
  const handleSubmitEntry = async (formData: any) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch("/api/entries", {
        method: "POST",
        headers,
        body: JSON.stringify(formData)
      });

      const body = await res.json();
      if (!res.ok) {
        return { success: false, error: body.error || "Server validation failed" };
      }

      // Add to local state and refetch
      await fetchData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Submission failed" };
    }
  };

  // --- APPROVE ENTRY ACTION ---
  const handleApproveEntry = async (id: string) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch(`/api/entries/${id}/approve`, {
        method: "POST",
        headers
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Approval failed.");
        return;
      }

      await fetchData();
    } catch (err: any) {
      alert("Network approval failed: " + err.message);
    }
  };

  // --- DELETE ENTRY ACTION ---
  const handleDeleteEntry = async (id: string) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch(`/api/entries/${id}`, {
        method: "DELETE",
        headers
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Delete failed.");
        return;
      }

      await fetchData();
    } catch (err: any) {
      alert("Network delete failed: " + err.message);
    }
  };

  // --- UPDATE INDIVIDUAL ENTRY (EDIT SAVE) ---
  const handleEditEntrySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    setEditErrorMessage(null);
    setEditSuccessMessage(null);

    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch(`/api/entries/${editingEntry.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(editingEntry)
      });

      const body = await res.json();
      if (!res.ok) {
        setEditErrorMessage(body.error || "Edit failed.");
        return;
      }

      setEditSuccessMessage("Cutting entry updated and recalculated systematically!");
      await fetchData();
      
      // Close modal after brief delay
      setTimeout(() => {
        setEditingEntry(null);
        setEditSuccessMessage(null);
      }, 1200);

    } catch (err: any) {
      setEditErrorMessage(err.message || "Edit fail.");
    }
  };

  // --- BULK XLSX/TSV IMPORT ACTION ---
  const handleBulkImport = async (entriesList: any[]) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch("/api/entries/bulk", {
        method: "POST",
        headers,
        body: JSON.stringify({ entries: entriesList })
      });

      const body = await res.json();
      await fetchData();
      return { 
        success: res.ok, 
        count: body.success_count, 
        errors: body.errors 
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Bulk submission fell flat." };
    }
  };

  // --- ADMIN: IAM ROLE CHANGE ACTION ---
  const handleUpdateUserRole = async (id: string, newRole: UserRole) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch(`/api/profiles/${id}/role`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Role assignment revision denied.");
        return;
      }

      // If updating roles on current active profile, apply change to active state!
      if (id === currentProfile.id) {
        setCurrentProfile(prev => ({ ...prev, role: newRole }));
      }

      await fetchData();
    } catch (err: any) {
      alert("Failed updating user privileges: " + err.message);
    }
  };

  // --- ADMIN: HARDWARE MACHINE CREATE ACTION ---
  const handleAddMachine = async (name: string, type: string) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch("/api/machines", {
        method: "POST",
        headers,
        body: JSON.stringify({ machine_name: name, machine_type: type })
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Machine addition denied.");
        return;
      }

      await fetchData();
    } catch (err: any) {
      alert("Failed adding machinery: " + err.message);
    }
  };

  // --- Aggregate Dashboard Stats ---
  const compiledDashboardKPIs = useMemo(() => {
    return compileDashboardKPIs(entries);
  }, [entries]);

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-200 relative">
        
        <div className="sm:mx-auto sm:w-full sm:max-w-md font-sans">
          {/* Brand Visual Logo */}
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/10 translate-y-12 group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
              W
            </div>
          </div>
          <h2 className="mt-6 text-center text-2xl font-extrabold tracking-tight text-slate-900 font-display">
            Wavely Cut
          </h2>
          <p className="mt-2 text-center text-xs text-slate-500 max-w-sm mx-auto">
            Developed by **Rakib Hasan** <br />
            Real-time cloth cutting records platform with secure user authentication & digital audit ledger.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white shadow-xl rounded-2xl border border-slate-200/60 overflow-hidden transition-all duration-300">
            {/* Dual Mode Tabs Selection Header */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              <button
                onClick={() => {
                  setAuthTab("login");
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                className={`flex-1 py-3.5 text-center text-xs font-bold tracking-wider uppercase transition border-b-2 cursor-pointer ${
                  authTab === "login"
                    ? "border-slate-800 text-slate-900 bg-white"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthTab("register");
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                className={`flex-1 py-3.5 text-center text-xs font-bold tracking-wider uppercase transition border-b-2 cursor-pointer ${
                  authTab === "register"
                    ? "border-slate-800 text-slate-900 bg-white"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Register
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Alert Feedback Banners */}
              {authError && (
                <div id="auth-error-alert" className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">Authentication Error</strong>
                    <span>{authError}</span>
                  </div>
                </div>
              )}

              {authSuccess && (
                <div id="auth-success-alert" className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2.5 animate-fadeIn">
                  <CheckCircle size={15} className="shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">Success</strong>
                    <span>{authSuccess}</span>
                  </div>
                </div>
              )}

              {/* SECTION: LOGIN TAB */}
              {authTab === "login" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      Welcome Back to Floor Desk
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Enter your operator account coordinates to access current cutting lot registers.
                    </p>
                  </div>

                  {/* Inner Login Method Selection Toggle */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-950/40 rounded-xl border border-slate-200/20">
                    <button
                      type="button"
                      onClick={() => setLoginMode("secure")}
                      className={`py-1.5 px-3 rounded-lg text-[10px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        loginMode === "secure"
                          ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                          : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                      }`}
                    >
                      <Shield size={11} /> Secure Password
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMode("sandbox")}
                      className={`py-1.5 px-3 rounded-lg text-[10px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        loginMode === "sandbox"
                          ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                          : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                      }`}
                    >
                      <Key size={11} /> Sandbox Bypass
                    </button>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setAuthError(null);
                      setAuthSuccess(null);
                      setAuthLoading(true);

                      const formData = new FormData(e.currentTarget);
                      const email = (formData.get("email") as string)?.trim();
                      const password = formData.get("password") as string;

                      if (!email) {
                        setAuthError("Email is required.");
                        setAuthLoading(false);
                        return;
                      }

                      try {
                        const payload: any = { email };
                        if (loginMode === "secure") {
                          if (!password) {
                            setAuthError("Password is required for secure authentication.");
                            setAuthLoading(false);
                            return;
                          }
                          payload.password = password;
                        }

                        const res = await fetch("/api/auth/login", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload)
                        });

                        if (res.ok) {
                          const data = await res.json();
                          if (data.profile) {
                            setAuthSuccess("Access granted. Initializing active floor deck...");
                            setTimeout(() => {
                              setCurrentProfile(data.profile);
                              localStorage.setItem("erp_active_profile", JSON.stringify(data.profile));
                              setAuthLoading(false);
                            }, 800);
                          } else {
                            setAuthError("Invalid server response. Profile could not be resolved.");
                            setAuthLoading(false);
                          }
                        } else {
                          const errBody = await res.json();
                          setAuthError(errBody.error || "Authentication failed. Double check your email/password.");
                          setAuthLoading(false);
                        }
                      } catch (err: any) {
                        setAuthError("Critical connection failure: " + err.message);
                        setAuthLoading(false);
                      }
                    }}
                    className="space-y-4 text-xs"
                  >
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        Company Email
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                          <User size={13} />
                        </span>
                        <input
                          name="email"
                           type="email"
                           placeholder="operator@kafe.com"
                           required
                           className="w-full pl-8 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-slate-950 text-slate-705 transition-colors"
                         />
                       </div>
                     </div>
 
                     {loginMode === "secure" && (
                       <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                           Passphrase Key
                         </label>
                         <div className="relative">
                           <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                             <Lock size={13} />
                           </span>
                           <input
                             name="password"
                             type="password"
                             placeholder="••••••••"
                             required={loginMode === "secure"}
                             className="w-full pl-8 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-slate-950 text-slate-705 transition-colors"
                           />
                         </div>
                       </div>
                     )}
 
                     {loginMode === "sandbox" && (
                       <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-slate-705 leading-relaxed">
                         ℹ️ <strong>Developer Override:</strong> Quick sandbox mode retrieves previous session cards or registers a fresh mock Operator on the fly. Password verification is bypassed.
                       </div>
                     )}
 
                     <button
                       type="submit"
                       disabled={authLoading}
                       className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition hover:scale-[1.01] uppercase tracking-wider text-[10.5px] cursor-pointer flex items-center justify-center gap-2"
                     >
                      {authLoading ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Authorizing Credentials...</span>
                        </>
                      ) : (
                        <span>Verify Identity & Enter</span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* SECTION: REGISTER TAB */}
              {authTab === "register" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      Instate New Fabric Operator
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Configure a system profile mapped inside Supabase and local redundant ledger indexes.
                    </p>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setAuthError(null);
                      setAuthSuccess(null);
                      setAuthLoading(true);

                      const formData = new FormData(e.currentTarget);
                      const email = (formData.get("email") as string)?.trim();
                      const password = formData.get("password") as string;
                      const full_name = (formData.get("full_name") as string)?.trim();
                      const role = formData.get("role") as string;
                      const department = (formData.get("department") as string)?.trim();

                      if (!email || !password || !full_name || !department) {
                        setAuthError("All fields must be formatted and complete.");
                        setAuthLoading(false);
                        return;
                      }

                      if (password.length < 6) {
                        setAuthError("Passphrase key must consist of at least 6 characters.");
                        setAuthLoading(false);
                        return;
                      }

                      try {
                        const res = await fetch("/api/auth/signup", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email, password, full_name, role, department })
                        });

                        const data = await res.json();
                        if (res.ok) {
                          setAuthSuccess(data.message || "Account registered successfully! Attempting automatic entry...");
                          
                          // Auto log-in with new credentials
                          setTimeout(() => {
                            setCurrentProfile(data.profile);
                            localStorage.setItem("erp_active_profile", JSON.stringify(data.profile));
                            setAuthLoading(false);
                          }, 900);
                        } else {
                          setAuthError(data.error || "Unable to instate operator identity.");
                          setAuthLoading(false);
                        }
                      } catch (err: any) {
                        setAuthError("Post failure: " + err.message);
                        setAuthLoading(false);
                      }
                    }}
                    className="space-y-4 text-xs"
                  >
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Full Name
                      </label>
                      <input
                        name="full_name"
                        type="text"
                        placeholder="Hasan Kabir"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-slate-950 text-slate-705"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Company Email
                      </label>
                      <input
                        name="email"
                        type="email"
                        placeholder="operator@kafe.com"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-slate-950 text-slate-705"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Security Passphrase (min. 6 chars)
                      </label>
                      <input
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-slate-950 text-slate-705"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Role Mapping
                        </label>
                        <select
                          name="role"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-slate-950 text-slate-705 cursor-pointer"
                        >
                          <option value="operator">Operator (Data Entry)</option>
                          <option value="supervisor">Supervisor (Authority)</option>
                          <option value="manager">Manager (Planning View)</option>
                          <option value="admin">Admin (System IAM)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Terminal/Floor
                        </label>
                        <input
                          name="department"
                          type="text"
                          placeholder="Cutting Floor 3"
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-slate-950 text-slate-705"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition hover:scale-[1.01] uppercase tracking-wider text-[10.5px] cursor-pointer flex items-center justify-center gap-2"
                    >
                      {authLoading ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Creating System Identity...</span>
                        </>
                      ) : (
                        <span>Verify & Create Account</span>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-800 selection:bg-slate-900/10">
      
      {/* 1. Sidebar Navigation */}
      <Sidebar
        currentTab={activeTab}
        setTab={setActiveTab}
        currentProfile={currentProfile}
        profiles={profiles}
        onSwitchProfile={handleSwitchProfile}
        onLogout={handleLogout}
      />

      {/* 2. Main Terminal Content Canvas */}
      <main className="flex-1 flex flex-col min-h-screen max-w-7xl mx-auto px-6 py-6 overflow-y-auto space-y-6">
        
        {/* Dynamic header summary banner */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div>
            <h1 className="font-display font-semibold text-2xl tracking-tight text-slate-900 dark:text-slate-100">
              Wavely Cut Section Ledger
            </h1>
            <p className="text-xs text-slate-400 mt-1">Replacing paper cards and manual Excel entry with secure data validation.</p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-1.5 px-3 rounded-lg font-medium flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active Session
            </span>
            <button
              onClick={fetchData}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer shadow-xs whitespace-nowrap text-xs font-semibold flex items-center gap-1.5"
              title="Sync latest logs"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /> {isLoading ? "Syncing..." : "Sync Database"}
            </button>
          </div>
        </header>

        {/* Global Loading / Failure alert blocks */}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-xs flex items-center gap-3">
            <AlertTriangle size={18} />
            <div>
              <h5 className="font-bold">Failed to synchronize logs</h5>
              <p className="text-slate-400 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* --- MAIN PAGE ROUTING TABS --- */}
        {isLoading && entries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-xs text-slate-400 space-y-3">
            <RefreshCw size={24} className="animate-spin text-slate-600" />
            <span>Booting system components, reading SQLite data...</span>
          </div>
        ) : (
          <div className="space-y-6">

            {/* TAB 1: OPERATIONS DASHBOARD */}
            {activeTab === "dashboard" && (
              <div className="space-y-6 animate-fade-in">
                <KPICards metrics={compiledDashboardKPIs} />
                <DashboardCharts entries={entries} machines={machines} />
              </div>
            )}

            {/* TAB 2: DATA ENTRY FORM */}
            {activeTab === "data_entry" && (
              <div className="animate-fade-in">
                <DataEntryForm 
                  machines={machines} 
                  buyers={buyers}
                  onSubmitEntry={handleSubmitEntry}
                  onWebImport={handleBulkImport}
                />
              </div>
            )}

            {/* TAB 3: REPORTS & LEDGERS */}
            {activeTab === "reports" && (
              <div className="animate-fade-in">
                <ReportsModule
                  entries={entries}
                  machines={machines}
                  profiles={profiles}
                  currentProfile={currentProfile}
                  onApproveEntry={handleApproveEntry}
                  onDeleteEntry={handleDeleteEntry}
                  onSelectEditEntry={(entry) => setEditingEntry(entry)}
                />
              </div>
            )}

            {/* TAB 4: ADVANCED ANALYTICS */}
            {activeTab === "analytics" && (
              <div className="animate-fade-in">
                <AnalyticsModule 
                  entries={entries} 
                  machines={machines} 
                />
              </div>
            )}

            {/* TAB 5: ADMIN / IAM SETTINGS */}
            {activeTab === "admin" && (
              <div className="animate-fade-in">
                <AdminModule
                  profiles={profiles}
                  machines={machines}
                  auditLogs={auditLogs}
                  onUpdateRole={handleUpdateUserRole}
                  onAddMachine={handleAddMachine}
                  schemaDDL={SCHEMA_DDL_STRING}
                  rlsDDL={RLS_DDL_STRING}
                />
              </div>
            )}

          </div>
        )}

      </main>

      {/* --- FLOATING EDIT LEDGER RECORD MODAL (OVERLAY SHEET) --- */}
      {editingEntry && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-xl w-full text-xs space-y-4 shadow-xl my-8">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100">
                  Update Cutting Log #{editingEntry.cut_no}
                </h3>
                <span className="text-[10px] text-slate-400">Revising and recalculating fabric yields immediately.</span>
              </div>
              <button 
                onClick={() => setEditingEntry(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {editErrorMessage && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-2.5 rounded-lg text-[11px]">
                {editErrorMessage}
              </div>
            )}

            {editSuccessMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-lg text-[11px]">
                {editSuccessMessage}
              </div>
            )}

            <form onSubmit={handleEditEntrySave} className="grid grid-cols-2 gap-4 h-[350px] overflow-y-auto pr-1">
              
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Date</label>
                <input 
                  type="date"
                  value={editingEntry.entry_date}
                  onChange={e => setEditingEntry({ ...editingEntry, entry_date: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Shift</label>
                <select 
                  value={editingEntry.shift}
                  onChange={e => setEditingEntry({ ...editingEntry, shift: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                >
                  <option value="Day">Day</option>
                  <option value="Night">Night</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Buyer Partner</label>
                <select 
                  value={editingEntry.buyer}
                  onChange={e => setEditingEntry({ ...editingEntry, buyer: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">-- Select Buyer --</option>
                  {buyers.map(b => (
                    <option key={b.id || b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Style Job No</label>
                <input 
                  type="text"
                  value={editingEntry.job_no}
                  onChange={e => setEditingEntry({ ...editingEntry, job_no: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Lay Layers (Plies)</label>
                <input 
                  type="number"
                  value={editingEntry.lay}
                  onChange={e => setEditingEntry({ ...editingEntry, lay: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Marker Ratio</label>
                <input 
                  type="number"
                  value={editingEntry.ratio}
                  onChange={e => setEditingEntry({ ...editingEntry, ratio: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Fabric Used (KG)</label>
                <input 
                  type="number"
                  step="0.001"
                  value={editingEntry.fabric_used_kg}
                  onChange={e => setEditingEntry({ ...editingEntry, fabric_used_kg: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Remnant (KG)</label>
                <input 
                  type="number"
                  step="0.001"
                  value={editingEntry.remnant_weight_kg}
                  onChange={e => setEditingEntry({ ...editingEntry, remnant_weight_kg: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Scissor Scrap (KG)</label>
                <input 
                  type="number"
                  step="0.001"
                  value={editingEntry.cutting_scrap_weight_kg}
                  onChange={e => setEditingEntry({ ...editingEntry, cutting_scrap_weight_kg: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Theoretical CAD Eff %</label>
                <input 
                  type="number"
                  step="0.1"
                  value={editingEntry.marker_efficiency_percent}
                  onChange={e => setEditingEntry({ ...editingEntry, marker_efficiency_percent: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Exceptions Remarks</label>
                <textarea 
                  value={editingEntry.remarks}
                  onChange={e => setEditingEntry({ ...editingEntry, remarks: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                />
              </div>

              <div className="col-span-2 flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-lg shadow-sm cursor-pointer"
                >
                  Save & Re-Formulate
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
