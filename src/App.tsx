import React, { useState, useEffect, useMemo } from "react";
import { CustomDatePicker } from "./components/common/DatePicker";
import Sidebar from "./components/Sidebar";
import KPICards from "./components/KPICards";
import DashboardCharts from "./components/DashboardCharts";
import DailyReport from "./components/DailyReport";
import DataEntryForm from "./components/DataEntryForm";
import ReportsModule from "./components/ReportsModule";
import AnalyticsModule from "./components/AnalyticsModule";
import AdminModule from "./components/AdminModule";
import TableProductionView from "./components/TableProductionView";
import { Profile, Machine, Buyer, CuttingEntry, AuditLog, UserRole, PolyEntry, HeatSealEntry, HeatSealOperator, HeatSealTarget, Requisition, FabricMetricsEntry } from "./types";
import { compileDashboardKPIs, calculateFields, getCurrentProductionDateAndShift, sortSizes } from "./utils/calculations";
import PolyTrackingModule from "./components/PolyTrackingModule";
import HeatSealModule from "./components/HeatSealModule";
import HeatSealDashboardInsight from "./components/HeatSealDashboardInsight";
import RequisitionModule from "./components/RequisitionModule";
import FabricMetricsModule from "./components/FabricMetricsModule";
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
  const [dashboardSubTab, setDashboardSubTab] = useState<"standard" | "table_wise">("standard");

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

  const [profiles, setProfiles] = useState<Profile[]>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_profiles");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // --- Core Entity States ---
  const [jobNoDigits, setJobNoDigits] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_job_no_digits");
      return saved ? Number(saved) : 7;
    } catch {
      return 7;
    }
  });
  const [polyPrice, setPolyPrice] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_poly_price");
      return saved ? Number(saved) : 1.50;
    } catch {
      return 1.50;
    }
  });
  const [isPoNumberRequired, setIsPoNumberRequired] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_is_po_number_required");
      return saved === "true";
    } catch {
      return false;
    }
  });
  const [colorTypeMetrics, setColorTypeMetrics] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_color_type_metrics");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [whatsNewTitle, setWhatsNewTitle] = useState<string>(() => localStorage.getItem("erp_cached_whats_new_title") || "");
  const [whatsNewContent, setWhatsNewContent] = useState<string>(() => localStorage.getItem("erp_cached_whats_new_content") || "");
  const [whatsNewUpdatedAt, setWhatsNewUpdatedAt] = useState<string>(() => localStorage.getItem("erp_cached_whats_new_updated_at") || "");
  const [showWhatsNewModal, setShowWhatsNewModal] = useState<boolean>(false);
  const [machines, setMachines] = useState<Machine[]>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_machines");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [buyers, setBuyers] = useState<Buyer[]>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_buyers");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [entries, setEntries] = useState<CuttingEntry[]>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_entries");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_audit_logs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [polyEntries, setPolyEntries] = useState<PolyEntry[]>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_poly_entries");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [heatSealEntries, setHeatSealEntries] = useState<HeatSealEntry[]>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_heat_seal_entries");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [heatSealOperators, setHeatSealOperators] = useState<HeatSealOperator[]>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_heat_seal_operators");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [heatSealTargets, setHeatSealTargets] = useState<HeatSealTarget[]>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_heat_seal_targets");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [requisitions, setRequisitions] = useState<Requisition[]>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_requisitions");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("erp_cached_requisitions", JSON.stringify(requisitions));
    } catch (e) {}
  }, [requisitions]);

  const [fabricMetrics, setFabricMetrics] = useState<FabricMetricsEntry[]>(() => {
    try {
      const saved = localStorage.getItem("erp_cached_fabric_metrics");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("erp_cached_fabric_metrics", JSON.stringify(fabricMetrics));
    } catch (e) {}
  }, [fabricMetrics]);

  // --- Loading / Network feedback ---
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      // If we have cached entries already, render immediately and sync silently in the background
      const saved = localStorage.getItem("erp_cached_entries");
      return !saved;
    } catch {
      return true;
    }
  });
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
      return saved ? Number(saved) : 60; // Default optimized from 30s to 60s to reduce Fast Origin Transfer
    } catch {
      return 60;
    }
  });
  const [syncVersion, setSyncVersion] = useState<string>(() => {
    try {
      return localStorage.getItem("erp_sync_version") || "";
    } catch {
      return "";
    }
  });
  const [lastSyncedTime, setLastSyncedTime] = useState<Date>(new Date());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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

  const handleEditSizeRatioChange = (size: string, ratioVal: string) => {
    if (!editingEntry) return;
    const rVal = parseInt(ratioVal) || 0;
    const nextSizes = {
      ...(editingEntry.sizes || {}),
      [size]: rVal
    };
    if (rVal <= 0) {
      delete nextSizes[size];
    }
    
    // Sum all size ratios
    const totalRatioSum = Object.values(nextSizes).reduce((sum, curr) => sum + curr, 0);
    
    setEditingEntry({
      ...editingEntry,
      sizes: nextSizes,
      ratio: totalRatioSum > 0 ? totalRatioSum : editingEntry.ratio
    });
  };

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

      // Perform a single unified synchronized load of all dashboard states
      const activeVersion = (entries.length > 0 && machines.length > 0) ? syncVersion : "";
      const syncData = await safeFetchJson(`/api/sync?version=${encodeURIComponent(activeVersion)}`, { headers });

      if (syncData) {
        if (syncData.no_changes) {
          // No changes detected on the server database. Skip state updates and avoid local storage churn.
          setLastSyncedTime(new Date());
          return;
        }

        // Cache the newly received server-side schema version
        if (syncData.version) {
          setSyncVersion(syncData.version);
          try {
            localStorage.setItem("erp_sync_version", syncData.version);
          } catch (e) {}
        }

        // Update machines state
        if (syncData.machines) {
          setMachines(syncData.machines);
          try {
            localStorage.setItem("erp_cached_machines", JSON.stringify(syncData.machines));
          } catch (e) {}
        }

        // Update buyers state
        if (syncData.buyers) {
          setBuyers(syncData.buyers);
          try {
            localStorage.setItem("erp_cached_buyers", JSON.stringify(syncData.buyers));
          } catch (e) {}
        }

        // Update entries state
        if (syncData.entries) {
          setEntries(syncData.entries);
          try {
            localStorage.setItem("erp_cached_entries", JSON.stringify(syncData.entries));
          } catch (e) {}
        }

        // Update audit logs state
        if (syncData.auditLogs) {
          setAuditLogs(syncData.auditLogs);
          try {
            localStorage.setItem("erp_cached_audit_logs", JSON.stringify(syncData.auditLogs));
          } catch (e) {}
        }

        // Update profiles state
        if (syncData.profiles) {
          setProfiles(syncData.profiles);
          try {
            localStorage.setItem("erp_cached_profiles", JSON.stringify(syncData.profiles));
          } catch (e) {}
        }

        // Update poly entries state
        if (syncData.polyEntries) {
          setPolyEntries(syncData.polyEntries);
          try {
            localStorage.setItem("erp_cached_poly_entries", JSON.stringify(syncData.polyEntries));
          } catch (e) {}
        }

        // Update heat seal entries state
        if (syncData.heatSealEntries) {
          setHeatSealEntries(syncData.heatSealEntries);
          try {
            localStorage.setItem("erp_cached_heat_seal_entries", JSON.stringify(syncData.heatSealEntries));
          } catch (e) {}
        }

        // Update heat seal operators state
        if (syncData.heatSealOperators) {
          setHeatSealOperators(syncData.heatSealOperators);
          try {
            localStorage.setItem("erp_cached_heat_seal_operators", JSON.stringify(syncData.heatSealOperators));
          } catch (e) {}
        }

        // Update heat seal targets state
        if (syncData.heatSealTargets) {
          setHeatSealTargets(syncData.heatSealTargets);
          try {
            localStorage.setItem("erp_cached_heat_seal_targets", JSON.stringify(syncData.heatSealTargets));
          } catch (e) {}
        }

        // Update requisitions state
        if (syncData.requisitions) {
          setRequisitions(syncData.requisitions);
          try {
            localStorage.setItem("erp_cached_requisitions", JSON.stringify(syncData.requisitions));
          } catch (e) {}
        }

        // Update fabric metrics state
        if (syncData.fabricMetrics) {
          setFabricMetrics(syncData.fabricMetrics);
          try {
            localStorage.setItem("erp_cached_fabric_metrics", JSON.stringify(syncData.fabricMetrics));
          } catch (e) {}
        }

        // Update system settings state
        if (syncData.settings) {
          const settingsData = syncData.settings;
          if (settingsData.poly_price !== undefined) {
            setPolyPrice(Number(settingsData.poly_price));
            try {
              localStorage.setItem("erp_cached_poly_price", String(settingsData.poly_price));
            } catch (e) {}
          }
          if (typeof settingsData.is_po_number_required === "boolean") {
            setIsPoNumberRequired(settingsData.is_po_number_required);
            try {
              localStorage.setItem("erp_cached_is_po_number_required", String(settingsData.is_po_number_required));
            } catch (e) {}
          }
          if (typeof settingsData.job_no_digits === "number") {
            setJobNoDigits(settingsData.job_no_digits);
            try {
              localStorage.setItem("erp_cached_job_no_digits", String(settingsData.job_no_digits));
            } catch (e) {}
          }
          if (settingsData.color_type_metrics) {
            setColorTypeMetrics(settingsData.color_type_metrics);
            try {
              localStorage.setItem("erp_cached_color_type_metrics", JSON.stringify(settingsData.color_type_metrics));
            } catch (e) {}
          }
          if (typeof settingsData.whats_new_title === "string") {
            setWhatsNewTitle(settingsData.whats_new_title);
            try {
              localStorage.setItem("erp_cached_whats_new_title", settingsData.whats_new_title);
            } catch (e) {}
          }
          if (typeof settingsData.whats_new_content === "string") {
            setWhatsNewContent(settingsData.whats_new_content);
            try {
              localStorage.setItem("erp_cached_whats_new_content", settingsData.whats_new_content);
            } catch (e) {}
          }
          if (typeof settingsData.whats_new_updated_at === "string") {
            setWhatsNewUpdatedAt(settingsData.whats_new_updated_at);
            try {
              localStorage.setItem("erp_cached_whats_new_updated_at", settingsData.whats_new_updated_at);
            } catch (e) {}

            // On initial non-silent load, check if we need to show the What's New modal
            if (!isSilent && settingsData.whats_new_title && settingsData.whats_new_updated_at) {
              const lastSeen = localStorage.getItem("whats_new_seen_timestamp");
              if (lastSeen !== settingsData.whats_new_updated_at) {
                setShowWhatsNewModal(true);
              }
            }
          }
        }
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

  // Monitor tab visibility state to pause polling when backgrounded (reduces Fast Origin Transfer)
  const [isTabVisible, setIsTabVisible] = useState<boolean>(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setIsTabVisible(visible);
      if (visible && currentProfile) {
        // Trigger a fresh catch-up fetch immediately when user returns to the tab
        fetchData(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentProfile]);

  useEffect(() => {
    if (!isAutoSyncEnabled || syncInterval <= 0 || !currentProfile || !isTabVisible) return;

    const interval = setInterval(() => {
      fetchData(true); // Background sync silently
    }, syncInterval * 1000);

    return () => clearInterval(interval);
  }, [currentProfile, isAutoSyncEnabled, syncInterval, isTabVisible]);

  // --- SWITCH SIMULATED PROFILE (User Switching) ---
  const handleSwitchProfile = (p: Profile) => {
    setCurrentProfile(p);
    setSyncVersion(""); // Reset sync version to force a complete fresh fetch for the new user profile
    try {
      localStorage.removeItem("erp_sync_version");
    } catch (e) {}
    localStorage.setItem("erp_active_profile", JSON.stringify(p));
    // If operator/manager doesn't have access to tab, reset to general dashboard
    const protectedRolesMap: { [tab: string]: UserRole[] } = {
      admin: ["admin"],
      analytics: ["supervisor", "manager", "admin"],
      data_entry: ["operator", "supervisor", "admin"],
      poly_tracking: ["supervisor", "admin"],
      heat_seal_tracking: ["operator", "supervisor", "manager", "admin"]
    };

    const allowedRoles = protectedRolesMap[activeTab];
    if (allowedRoles && !allowedRoles.includes(p.role)) {
      setActiveTab("dashboard");
    }
  };

  const handleLogout = () => {
    setCurrentProfile(null);
    setSyncVersion("");
    try {
      localStorage.removeItem("erp_sync_version");
    } catch (e) {}
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

  // --- POLY ENTRIES ACTIONS ---
  const handleAddPolyEntry = async (entry_date: string, received: number, reused: number) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };

      const res = await fetch("/api/poly-entries", {
        method: "POST",
        headers,
        body: JSON.stringify({ entry_date, total_received_poly: received, total_reused_poly: reused })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to log poly data.");
      }

      await fetchData(true);
    } catch (err: any) {
      console.error("Error submitting poly entry:", err);
      throw err;
    }
  };

  const handleDeletePolyEntry = async (id: string) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };

      const res = await fetch(`/api/poly-entries/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete poly tracking entry.");
      }

      await fetchData(true);
    } catch (err: any) {
      console.error("Error deleting poly entry:", err);
      throw err;
    }
  };

  const handleUpdatePolyEntry = async (id: string, total_received_poly: number, total_reused_poly: number) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };

      const res = await fetch(`/api/poly-entries/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ total_received_poly, total_reused_poly })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update poly tracking entry.");
      }

      await fetchData(true);
    } catch (err: any) {
      console.error("Error updating poly entry:", err);
      throw err;
    }
  };

  // --- HEAT SEAL ENTRIES ACTIONS ---
  const handleAddHeatSealEntry = async (entry: Partial<HeatSealEntry>) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };

      const res = await fetch("/api/heat-seal-entries", {
        method: "POST",
        headers,
        body: JSON.stringify(entry)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to log heat seal data.");
      }

      await fetchData(true);
    } catch (err: any) {
      console.error("Error submitting heat seal entry:", err);
      throw err;
    }
  };

  const handleUpdateHeatSealEntry = async (id: string, updates: Partial<HeatSealEntry>) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };

      const res = await fetch(`/api/heat-seal-entries/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update heat seal tracking entry.");
      }

      await fetchData(true);
    } catch (err: any) {
      console.error("Error updating heat seal entry:", err);
      throw err;
    }
  };

  const handleDeleteHeatSealEntry = async (id: string) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };

      const res = await fetch(`/api/heat-seal-entries/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete heat seal tracking entry.");
      }

      await fetchData(true);
    } catch (err: any) {
      console.error("Error deleting heat seal entry:", err);
      throw err;
    }
  };

  // --- HEAT SEAL OPERATORS & TARGETS ACTIONS ---
  const handleAddHeatSealOperator = async (operator: Partial<HeatSealOperator>) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };

      const res = await fetch("/api/heat-seal-operators", {
        method: "POST",
        headers,
        body: JSON.stringify(operator)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add operator.");
      }

      await fetchData(true);
    } catch (err: any) {
      console.error("Error adding operator:", err);
      throw err;
    }
  };

  const handleDeleteHeatSealOperator = async (id: string) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };

      const res = await fetch(`/api/heat-seal-operators/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete operator.");
      }

      await fetchData(true);
    } catch (err: any) {
      console.error("Error deleting operator:", err);
      throw err;
    }
  };

  const handleAddHeatSealTarget = async (target: Partial<HeatSealTarget>) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };

      const res = await fetch("/api/heat-seal-targets", {
        method: "POST",
        headers,
        body: JSON.stringify(target)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create target.");
      }

      const successData = await res.json();
      await fetchData(true);
      return successData;
    } catch (err: any) {
      console.error("Error creating target:", err);
      throw err;
    }
  };

  const handleUpdateHeatSealTarget = async (id: string, updates: Partial<HeatSealTarget>) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };

      const res = await fetch(`/api/heat-seal-targets/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update target.");
      }

      const successData = await res.json();
      await fetchData(true);
      return successData;
    } catch (err: any) {
      console.error("Error updating target:", err);
      throw err;
    }
  };

  const handleDeleteHeatSealTarget = async (id: string) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };

      const res = await fetch(`/api/heat-seal-targets/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete target.");
      }

      await fetchData(true);
    } catch (err: any) {
      console.error("Error deleting target:", err);
      throw err;
    }
  };

  // --- REQUISITION ACTIONS ---
  const handleAddRequisition = async (reqData: Omit<Requisition, 'id' | 'status' | 'created_at'>) => {
    const newReq: Requisition = {
      ...reqData,
      id: "req-" + Math.random().toString(36).substring(2, 11),
      status: 'pending',
      created_by: currentProfile?.email || "anonymous",
      created_at: new Date().toISOString()
    };

    setRequisitions(prev => [newReq, ...prev]);

    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };
      await fetch("/api/requisitions", {
        method: "POST",
        headers,
        body: JSON.stringify(newReq)
      });
    } catch (err) {
      console.warn("Backend save failed for requisition, saved locally:", err);
    }
  };

  const handleApproveRequisition = async (id: string, approvedBy: string) => {
    setRequisitions(prev => prev.map(r => r.id === id ? { 
      ...r, 
      status: 'approved' as const, 
      approved_by: approvedBy, 
      approved_at: new Date().toISOString().split('T')[0] 
    } : r));

    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };
      await fetch(`/api/requisitions/${encodeURIComponent(id)}/approve`, {
        method: "POST",
        headers,
        body: JSON.stringify({ approved_by: approvedBy })
      });
    } catch (err) {
      console.warn("Backend approve failed for requisition, updated locally:", err);
    }
  };

  const handleRejectRequisition = async (id: string, rejectedBy: string) => {
    setRequisitions(prev => prev.map(r => r.id === id ? { 
      ...r, 
      status: 'rejected' as const, 
      approved_by: rejectedBy, 
      approved_at: new Date().toISOString().split('T')[0] 
    } : r));

    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };
      await fetch(`/api/requisitions/${encodeURIComponent(id)}/reject`, {
        method: "POST",
        headers,
        body: JSON.stringify({ rejected_by: rejectedBy })
      });
    } catch (err) {
      console.warn("Backend reject failed for requisition, updated locally:", err);
    }
  };

  const handleUpdateRequisition = async (id: string, updatedFields: Partial<Requisition>) => {
    setRequisitions(prev => prev.map(r => r.id === id ? { ...r, ...updatedFields } : r));

    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };
      await fetch(`/api/requisitions/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updatedFields)
      });
    } catch (err) {
      console.warn("Backend update failed for requisition, updated locally:", err);
    }
  };

  const handleDeleteRequisition = async (id: string) => {
    setRequisitions(prev => prev.filter(r => r.id !== id));

    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };
      await fetch(`/api/requisitions/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers
      });
    } catch (err) {
      console.warn("Backend delete failed for requisition, updated locally:", err);
    }
  };

  // --- FABRIC METRICS ENTRY ACTIONS ---
  const handleSubmitFabricMetrics = async (formData: any) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };

      const res = await fetch("/api/fabric-metrics", {
        method: "POST",
        headers,
        body: JSON.stringify(formData)
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Server validation failed");
      }

      await fetchData();
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Submission failed");
    }
  };

  const handleUpdateFabricMetrics = async (id: string, formData: any) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };

      const res = await fetch(`/api/fabric-metrics/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(formData)
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Server update failed");
      }

      await fetchData();
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Update failed");
    }
  };

  const handleDeleteFabricMetrics = async (id: string) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };

      const res = await fetch(`/api/fabric-metrics/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Server delete failed");
      }

      await fetchData();
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Delete failed");
    }
  };

  const handleApproveFabricMetrics = async (id: string, status: "approved" | "rejected") => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile?.role || "operator",
        "X-User-Email": currentProfile?.email || ""
      };

      const res = await fetch(`/api/fabric-metrics/${encodeURIComponent(id)}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status })
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Status update failed");
      }

      await fetchData();
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Status update failed");
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
        body: JSON.stringify({ job_no_digits: digits, is_po_number_required: isPoNumberRequired })
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Setting update failed.");
        return;
      }

      const updated = await res.json();
      setJobNoDigits(updated.job_no_digits);
      setIsPoNumberRequired(updated.is_po_number_required);
      await fetchData();
    } catch (err: any) {
      alert("Failed to update system settings: " + err.message);
    }
  };

  const handleUpdateColorTypeMetrics = async (metrics: any) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers,
        body: JSON.stringify({
          job_no_digits: jobNoDigits,
          color_type_metrics: metrics
        })
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Metrics update failed.");
        return;
      }

      const updated = await res.json();
      if (updated.color_type_metrics) {
        setColorTypeMetrics(updated.color_type_metrics);
      }
      await fetchData();
    } catch (err: any) {
      alert("Failed to update color metrics: " + err.message);
    }
  };

  const handleUpdatePoRequired = async (required: boolean) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers,
        body: JSON.stringify({ job_no_digits: jobNoDigits, is_po_number_required: required })
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Setting update failed.");
        return;
      }

      const updated = await res.json();
      setIsPoNumberRequired(updated.is_po_number_required);
      await fetchData();
    } catch (err: any) {
      alert("Failed to update system settings: " + err.message);
    }
  };

  const handleUpdatePolyPrice = async (price: number) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers,
        body: JSON.stringify({ job_no_digits: jobNoDigits, poly_price: price })
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Setting update failed.");
        return;
      }

      const updated = await res.json();
      if (updated.poly_price !== undefined) {
        setPolyPrice(Number(updated.poly_price));
      }
      await fetchData(true);
    } catch (err: any) {
      alert("Failed to update poly price: " + err.message);
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
        const text = await res.text();
        let errorMessage = "Profile picture update denied.";
        try {
          const body = JSON.parse(text);
          errorMessage = body.error || errorMessage;
        } catch (_) {
          errorMessage = `Server Error (${res.status}): ${text.substring(0, 200) || res.statusText}`;
        }
        alert(errorMessage);
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

  // --- ADMIN: UPDATE USER PERMISSIONS ACTION ---
  const handleUpdateUserPermissions = async (
    id: string,
    can_access_cutting_entry: boolean,
    can_access_remnant_entry: boolean,
    can_access_heat_seal_entry: boolean,
    can_access_poly_entry: boolean,
    can_access_requisition: boolean
  ) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Role": currentProfile.role,
        "X-User-Email": currentProfile.email
      };

      const res = await fetch(`/api/profiles/${id}/permissions`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ 
          can_access_cutting_entry, 
          can_access_remnant_entry,
          can_access_heat_seal_entry,
          can_access_poly_entry,
          can_access_requisition
        })
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Permission modification denied.");
        return;
      }

      const updatedProfile = await res.json();

      // If updating roles/permissions on current active profile, apply change to active state!
      if (id === currentProfile.id) {
        setCurrentProfile(prev => ({
          ...prev,
          can_access_cutting_entry: updatedProfile.can_access_cutting_entry,
          can_access_remnant_entry: updatedProfile.can_access_remnant_entry,
          can_access_heat_seal_entry: updatedProfile.can_access_heat_seal_entry,
          can_access_poly_entry: updatedProfile.can_access_poly_entry,
          can_access_requisition: updatedProfile.can_access_requisition
        }));
      }

      await fetchData();
    } catch (err: any) {
      alert("Failed updating user permissions: " + err.message);
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
          // No alert needed, just silently return or log
          console.log("No new buyers to import from the cache file.");
          return;
        }

        // Removed confirm dialog to prevent iframe blocking. Proceeding automatically.

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

  // --- Dashboard Selected Date States ---
  const mainAvailableDates = useMemo(() => {
    const dates = new Set<string>();
    mainEntries.forEach(e => {
      if (e.entry_date) {
        dates.add(e.entry_date);
      }
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [mainEntries]);

  const stripeAvailableDates = useMemo(() => {
    const dates = new Set<string>();
    stripeEntries.forEach(e => {
      if (e.entry_date) {
        dates.add(e.entry_date);
      }
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [stripeEntries]);

  const heatSealAvailableDates = useMemo(() => {
    const dates = new Set<string>();
    heatSealEntries.forEach(e => {
      if (e.entry_date) {
        dates.add(e.entry_date);
      }
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [heatSealEntries]);

  const fallbackDate = useMemo(() => getCurrentProductionDateAndShift().entry_date, []);

  const [mainSelectedDate, setMainSelectedDate] = useState<string>("");
  const [stripeSelectedDate, setStripeSelectedDate] = useState<string>("");

  const activeMainSelectedDate = mainSelectedDate || (mainAvailableDates.length > 0 ? mainAvailableDates[0] : fallbackDate);
  const activeStripeSelectedDate = stripeSelectedDate || (stripeAvailableDates.length > 0 ? stripeAvailableDates[0] : fallbackDate);

  // --- Aggregate Dashboard Stats ---
  const compiledMainKPIs = useMemo(() => {
    return compileDashboardKPIs(mainEntries, activeMainSelectedDate);
  }, [mainEntries, activeMainSelectedDate]);

  const compiledStripeKPIs = useMemo(() => {
    return compileDashboardKPIs(stripeEntries, activeStripeSelectedDate);
  }, [stripeEntries, activeStripeSelectedDate]);

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
      case "poly_tracking":
        return "Poly Tracking & Re-Use";
      case "heat_seal_tracking":
        return "Daily Heat-Seal Production Tracking";
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
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
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
                          {[30, 60, 120, 300].map((sec) => (
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
                              {sec === 30 ? "30s" : sec === 60 ? "1m" : sec === 120 ? "2m" : "5m"}
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
              <div className="space-y-8 animate-fade-in">
                {/* Live Production Dashboard View Selector Sub-Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850/80">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                      Operations Console
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Select production metrics view layout for active cutting floor tables.
                    </p>
                  </div>
                  <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/60 self-start sm:self-auto font-sans shadow-xs">
                    <button
                      onClick={() => setDashboardSubTab("standard")}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        dashboardSubTab === "standard"
                          ? "bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      Daily Shifts & Trends
                    </button>
                    <button
                      onClick={() => setDashboardSubTab("table_wise")}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        dashboardSubTab === "table_wise"
                          ? "bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      Live Production
                    </button>
                  </div>
                </div>

                {dashboardSubTab === "standard" ? (
                  <div className="space-y-12">
                    {/* --- SECTION 1: DAILY OPERATIONS & ANALYTICS --- */}
                    <div className="space-y-6">
                      <div className="border-b border-slate-200 dark:border-slate-800/80 pb-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black tracking-widest text-blue-600 dark:text-blue-400 uppercase">
                            Active Session
                          </span>
                          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
                            Daily Operations & Cutting-Floor Reports
                          </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Real-time interactive shift report logs, supervisor metrics, and daily throughput trends.
                        </p>
                      </div>
                      <KPICards 
                        metrics={compiledMainKPIs} 
                        group="daily" 
                        selectedDate={activeMainSelectedDate}
                        setSelectedDate={setMainSelectedDate}
                        availableDates={mainAvailableDates}
                        polyEntries={polyEntries}
                        polyPrice={polyPrice}
                        entries={mainEntries}
                      />
                      <DailyReport 
                        entries={mainEntries} 
                        machines={machines} 
                        selectedDate={activeMainSelectedDate}
                        setSelectedDate={setMainSelectedDate}
                      />
                    </div>

                    {/* --- SECTION 1.5: DAILY HEAT SEAL ANALYSIS & INSIGHTS --- */}
                    <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800/60">
                      <HeatSealDashboardInsight 
                        entries={heatSealEntries}
                        selectedDate={activeMainSelectedDate}
                        availableDates={heatSealAvailableDates}
                      />
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
                      <KPICards 
                        metrics={compiledMainKPIs} 
                        group="monthly" 
                        polyEntries={polyEntries}
                        polyPrice={polyPrice}
                        entries={mainEntries}
                      />
                      <DashboardCharts entries={mainEntries} machines={machines} />
                    </div>
                  </div>
                ) : (
                  <TableProductionView entries={mainEntries} />
                )}
              </div>
            )}

            {/* TAB 1.2: FABRIC METRICS SPECIFICATION */}
            {activeTab === "fabric_metrics" && (
              <div className="space-y-6 animate-fade-in">
                <FabricMetricsModule
                  fabricMetrics={fabricMetrics}
                  buyers={buyers}
                  currentProfile={currentProfile}
                  onSubmitEntry={handleSubmitFabricMetrics}
                  onUpdateEntry={handleUpdateFabricMetrics}
                  onDeleteEntry={handleDeleteFabricMetrics}
                  onApproveEntry={handleApproveFabricMetrics}
                  onRefresh={() => fetchData(true)}
                />
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
                  <KPICards 
                    metrics={compiledStripeKPIs} 
                    group="daily" 
                    selectedDate={activeStripeSelectedDate}
                    setSelectedDate={setStripeSelectedDate}
                    availableDates={stripeAvailableDates}
                    polyEntries={polyEntries}
                    polyPrice={polyPrice}
                    entries={stripeEntries}
                  />
                  <DailyReport 
                    entries={stripeEntries} 
                    machines={machines} 
                    selectedDate={activeStripeSelectedDate}
                    setSelectedDate={setStripeSelectedDate}
                  />
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
                  <KPICards 
                    metrics={compiledStripeKPIs} 
                    group="monthly" 
                    polyEntries={polyEntries}
                    polyPrice={polyPrice}
                    entries={stripeEntries}
                  />
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
                    onRefresh={() => fetchData(true)}
                    polyEntries={polyEntries}
                    polyPrice={polyPrice}
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
                  fabricMetrics={fabricMetrics}
                  onSubmitEntry={handleSubmitEntry}
                  onWebImport={handleBulkImport}
                  jobNoDigits={jobNoDigits}
                  isPoNumberRequired={isPoNumberRequired}
                  colorTypeMetrics={colorTypeMetrics}
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
                  onRefresh={() => fetchData(true)}
                  polyEntries={polyEntries}
                  polyPrice={polyPrice}
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

            {/* TAB 4.5: POLY RECEIVED & RE-USE */}
            {activeTab === "poly_tracking" && (
              <div className="animate-fade-in">
                <PolyTrackingModule
                  polyEntries={polyEntries}
                  currentProfile={currentProfile!}
                  onSubmitPolyEntry={handleAddPolyEntry}
                  onUpdatePolyEntry={handleUpdatePolyEntry}
                  onDeletePolyEntry={handleDeletePolyEntry}
                  polyPrice={polyPrice}
                />
              </div>
            )}

            {/* TAB 4.6: HEAT SEAL TRACKING */}
            {activeTab === "heat_seal_tracking" && (
              <div className="animate-fade-in">
                <HeatSealModule
                  entries={heatSealEntries}
                  operators={heatSealOperators}
                  targets={heatSealTargets}
                  currentProfile={currentProfile!}
                  onSubmitEntry={handleAddHeatSealEntry}
                  onUpdateEntry={handleUpdateHeatSealEntry}
                  onDeleteEntry={handleDeleteHeatSealEntry}
                  onAddOperator={handleAddHeatSealOperator}
                  onDeleteOperator={handleDeleteHeatSealOperator}
                  onAddTarget={handleAddHeatSealTarget}
                  onUpdateTarget={handleUpdateHeatSealTarget}
                  onDeleteTarget={handleDeleteHeatSealTarget}
                  schemaDDL={SCHEMA_DDL_STRING}
                  rlsDDL={RLS_DDL_STRING}
                />
              </div>
            )}

            {/* TAB 4.7: REQUISITIONS MODULE */}
            {activeTab === "requisitions" && (
              <div className="animate-fade-in">
                <RequisitionModule
                  requisitions={requisitions}
                  currentProfile={currentProfile!}
                  onAddRequisition={handleAddRequisition}
                  onApproveRequisition={handleApproveRequisition}
                  onRejectRequisition={handleRejectRequisition}
                  onUpdateRequisition={handleUpdateRequisition}
                  onDeleteRequisition={handleDeleteRequisition}
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
                  onUpdatePermissions={handleUpdateUserPermissions}
                  onAddMachine={handleAddMachine}
                  schemaDDL={SCHEMA_DDL_STRING}
                  rlsDDL={RLS_DDL_STRING}
                  buyers={buyers}
                  onAddBuyer={handleAddBuyer}
                  onDownloadBuyersCache={handleDownloadBuyersCache}
                  onUploadBuyersCache={handleUploadBuyersCache}
                  jobNoDigits={jobNoDigits}
                  onUpdateJobNoDigits={handleUpdateJobNoDigits}
                  isPoNumberRequired={isPoNumberRequired}
                  onUpdatePoRequired={handleUpdatePoRequired}
                  onAddUser={handleAdminCreateUser}
                  whatsNewTitle={whatsNewTitle}
                  whatsNewContent={whatsNewContent}
                  whatsNewUpdatedAt={whatsNewUpdatedAt}
                  onUpdateWhatsNew={handleUpdateWhatsNew}
                  polyPrice={polyPrice}
                  onUpdatePolyPrice={handleUpdatePolyPrice}
                  colorTypeMetrics={colorTypeMetrics}
                  onUpdateColorTypeMetrics={handleUpdateColorTypeMetrics}
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
                <CustomDatePicker 
                  selectedDate={editingEntry.entry_date}
                  onChange={date => setEditingEntry({ ...editingEntry, entry_date: date })}
                  className="!h-8"
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
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">PO Number</label>
                <input 
                  type="text"
                  value={editingEntry.po_no || ''}
                  onChange={e => setEditingEntry({ ...editingEntry, po_no: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Color</label>
                <input 
                  type="text"
                  value={editingEntry.color}
                  onChange={e => setEditingEntry({ ...editingEntry, color: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Item</label>
                <input 
                  type="text"
                  value={editingEntry.item}
                  onChange={e => setEditingEntry({ ...editingEntry, item: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Cut Number</label>
                <input 
                  type="text"
                  value={editingEntry.cut_no}
                  onChange={e => setEditingEntry({ ...editingEntry, cut_no: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Table Number</label>
                <input 
                  type="text"
                  value={editingEntry.table_no}
                  onChange={e => setEditingEntry({ ...editingEntry, table_no: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Fabric Type</label>
                <input 
                  type="text"
                  value={editingEntry.fabric_type}
                  onChange={e => setEditingEntry({ ...editingEntry, fabric_type: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Parts</label>
                <input 
                  type="text"
                  value={editingEntry.parts}
                  onChange={e => setEditingEntry({ ...editingEntry, parts: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Reject Qty</label>
                <input 
                  type="number"
                  value={editingEntry.reject_qty || 0}
                  onChange={e => setEditingEntry({ ...editingEntry, reject_qty: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Supervisor Name</label>
                <input 
                  type="text"
                  value={editingEntry.supervisor_name || ''}
                  onChange={e => setEditingEntry({ ...editingEntry, supervisor_name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                />
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

              {/* Size-Wise Production Ratio breakdown */}
              <div className="col-span-1 md:col-span-2 bg-slate-50/75 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg p-3 mt-1 font-sans">
                <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-slate-200/50 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">
                      Size-Wise Production Ratio
                    </span>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Marker ratios here drive the total Ratio automatically.
                    </p>
                  </div>
                </div>

                {(() => {
                  const activeSpec = editingEntry.fabric_metric_id
                    ? fabricMetrics.find(m => m.id === editingEntry.fabric_metric_id)
                    : null;
                  const activeSpecSizes = activeSpec?.size_bookings ? Object.keys(activeSpec.size_bookings) : [];
                  const defaultSizes = ["S", "M", "L", "XL", "XXL"];
                  
                  const allVisibleSizes = sortSizes(Array.from(new Set([
                    ...Object.keys(editingEntry.sizes || {}),
                    ...(activeSpecSizes.length > 0 ? activeSpecSizes : (Object.keys(editingEntry.sizes || {}).length === 0 ? defaultSizes : []))
                  ])));

                  if (allVisibleSizes.length === 0) {
                    return (
                      <p className="text-[10px] text-slate-400 text-center py-1">
                        No sizes configured.
                      </p>
                    );
                  }

                  const layVal = Number(editingEntry.lay) || 0;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {allVisibleSizes.map(sz => {
                        const ratioVal = editingEntry.sizes?.[sz] !== undefined ? editingEntry.sizes[sz] : 0;
                        const computedQty = layVal * ratioVal;

                        return (
                          <div key={sz} className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{sz}</span>
                              {computedQty > 0 && (
                                <span className="text-[9px] font-mono text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-1 rounded">
                                  {computedQty}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-slate-400">Ratio:</span>
                              <input
                                type="number"
                                min="0"
                                value={ratioVal === 0 ? "" : ratioVal}
                                onChange={(e) => handleEditSizeRatioChange(sz, e.target.value)}
                                placeholder="0"
                                className="w-full h-6 text-[10px] text-center border border-slate-200 dark:border-slate-800 rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
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
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Booking Consumption</label>
                <input 
                  type="number"
                  step="0.001"
                  value={editingEntry.booking_consumption || ''}
                  onChange={e => setEditingEntry({ ...editingEntry, booking_consumption: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
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
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Marker Length Inch</label>
                <input 
                  type="number"
                  step="0.01"
                  value={editingEntry.marker_length_inch}
                  onChange={e => setEditingEntry({ ...editingEntry, marker_length_inch: Number(e.target.value) })}
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

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Marker Consumption</label>
                <input 
                  type="number"
                  step="0.001"
                  value={editingEntry.marker_consumption || ''}
                  onChange={e => setEditingEntry({ ...editingEntry, marker_consumption: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Remarks</label>
                <textarea 
                  value={editingEntry.remarks}
                  onChange={e => setEditingEntry({ ...editingEntry, remarks: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 focus:outline-none"
                />
              </div>

              <div className="col-span-2 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                {/* Left side: Delete options for Admin and Supervisor */}
                {currentProfile && (currentProfile.role === "admin" || currentProfile.role === "supervisor" || currentProfile.role === "operator" || currentProfile.role === "manager") ? (
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
