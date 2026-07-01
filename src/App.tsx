import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "./components/Sidebar";
import KPICards from "./components/KPICards";
import DashboardCharts from "./components/DashboardCharts";
import DailyReport from "./components/DailyReport";
import DataEntryForm from "./components/DataEntryForm";
import ReportsModule from "./components/ReportsModule";
import AnalyticsModule from "./components/AnalyticsModule";
import AdminModule from "./components/AdminModule";
import { Profile, Machine, Buyer, CuttingEntry, AuditLog, UserRole } from "./types";
import { compileDashboardKPIs, calculateFields } from "./utils/calculations";
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
  Key,
  Trash2,
  Sparkles,
  Download,
  Upload,
  Megaphone,
  Bell
} from "lucide-react";

export default function App() {
  // --- Active Tab State ---
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // --- Auth UI States ---
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
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
  const [jobNoDigits, setJobNoDigits] = useState<number>(7);
  const [whatsNewTitle, setWhatsNewTitle] = useState<string>("");
  const [whatsNewContent, setWhatsNewContent] = useState<string>("");
  const [whatsNewUpdatedAt, setWhatsNewUpdatedAt] = useState<string>("");
  const [showWhatsNewModal, setShowWhatsNewModal] = useState<boolean>(false);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_buyers");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [entries, setEntries] = useState<CuttingEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // --- Loading / Network feedback ---
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Auto Sync State & Configurations ---
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("erp_auto_sync_enabled");
      return saved === "false" ? false : true;
    } catch {
      return true;
    }
  });
  const [syncInterval, setSyncInterval] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("erp_sync_interval_sec");
      return saved ? Number(saved) : 10;
    } catch {
      return 10;
    }
  });
  const [lastSyncedTime, setLastSyncedTime] = useState<Date>(new Date());
  const [showSyncMenu, setShowSyncMenu] = useState<boolean>(false);

  // --- Selected Edit Modal State ---
  const [editingEntry, setEditingEntry] = useState<CuttingEntry | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [editSuccessMessage, setEditSuccessMessage] = useState<string | null>(null);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

  // Reset delete confirmation when modal changes
  useEffect(() => {
    setIsConfirmingDelete(false);
  }, [editingEntry]);

  // --- Theme State & Handler ---
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") {
        return saved;
      }
      return "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  // --- Fetch Data from Backend ---
  const safeFetchJson = async (url: string, init?: RequestInit) => {
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Expected JSON but received ${contentType || "none"}`);
      }
      return await res.json();
    } catch (err: any) {
      throw err;
    }
  };

  const fetchData = async (isSilent = false) => {
    if (!currentProfile) return;
    if (!isSilent) {
      setIsLoading(true);
      setErrorMessage(null);
    } else {
      setIsSyncing(true);
    }
    try {
      // Setup headers simulating active auth profile
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      // 1. Fetch Machines
      const macData = await safeFetchJson("/api/machines", { headers });
      setMachines(macData);

      // 1.5 Fetch Buyers
      try {
        const buyerData = await safeFetchJson("/api/buyers", { headers });
        setBuyers(buyerData);
        try {
          localStorage.setItem("erp_cached_buyers", JSON.stringify(buyerData));
        } catch (e) {
          console.error("Failed to cache buyers locally", e);
        }
      } catch (buyerErr) {
        console.warn("Could not fetch buyers list silently:", buyerErr);
      }

      // 2. Fetch Cutting Entries (Restricted based on active user's role on server)
      const entData = await safeFetchJson("/api/entries", { headers });
      setEntries(entData);

      // 3. Fetch Audit Logs (Strictly safe; only load if active role is admin)
      if (currentProfile.role === "admin") {
        try {
          const logData = await safeFetchJson("/api/logs", { headers });
          setAuditLogs(logData);
        } catch (logErr) {
          console.warn("Could not fetch audit logs silently:", logErr);
        }
      }

      // 4. Fetch Profiles list
      try {
        const profData = await safeFetchJson("/api/profiles", { headers });
        setProfiles(profData);
      } catch (profErr) {
        console.warn("Could not fetch profiles list silently:", profErr);
      }

      // 5. Fetch system settings
      try {
        const settingsData = await safeFetchJson("/api/settings", { headers });
        if (settingsData) {
          if (typeof settingsData.job_no_digits === "number") {
            setJobNoDigits(settingsData.job_no_digits);
          }
          if (typeof settingsData.whats_new_title === "string") {
            setWhatsNewTitle(settingsData.whats_new_title);
          }
          if (typeof settingsData.whats_new_content === "string") {
            setWhatsNewContent(settingsData.whats_new_content);
          }
          if (typeof settingsData.whats_new_updated_at === "string") {
            setWhatsNewUpdatedAt(settingsData.whats_new_updated_at);

            // On initial non-silent load, check if we need to show the What's New modal
            if (!isSilent && settingsData.whats_new_title && settingsData.whats_new_updated_at) {
              const lastSeen = localStorage.getItem("whats_new_seen_timestamp");
              if (lastSeen !== settingsData.whats_new_updated_at) {
                setShowWhatsNewModal(true);
              }
            }
          }
        }
      } catch (settingsErr) {
        console.warn("Could not fetch system settings silently:", settingsErr);
      }

      setLastSyncedTime(new Date());
    } catch (err: any) {
      // For background auto-sync, connection drops are common and transient (especially during local dev server restarts)
      if (isSilent) {
        console.warn("Silent background auto-sync deferred (will retry):", err.message || err);
      } else {
        console.error("Auto-sync load error:", err);
        setErrorMessage(err.message || "An error occurred fetching ledger databases.");
      }
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      } else {
        setIsSyncing(false);
      }
    }
  };

  // Setup dynamic background auto-sync responsive to toggle and interval configurations
  useEffect(() => {
    fetchData(false); // Initial load on profile change
  }, [currentProfile]);

  useEffect(() => {
    if (!isAutoSyncEnabled || syncInterval <= 0 || !currentProfile) return;

    const interval = setInterval(() => {
      fetchData(true); // Background sync silently
    }, syncInterval * 1000);

    return () => clearInterval(interval);
  }, [currentProfile, isAutoSyncEnabled, syncInterval]);

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

  // --- SUBMIT DRAFT (AUTO-APPROVE) ACTION ---
  const handleSubmitDraft = async (entry: CuttingEntry) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          ...entry,
          status: "submitted"
        })
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Submission failed.");
        return;
      }

      await fetchData();
    } catch (err: any) {
      alert("Network submission failed: " + err.message);
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
  const handleEditEntrySave = async (e: React.FormEvent, targetStatus?: 'draft' | 'submitted') => {
    e.preventDefault();
    if (!editingEntry) return;

    setEditErrorMessage(null);
    setEditSuccessMessage(null);

    const finalStatus = targetStatus || editingEntry.status;
    if (finalStatus === "submitted" || finalStatus === "approved") {
      const jobNoStr = String(editingEntry.job_no || "").trim();
      const digitsPattern = new RegExp(`^\\d{${jobNoDigits}}$`);
      if (!digitsPattern.test(jobNoStr)) {
        setEditErrorMessage(`Job Order No must be exactly ${jobNoDigits} digits (numbers only).`);
        return;
      }
    }

    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const payload = {
        ...editingEntry,
        status: targetStatus || editingEntry.status
      };

      const res = await fetch(`/api/entries/${editingEntry.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload)
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

  // --- ADMIN: UPDATE REQUIRED JOB NO DIGITS SYSTEM SETTING ---
  const handleUpdateJobNoDigits = async (digits: number) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers,
        body: JSON.stringify({ job_no_digits: digits })
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Setting update failed.");
        return;
      }

      const updated = await res.json();
      setJobNoDigits(updated.job_no_digits);
      await fetchData();
    } catch (err: any) {
      alert("Failed to update system settings: " + err.message);
    }
  };

  // --- ADMIN: UPDATE WHAT'S NEW ANNOUNCEMENT SYSTEM SETTING ---
  const handleUpdateWhatsNew = async (title: string, content: string) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const updatedAt = title ? new Date().toISOString() : "";

      const res = await fetch("/api/settings", {
        method: "POST",
        headers,
        body: JSON.stringify({
          job_no_digits: jobNoDigits,
          whats_new_title: title,
          whats_new_content: content,
          whats_new_updated_at: updatedAt
        })
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Announcement update failed.");
        return;
      }

      const updated = await res.json();
      setWhatsNewTitle(updated.whats_new_title || "");
      setWhatsNewContent(updated.whats_new_content || "");
      setWhatsNewUpdatedAt(updated.whats_new_updated_at || "");
      await fetchData();
    } catch (err: any) {
      alert("Failed to update announcement: " + err.message);
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

  // --- ADMIN: UPDATE USER PROFILE PICTURE ---
  const handleUpdateUserAvatar = async (id: string, newAvatarUrl: string) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch(`/api/profiles/${id}/avatar`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ avatar_url: newAvatarUrl })
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Profile picture update denied.");
        return;
      }

      // If updating avatar on current active profile, apply change to active state!
      if (id === currentProfile.id) {
        setCurrentProfile(prev => ({ ...prev, avatar_url: newAvatarUrl }));
      }

      await fetchData();
    } catch (err: any) {
      alert("Failed updating user profile picture: " + err.message);
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

  // --- ADMIN: BUYER PARTNER CREATE ACTION ---
  const handleAddBuyer = async (name: string) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch("/api/buyers", {
        method: "POST",
        headers,
        body: JSON.stringify({ name })
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Buyer addition denied.");
        return;
      }

      await fetchData();
    } catch (err: any) {
      alert("Failed adding buyer: " + err.message);
    }
  };

  // --- ADMIN: DIRECT NEW USER REGISTRATION ACTION ---
  const handleAdminCreateUser = async (user: { email: string; password: string; full_name: string; role: UserRole; department: string }) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers,
        body: JSON.stringify(user)
      });

      const body = await res.json();
      if (!res.ok) {
        return { success: false, error: body.error || "Direct registration of operator account failed." };
      }

      await fetchData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "An unexpected error occurred during admin registration." };
    }
  };

  // --- DOWNLOAD BUYERS CACHE FILE IN BROWSER ---
  const handleDownloadBuyersCache = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(buyers, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "buyers_cache.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert("Failed to download buyers cache file: " + err.message);
    }
  };

  // --- UPLOAD / RESTORE BUYERS CACHE FILE IN BROWSER ---
  const handleUploadBuyersCache = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (!Array.isArray(parsed)) {
          alert("Invalid cache file format: Expected an array of buyers.");
          return;
        }

        // Validate structure and find new buyers
        const newBuyerNames: string[] = [];
        parsed.forEach((item: any) => {
          let name = "";
          if (typeof item === "string") {
            name = item.trim().toUpperCase();
          } else if (item && typeof item === "object" && typeof item.name === "string") {
            name = item.name.trim().toUpperCase();
          }
          if (name && !buyers.some(b => b.name.toUpperCase() === name) && !newBuyerNames.includes(name)) {
            newBuyerNames.push(name);
          }
        });

        if (newBuyerNames.length === 0) {
          alert("No new buyers to import from the cache file.");
          return;
        }

        if (!confirm(`Found ${newBuyerNames.length} new buyer partner(s). Would you like to import them into the database to automatically sync for all users?`)) {
          return;
        }

        // Register each new buyer in the backend
        let successCount = 0;
        const headers = {
          "Content-Type": "application/json",
          "X-User-Role": currentProfile?.role || "user",
          "X-User-Email": currentProfile?.email || ""
        };

        for (const name of newBuyerNames) {
          try {
            const res = await fetch("/api/buyers", {
              method: "POST",
              headers,
              body: JSON.stringify({ name })
            });
            if (res.ok) {
              successCount++;
            }
          } catch (itemErr) {
            console.error("Failed to register buyer during cache import:", name, itemErr);
          }
        }

        alert(`Successfully imported and registered ${successCount} out of ${newBuyerNames.length} new buyer partners!`);
        await fetchData(); // Sync state with database
      } catch (err: any) {
        alert("Failed to read or parse the cache file: " + err.message);
      }
    };
    reader.readAsText(file);
    // Reset the input value so user can upload same file again
    event.target.value = "";
  };

  // --- Categorize Main vs Stripe Cutting Entries ---
  const { mainEntries, stripeEntries } = useMemo(() => {
    const stripeMachineIds = new Set(
      machines
        .filter(m => m.machine_type?.toLowerCase() === "stripe" || m.machine_name?.toLowerCase().includes("stripe"))
        .map(m => m.id)
    );

    const main: CuttingEntry[] = [];
    const stripe: CuttingEntry[] = [];

    entries.forEach(e => {
      const calculated = calculateFields(e);
      if (stripeMachineIds.has(calculated.machine_id)) {
        stripe.push(calculated);
      } else {
        main.push(calculated);
      }
    });

    return { mainEntries: main, stripeEntries: stripe };
  }, [entries, machines]);

  // --- Aggregate Dashboard Stats ---
  const compiledMainKPIs = useMemo(() => {
    return compileDashboardKPIs(mainEntries);
  }, [mainEntries]);

  const compiledStripeKPIs = useMemo(() => {
    return compileDashboardKPIs(stripeEntries);
  }, [stripeEntries]);

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-200 relative">
        
        {/* Floating Theme Switcher */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
            className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 py-2.5 px-3.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === "light" ? (
              <>
                <Moon size={13} className="text-slate-500" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun size={13} className="text-amber-500" />
                <span>Light Mode</span>
              </>
            )}
          </button>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md font-sans">
          {/* Brand Visual Logo */}
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-slate-900 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/10 translate-y-12 group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
              W
            </div>
          </div>
          <h2 className="mt-6 text-center text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display">
            Wavely Cut
          </h2>
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-450 max-w-sm mx-auto">
            Developed by **Rakib Hasan** <br />
            Real-time cloth cutting records platform with secure user authentication & digital audit ledger.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-slate-200/60 dark:border-slate-800/80 overflow-hidden transition-all duration-300">
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

              {/* SECTION: LOGIN FORM */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Welcome Back to Floor Desk
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Enter your operator account coordinates to access current cutting lot registers.
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

                      if (!email) {
                        setAuthError("Email is required.");
                        setAuthLoading(false);
                        return;
                      }

                      if (!password) {
                        setAuthError("Password is required.");
                        setAuthLoading(false);
                        return;
                      }

                      try {
                        const payload = { email, password };

                        const res = await fetch("/api/auth/login", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload)
                        });

                        const resText = await res.text();
                        let data: any = {};
                        try {
                          data = JSON.parse(resText);
                        } catch (parseErr) {
                          throw new Error(`Server responded with non-JSON format (status ${res.status}): ${resText.slice(0, 150)}`);
                        }

                        if (res.ok) {
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
                          setAuthError(data.error || "Authentication failed. Double check your email/password.");
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
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500 pointer-events-none">
                          <User size={13} />
                        </span>
                        <input
                          name="email"
                          type="email"
                          placeholder="operator@kafe.com"
                          required
                          className="w-full pl-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-slate-750 text-slate-750 dark:text-slate-200 transition-colors"
                        />
                      </div>
                    </div>
 
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        Passphrase Key
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500 pointer-events-none">
                          <Lock size={13} />
                        </span>
                        <input
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          required
                          className="w-full pl-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-slate-750 text-slate-750 dark:text-slate-200 transition-colors"
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
                          <span>Authorizing Credentials...</span>
                        </>
                      ) : (
                        <span>Verify Identity & Enter</span>
                      )}
                    </button>
                  </form>
                </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getTabTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Cutting Dashboard";
      case "stripe_dashboard":
        return "Stripe Cutting Dashboard";
      case "data_entry":
        return "Cutting Records Entry";
      case "reports":
        return "Digital Ledger & Reports";
      case "analytics":
        return "Advanced Floor Analytics";
      case "admin":
        return "IAM & Machine Admin";
      default:
        return "Cutting Dashboard";
    }
  };

  return (
    <div className="flex bg-[#F5F7FB] dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 selection:bg-blue-600/10">
      
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
      <main className="flex-1 flex flex-col min-h-screen w-full max-w-7xl 3xl:max-w-[1800px] 2k:max-w-[2400px] 4k:max-w-[3600px] mx-auto px-6 pb-12 overflow-y-auto space-y-6">
        
        {/* Dynamic header summary banner - Sticky and Blurred */}
        <header className="sticky top-0 z-40 flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 px-6 -mx-6 bg-[#F5F7FB]/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 gap-4 mb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
              {getTabTitle()}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-2 px-3.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active Session
            </span>
            
            <div className="relative">
              <button 
                onClick={() => setShowSyncMenu(!showSyncMenu)}
                className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 py-2 px-3.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                title="Configure live data & buyers synchronization"
              >
                <RefreshCw size={12} className={`${isAutoSyncEnabled ? "text-emerald-500" : "text-slate-400"} ${isSyncing || isLoading ? "animate-spin" : ""}`} />
                <span className="text-slate-700 dark:text-slate-300">Sync Options</span>
                <span className={`w-1.5 h-1.5 rounded-full ${isAutoSyncEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              </button>

              {showSyncMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowSyncMenu(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 z-50 animate-fade-in text-xs text-slate-700 dark:text-slate-300 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="font-extrabold uppercase tracking-wider text-slate-400 text-[10px]">Sync Ledger & Buyers</span>
                      <button 
                        onClick={() => {
                          fetchData(true);
                          setShowSyncMenu(false);
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer flex items-center gap-1"
                        title="Fetch latest buyers & entries right now"
                      >
                        <RefreshCw size={10} className={isSyncing ? "animate-spin" : ""} /> Sync Now
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="font-bold">Background Sync</p>
                        <p className="text-[10px] text-slate-400">Keep buyers list & logs up to date</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={isAutoSyncEnabled}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setIsAutoSyncEnabled(val);
                            localStorage.setItem("erp_auto_sync_enabled", String(val));
                          }}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                      </label>
                    </div>

                    {isAutoSyncEnabled && (
                      <div className="space-y-1.5">
                        <label className="font-bold block text-slate-500 dark:text-slate-400">Polling Interval</label>
                        <div className="grid grid-cols-4 gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-850">
                          {[5, 10, 30, 60].map((sec) => (
                            <button
                              key={sec}
                              onClick={() => {
                                setSyncInterval(sec);
                                localStorage.setItem("erp_sync_interval_sec", String(sec));
                              }}
                              className={`py-1.5 text-center font-extrabold rounded-lg transition-all text-[10px] cursor-pointer ${
                                syncInterval === sec 
                                  ? "bg-white dark:bg-slate-850 text-slate-900 dark:text-white shadow-xs border border-slate-200/50 dark:border-slate-700/50" 
                                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              }`}
                            >
                              {sec}s
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Local Cache File Backup section */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                      <p className="font-bold block text-slate-500 dark:text-slate-400">Browser Cache Backup</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleDownloadBuyersCache}
                          className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl font-bold transition-all text-[10px] cursor-pointer"
                          title="Save current buyers as buyers_cache.json"
                        >
                          <Download size={11} className="text-blue-500" />
                          <span>Export File</span>
                        </button>
                        
                        <label
                          className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl font-bold transition-all text-[10px] cursor-pointer"
                          title="Restore buyers cache from a .json file"
                        >
                          <Upload size={11} className="text-emerald-500" />
                          <span>Import File</span>
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleUploadBuyersCache}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 font-medium">
                      <span>Status: {isSyncing ? "Synchronizing..." : "Idle"}</span>
                      <span>Last: {lastSyncedTime.toLocaleTimeString()}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
              className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 py-2 px-3.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? (
                <>
                  <Moon size={13} className="text-slate-500" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun size={13} className="text-amber-500" />
                  <span>Light Mode</span>
                </>
              )}
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
            <span>Booting system components, connecting to Supabase database...</span>
          </div>
        ) : (
          <div className="space-y-6">

            {/* TAB 1: OPERATIONS DASHBOARD */}
            {activeTab === "dashboard" && (
              <div className="space-y-12 animate-fade-in">
                {/* --- SECTION 1: DAILY OPERATIONS & ANALYTICS --- */}
                <div className="space-y-6">
                  <div className="border-b border-slate-200 dark:border-slate-800/80 pb-3">
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
                      Daily Operations & Shop-Floor Reports
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Real-time interactive shift report logs, supervisor metrics, and daily throughput trends.
                    </p>
                  </div>
                  <DailyReport entries={mainEntries} machines={machines} />
                  <KPICards metrics={compiledMainKPIs} group="daily" />
                </div>

                {/* --- SECTION 2: CUMULATIVE & MONTHLY PERFORMANCE --- */}
                <div className="space-y-6">
                  <div className="border-b border-slate-200 dark:border-slate-800/80 pb-3">
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
                      Cumulative & Monthly Production Analytics
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      CAD-to-physical efficiency mapping, total scrap margins, buyer yields, and knit quality trends.
                    </p>
                  </div>
                  <KPICards metrics={compiledMainKPIs} group="monthly" />
                  <DashboardCharts entries={mainEntries} machines={machines} />
                </div>
              </div>
            )}

            {/* TAB 1.5: STRIPE CUTTING DASHBOARD */}
            {activeTab === "stripe_dashboard" && (
              <div className="space-y-12 animate-fade-in">
                {/* --- SECTION 1: DAILY OPERATIONS & ANALYTICS --- */}
                <div className="space-y-6">
                  <div className="border-b border-slate-200 dark:border-slate-800/80 pb-3">
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
                      Daily Stripe Operations & Reports
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Daily logs, lay plies, and physical piece yields specifically for isolated stripe tables.
                    </p>
                  </div>
                  <DailyReport entries={stripeEntries} machines={machines} />
                  <KPICards metrics={compiledStripeKPIs} group="daily" />
                </div>

                {/* --- SECTION 2: CUMULATIVE & MONTHLY PERFORMANCE --- */}
                <div className="space-y-6">
                  <div className="border-b border-slate-200 dark:border-slate-800/80 pb-3">
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
                      Cumulative & Monthly Stripe Performance
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Stripe fabric efficiency trends, cumulative scrap statistics, and buyer roll-end allocations.
                    </p>
                  </div>
                  <KPICards metrics={compiledStripeKPIs} group="monthly" />
                  <DashboardCharts entries={stripeEntries} machines={machines} />
                </div>

                {/* Dedicated Stripe Cutting Ledger */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Stripe Logs Ledger</h3>
                    <p className="text-xs text-slate-500 mt-1">Manage and approve stripe cutting entries in isolation.</p>
                  </div>
                  <ReportsModule
                    entries={stripeEntries}
                    machines={machines}
                    profiles={profiles}
                    currentProfile={currentProfile}
                    onApproveEntry={handleApproveEntry}
                    onDeleteEntry={handleDeleteEntry}
                    onSelectEditEntry={(entry) => setEditingEntry(entry)}
                    buyers={buyers}
                    onSubmitDraft={handleSubmitDraft}
                  />
                </div>
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
                  jobNoDigits={jobNoDigits}
                />
              </div>
            )}

            {/* TAB 3: REPORTS & LEDGERS */}
            {activeTab === "reports" && (
              <div className="animate-fade-in">
                <ReportsModule
                  entries={mainEntries}
                  machines={machines}
                  profiles={profiles}
                  currentProfile={currentProfile}
                  onApproveEntry={handleApproveEntry}
                  onDeleteEntry={handleDeleteEntry}
                  onSelectEditEntry={(entry) => setEditingEntry(entry)}
                  buyers={buyers}
                  onSubmitDraft={handleSubmitDraft}
                />
              </div>
            )}

            {/* TAB 4: ADVANCED ANALYTICS */}
            {activeTab === "analytics" && (
              <div className="animate-fade-in">
                <AnalyticsModule 
                  entries={mainEntries} 
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
                  onUpdateAvatar={handleUpdateUserAvatar}
                  onAddMachine={handleAddMachine}
                  schemaDDL={SCHEMA_DDL_STRING}
                  rlsDDL={RLS_DDL_STRING}
                  buyers={buyers}
                  onAddBuyer={handleAddBuyer}
                  onDownloadBuyersCache={handleDownloadBuyersCache}
                  onUploadBuyersCache={handleUploadBuyersCache}
                  jobNoDigits={jobNoDigits}
                  onUpdateJobNoDigits={handleUpdateJobNoDigits}
                  onAddUser={handleAdminCreateUser}
                  whatsNewTitle={whatsNewTitle}
                  whatsNewContent={whatsNewContent}
                  whatsNewUpdatedAt={whatsNewUpdatedAt}
                  onUpdateWhatsNew={handleUpdateWhatsNew}
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

            <form onSubmit={(e) => handleEditEntrySave(e)} className="grid grid-cols-2 gap-4 h-[350px] overflow-y-auto pr-1">
              
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
                  <option value="A">Day Shift</option>
                  <option value="B">Night Shift</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Buyer Partner</label>
                <input 
                  type="text"
                  value={editingEntry.buyer}
                  onChange={e => setEditingEntry({ ...editingEntry, buyer: e.target.value.toUpperCase() })}
                  list="edit-buyer-datalist"
                  placeholder="Type or select buyer..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none font-bold text-slate-800 dark:text-slate-150"
                  required
                />
                <datalist id="edit-buyer-datalist">
                  {buyers.map(b => (
                    <option key={b.id || b.name} value={b.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Style Job No</label>
                <input 
                  type="text"
                  value={editingEntry.job_no}
                  onChange={e => setEditingEntry({ ...editingEntry, job_no: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  placeholder={`Exactly ${jobNoDigits} digits`}
                  required
                />
                <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Must be exactly {jobNoDigits} numeric digits.</span>
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
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Size Ratio</label>
                <input 
                  type="number"
                  value={editingEntry.ratio}
                  onChange={e => setEditingEntry({ ...editingEntry, ratio: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Fabric Weight Used (KG)</label>
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
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Spreading Scrap (KG)</label>
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
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Cutting Scrap (KG)</label>
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
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Marker Efficiency %</label>
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
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Remnants Weight (KG)</label>
                <textarea 
                  value={editingEntry.remarks}
                  onChange={e => setEditingEntry({ ...editingEntry, remarks: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                />
              </div>

              <div className="col-span-2 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                {/* Left side: Delete options for Admin and Supervisor */}
                {currentProfile && (currentProfile.role === "admin" || currentProfile.role === "supervisor") ? (
                  <div>
                    {!isConfirmingDelete ? (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(true)}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition font-semibold flex items-center gap-1.5 cursor-pointer border border-rose-100"
                        title="Delete this cutting log"
                      >
                        <Trash2 size={13} /> Delete Log
                      </button>
                    ) : (
                      <div className="flex items-center space-x-1 bg-rose-50 border border-rose-100 p-1 rounded-lg">
                        <span className="text-[10px] text-rose-700 font-bold px-1.5">Are you sure?</span>
                        <button
                          type="button"
                          onClick={async () => {
                            await handleDeleteEntry(editingEntry.id);
                            setEditingEntry(null);
                          }}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px] transition cursor-pointer"
                        >
                          Yes, Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingDelete(false)}
                          className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-500 rounded font-semibold text-[10px] border border-slate-200 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div />
                )}

                {/* Right side: Action buttons */}
                <div className="flex items-center space-x-2">
                  <button 
                    type="button" 
                    onClick={() => setEditingEntry(null)}
                    className="px-4 py-2 text-slate-400 hover:text-slate-700 dark:hover:text-white font-medium"
                  >
                    Cancel
                  </button>
                  {editingEntry.status === "draft" ? (
                    <>
                      <button 
                        type="button"
                        onClick={(e) => handleEditEntrySave(e, 'draft')}
                        className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium cursor-pointer"
                      >
                        Save Draft
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => handleEditEntrySave(e, 'submitted')}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-lg shadow-sm cursor-pointer"
                      >
                        Commit & Submit
                      </button>
                    </>
                  ) : (
                    <button 
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-lg shadow-sm cursor-pointer"
                    >
                      Save & Re-Formulate
                    </button>
                  )}
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* --- WHAT'S NEW ANNOUNCEMENT LAUNCHER MODAL --- */}
      {showWhatsNewModal && whatsNewTitle && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-lg w-full text-xs space-y-6 shadow-2xl animate-fade-in relative overflow-hidden">
            
            {/* Background design accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none" />

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm animate-bounce">
                <Megaphone size={28} />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest block font-sans">
                  System Announcement
                </span>
                <h3 className="font-display font-extrabold text-lg text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
                  {whatsNewTitle}
                </h3>
              </div>
            </div>

            <div className="border-t border-b border-slate-100 dark:border-slate-800 py-4 max-h-60 overflow-y-auto pr-1">
              <div className="space-y-3 text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                {whatsNewContent.split('\n').map((para, i) => (
                  <p key={i} className="font-medium">
                    {para}
                  </p>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <span className="text-[9px] text-slate-400 font-mono font-semibold">
                Version Broadcast ID: {whatsNewUpdatedAt ? whatsNewUpdatedAt.substring(0, 10) : "Latest"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowWhatsNewModal(false);
                  if (whatsNewUpdatedAt) {
                    localStorage.setItem("whats_new_seen_timestamp", whatsNewUpdatedAt);
                  }
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-extrabold text-xs shadow-md shadow-blue-500/10 flex items-center gap-1.5 cursor-pointer"
              >
                Got it, thanks!
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
