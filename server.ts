import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import compression from "compression";
import { calculateFields } from "./src/utils/calculations";
import { CuttingEntry, Machine, Profile, AuditLog, UserRole } from "./src/types";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = 3000;

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Serve robots.txt to instruct well-behaved bots not to crawl
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nDisallow: /\n");
});

// Anti-Bot / Bot Blocker Middleware
app.use((req, res, next) => {
  // Allow robots.txt to be read so crawlers know they are disallowed
  if (req.path === "/robots.txt") {
    return next();
  }

  const ua = req.headers["user-agent"];
  if (!ua) {
    // Block requests with no User-Agent header as they are usually scripts/bots
    console.log(`[Bot Blocked] No User-Agent provided - Path: ${req.path}`);
    return res.status(403).send("Forbidden: Requests must include a valid User-Agent.");
  }

  const uaLower = ua.toLowerCase();

  // Robust list of bot keywords, scrapers, crawlers, and library-based HTTP clients
  const botKeywords = [
    "bot",
    "crawler",
    "spider",
    "scraper",
    "headless",
    "crawl",
    "slurp",
    "transcoder",
    "mediapartners-google",
    "adsbot",
    "gptbot",
    "chatgpt",
    "claudebot",
    "anthropic",
    "perplexity",
    "cohere",
    "bytespider",
    "ccbot",
    "semrush",
    "ahrefs",
    "mj12",
    "dotbot",
    "rogerbot",
    "exabot",
    "screaming frog",
    "baiduspider",
    "yandex",
    "sogou",
    "duckduckbot",
    "ia_archiver",
    "curl",
    "wget",
    "python",
    "scrapy",
    "urllib",
    "axios",
    "http-client",
    "node-fetch",
    "got",
    "superagent",
    "libwww",
    "selenium",
    "webdriver",
    "puppeteer",
    "playwright"
  ];

  const isBot = botKeywords.some(keyword => uaLower.includes(keyword));

  if (isBot) {
    console.log(`[Bot Blocked] User-Agent: "${ua}" - Path: ${req.path}`);
    return res.status(403).send("Forbidden: Bot traffic is not permitted on this application.");
  }

  next();
});

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("⚠️ SECURITY WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in the environment (.env file). Set them to connect to your database.");
}

const supabase = createClient(
  supabaseUrl || "https://placeholder-project.supabase.co",
  supabaseServiceKey || "placeholder-service-key-missing-in-env",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper to fetch all cutting entries using pagination
async function fetchAllCuttingEntries() {
  let allEntries: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    try {
      const { data, error } = await supabase
        .from("cutting_entries")
        .select("*")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.warn(`Error on page ${page} fetching cutting_entries with select(*):`, error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("cutting_entries")
          .select("id, entry_date, shift, machine_id, buyer, job_no, color, po_no, item, cut_no, lay, ratio, table_no, fabric_type, parts, fabric_used_kg, remnant_weight_kg, booking_consumption, cutting_consumption, cutting_scrap_weight_kg, reject_qty, marker_length_inch, marker_efficiency_percent, remarks, supervisor_name, created_by, approved_by, status, created_at")
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (fallbackError) {
          console.error("Fallback query in fetchAllCuttingEntries failed:", fallbackError.message);
          hasMore = false;
          break;
        }

        if (!fallbackData || fallbackData.length === 0) {
          hasMore = false;
        } else {
          allEntries = allEntries.concat(fallbackData);
          if (fallbackData.length < pageSize) hasMore = false;
          else page++;
        }
      } else {
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allEntries = allEntries.concat(data);
          if (data.length < pageSize) hasMore = false;
          else page++;
        }
      }
    } catch (err: any) {
      console.error("Caught error in fetchAllCuttingEntries pagination:", err);
      hasMore = false;
      break;
    }
  }

  return (allEntries || []).map((e: any) => ({
    ...e,
    sizes: e.sizes || {},
    color_type: e.color_type || "Solid",
    order_qty: Number(e.order_qty) || 0,
    total_length_inch: Number(e.total_length_inch) || 0,
    spreading_scrap_kg: Number(e.spreading_scrap_kg) || (Number(e.fabric_used_kg) * 0.025),
    scrap_percent_per_marker: Number(e.scrap_percent_per_marker) || (100.00 - (Number(e.marker_efficiency_percent) || 0)),
    fabric_metric_id: e.fabric_metric_id || null
  }));
}

// Robust helper to fetch a single cutting entry with fallback for missing column
async function fetchSingleCuttingEntry(id: string) {
  try {
    const { data, error } = await supabase
      .from("cutting_entries")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.warn("Single fetch with select(*) failed, trying basic fields fallback:", error.message);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("cutting_entries")
        .select("id, entry_date, shift, machine_id, buyer, job_no, color, po_no, item, cut_no, lay, ratio, table_no, fabric_type, parts, fabric_used_kg, remnant_weight_kg, booking_consumption, cutting_consumption, cutting_scrap_weight_kg, reject_qty, marker_length_inch, marker_efficiency_percent, remarks, supervisor_name, created_by, approved_by, status, created_at")
        .eq("id", id)
        .single();

      if (fallbackError) throw fallbackError;
      const fb = fallbackData as any;
      return {
        ...fb,
        sizes: fb?.sizes || {},
        color_type: fb?.color_type || "Solid",
        order_qty: Number(fb?.order_qty) || 0,
        total_length_inch: Number(fb?.total_length_inch) || 0,
        spreading_scrap_kg: Number(fb?.spreading_scrap_kg) || (Number(fb?.fabric_used_kg) * 0.025),
        scrap_percent_per_marker: Number(fb?.scrap_percent_per_marker) || (100.00 - (Number(fb?.marker_efficiency_percent) || 0)),
        fabric_metric_id: fb?.fabric_metric_id || null
      };
    }
    return {
      ...data,
      sizes: data?.sizes || {},
      color_type: data?.color_type || "Solid",
      order_qty: Number(data?.order_qty) || 0,
      total_length_inch: Number(data?.total_length_inch) || 0,
      spreading_scrap_kg: Number(data?.spreading_scrap_kg) || (Number(data?.fabric_used_kg) * 0.025),
      scrap_percent_per_marker: Number(data?.scrap_percent_per_marker) || (100.00 - (Number(data?.marker_efficiency_percent) || 0)),
      fabric_metric_id: data?.fabric_metric_id || null
    };
  } catch (err: any) {
    console.error("Error in fetchSingleCuttingEntry:", err);
    throw err;
  }
}

// Paginated helper to fetch all heat seal entries
async function fetchAllHeatSealEntries() {
  let allEntries: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("heat_seal_entries")
      .select("id, entry_date, shift, operator_name, operator_id, designation, job_no, color, po_no, target_id, hourly_data, created_by, status, created_at, updated_at")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allEntries = allEntries.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }
  return allEntries;
}

// System Settings persistence
let settingsFilePath = path.join(process.cwd(), "settings.json");
let systemSettings = {
  job_no_digits: 7,
  is_po_number_required: false,
  whats_new_title: "",
  whats_new_content: "",
  whats_new_updated_at: "",
  poly_price: 1.50,
  color_type_metrics: {
    "Solid": {
      "above_10000": 3.0,
      "between_5001_9999": 4.0,
      "between_2001_5000": 5.0,
      "between_1000_2000": 6.0,
      "below_1000": 8.0
    },
    "RFD Wash": {
      "above_10000": 8.0,
      "between_5001_9999": 10.0,
      "between_2001_5000": 12.0,
      "between_1000_2000": 14.0,
      "below_1000": 17.0
    },
    "RFD Wash(Print/Embordery)": {
      "above_10000": 9.5,
      "between_5001_9999": 11.5,
      "between_2001_5000": 13.8,
      "between_1000_2000": 18.0,
      "below_1000": 19.5
    },
    "Print/Embordery Send": {
      "above_10000": 9.5,
      "between_5001_9999": 11.5,
      "between_2001_5000": 13.8,
      "between_1000_2000": 18.0,
      "below_1000": 19.5
    },
    "Print & Embordery Send": {
      "above_10000": 9.5,
      "between_5001_9999": 11.5,
      "between_2001_5000": 13.8,
      "between_1000_2000": 18.0,
      "below_1000": 19.5
    }
  }
};

function loadSettings() {
  try {
    const tmpPath = path.join("/tmp", "settings.json");
    if (fs.existsSync(tmpPath)) {
      settingsFilePath = tmpPath;
    }

    if (fs.existsSync(settingsFilePath)) {
      const content = fs.readFileSync(settingsFilePath, "utf-8");
      systemSettings = JSON.parse(content);
      console.log("Loaded system settings from:", settingsFilePath, systemSettings);
    } else {
      try {
        fs.writeFileSync(settingsFilePath, JSON.stringify(systemSettings, null, 2), "utf-8");
        console.log("Created default system settings at:", settingsFilePath);
      } catch (writeErr: any) {
        console.warn(`Cannot write to primary path ${settingsFilePath}: ${writeErr.message}. Falling back to /tmp/settings.json`);
        settingsFilePath = tmpPath;
        fs.writeFileSync(settingsFilePath, JSON.stringify(systemSettings, null, 2), "utf-8");
        console.log("Created default system settings in /tmp at:", settingsFilePath);
      }
    }
  } catch (err: any) {
    console.error("Error loading system settings:", err.message);
  }
}

function saveSettings(settings: any) {
  try {
    try {
      fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), "utf-8");
    } catch (writeErr: any) {
      console.warn(`Failed writing to settingsFilePath (${settingsFilePath}): ${writeErr.message}. Retrying with /tmp/settings.json`);
      settingsFilePath = path.join("/tmp", "settings.json");
      fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), "utf-8");
    }
    systemSettings = settings;
    console.log("Saved system settings:", systemSettings);
    return true;
  } catch (err: any) {
    console.error("Error saving system settings:", err.message);
    // Ultimate fallback: save in memory so the app functions perfectly, even if the disk is fully read-only
    systemSettings = settings;
    return true;
  }
}

// Call loadSettings on startup
loadSettings();

// Server-side cache for sync metadata and job lookups to reduce Supabase hits and server CPU
let lastMetadataCheck = 0;
let cachedMetadata: string | null = null;
const METADATA_CACHE_TTL = 15000; // 15 seconds cache for metadata checks when idle
const jobLookupCache = new Map<string, { timestamp: number; response: any }>();

// Middleware to automatically invalidate sync metadata and lookup cache on any database mutation (POST, PUT, DELETE)
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    cachedMetadata = null;
    lastMetadataCheck = 0;
    jobLookupCache.clear();
  }
  next();
});

// Sync settings with Supabase
async function syncSettingsWithDB() {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "app_settings")
      .maybeSingle();

    if (error) {
      console.warn("Failed to fetch settings from DB:", error.message);
      return;
    }
    
    if (data && data.value) {
      systemSettings = { ...systemSettings, ...data.value };
      console.log("Merged settings from DB:", systemSettings);
      saveSettings(systemSettings);
    } else {
      await supabase.from("settings").insert({ key: "app_settings", value: systemSettings });
    }
  } catch (err: any) {
    console.warn("Failed to sync settings with DB:", err.message);
  }
}
syncSettingsWithDB();

// In-memory cache for database buyers
let cachedBuyers: any[] | null = null;

// Helper to auto-sync and register new buyers in the DB buyers table
async function ensureBuyerExists(buyerName: string) {
  if (!buyerName) return;
  const cleanName = buyerName.trim().toUpperCase();
  if (!cleanName) return;

  try {
    // Check if buyer already exists in buyers table
    const { data: existing, error: checkError } = await supabase
      .from("buyers")
      .select("id")
      .ilike("name", cleanName);

    if (checkError) {
      console.warn("Error checking existing buyer:", checkError.message);
    }

    if (!existing || existing.length === 0) {
      // Not found, insert it so it becomes synced for all users automatically
      const { error: insertError } = await supabase
        .from("buyers")
        .insert({ name: cleanName });

      if (insertError) {
        console.warn("Could not auto-register new buyer:", insertError.message);
      } else {
        console.log(`Successfully auto-registered new buyer in DB: ${cleanName}`);
        cachedBuyers = null; // Invalidate memory cache so next GET fetches from DB
      }
    }
  } catch (err: any) {
    console.warn("Failed in ensureBuyerExists auto-sync:", err.message || err);
  }
}


// Helper to map UI shift values ('D', 'N') to DB-compliant shift values ('A', 'B')
function mapShiftToDb(shift: string | undefined): string | undefined {
  if (!shift) return shift;
  const upper = shift.toUpperCase();
  if (upper === "D") return "A";
  if (upper === "N") return "B";
  return shift;
}

// Helper to map DB-compliant shift values ('A', 'B') to UI-friendly shift values ('D', 'N')
function mapShiftFromDb(shift: string | undefined): string | undefined {
  if (!shift) return shift;
  const upper = shift.toUpperCase();
  if (upper === "A") return "D";
  if (upper === "B") return "N";
  return shift;
}


// Helper to add audit log
async function addAuditLog(
  user_email: string,
  action: 'create' | 'edit' | 'delete' | 'approve',
  entity_type: string,
  entity_id: string,
  old_value?: any,
  new_value?: any
) {
  try {
    const { data: prof } = await supabase.from("profiles").select("id").eq("email", user_email).single();

    let parsedEntityId = entity_id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(entity_id)) {
      parsedEntityId = "00000000-0000-0000-0000-000000000000";
    }

    await supabase.from("audit_logs").insert({
      user_id: prof?.id || null,
      user_email,
      action,
      entity_type,
      entity_id: parsedEntityId,
      old_value: old_value ? old_value : null,
      new_value: new_value ? new_value : null
    });
  } catch (err: any) {
    console.error("Error creating audit log in Supabase:", err.message);
  }
}

// Helper to sanitize shift to a single character ('A', 'B', 'C') matching CHAR(1) constraints
function sanitizeShift(val: any): string {
  if (typeof val !== "string") return "A";
  const clean = val.trim().toUpperCase();
  if (clean === "A" || clean === "B" || clean === "C") return clean;
  // If "Day" or "Night", map Day -> A, Night -> B
  if (clean.includes("DAY") || clean.startsWith("D")) return "A";
  if (clean.includes("NIGHT") || clean.startsWith("N")) return "B";
  // Handle strings like "Shift A", "Shift B", "Shift C" or "A Shift"
  if (clean.includes("A")) return "A";
  if (clean.includes("B")) return "B";
  if (clean.includes("C")) return "C";
  // If first letter is A, B, or C
  if (clean.length > 0 && ["A", "B", "C"].includes(clean[0])) return clean[0];
  return "A"; // Safe fallback
}

// ==========================================
// 1. AUTHENTICATION API (Supabase Direct Sync)
// ==========================================

app.post("/api/auth/signup", async (req, res) => {
  const { email, password, full_name, role, department } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const userName = full_name?.trim() || normalizedEmail.split("@")[0].toUpperCase();
  const userRole = role || "operator";
  const userDept = department?.trim() || "Cutting Deck 1";

  try {
    // Register with Supabase Auth (backend-proxied, auto-confirmed via admin API to avoid email verification blocks)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true
    });

    if (authError) {
      throw authError;
    }

    const userId = authData.user?.id || "00000000-0000-0000-0000-000000000000";
    
    const newProfile: any = {
      id: userId,
      full_name: userName,
      email: normalizedEmail,
      role: userRole,
      department: userDept
    };

    // Insert into Supabase profiles table
    let dbError: any = null;
    try {
      const { error } = await supabase
        .from("profiles")
        .insert({
          ...newProfile,
          can_access_cutting_entry: true,
          can_access_remnant_entry: true,
          can_access_heat_seal_entry: true,
          can_access_poly_entry: true,
          can_access_requisition: true
        });
      dbError = error;
    } catch (err: any) {
      dbError = err;
    }

    if (dbError && (dbError.code === "42703" || dbError.message?.includes("column"))) {
      const { error } = await supabase
        .from("profiles")
        .insert(newProfile);
      dbError = error;
    }

    if (dbError) {
      console.warn("Could not insert profile in Supabase table:", dbError.message);
      return res.status(400).json({ error: dbError.message });
    }

    // Set default permissions in systemSettings
    if (!(systemSettings as any).user_permissions) {
      (systemSettings as any).user_permissions = {};
    }
    (systemSettings as any).user_permissions[userId] = {
      can_access_cutting_entry: true,
      can_access_remnant_entry: true,
      can_access_heat_seal_entry: true,
      can_access_poly_entry: true,
      can_access_requisition: true
    };
    saveSettings(systemSettings);

    const enrichedProfile = {
      ...newProfile,
      can_access_cutting_entry: true,
      can_access_remnant_entry: true,
      can_access_heat_seal_entry: true,
      can_access_poly_entry: true,
      can_access_requisition: true
    };

    return res.json({ profile: enrichedProfile, message: "Account created successfully" });

  } catch (err: any) {
    console.error("Supabase authentication signup error:", err.message);
    return res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Authenticate with Supabase Auth using a temporary client to avoid mutating the main service-role client
    const tempAuthClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    let authResult = await tempAuthClient.auth.signInWithPassword({
      email: normalizedEmail,
      password: password
    });

    if (authResult.error) {
      const errMsg = authResult.error.message.toLowerCase();
      if (errMsg.includes("email not confirmed") || errMsg.includes("confirm")) {
        console.log(`User ${normalizedEmail} has unconfirmed email. Attempting admin auto-confirmation...`);
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
        if (!listError && usersData?.users) {
          const match = (usersData.users as any[]).find((u: any) => u.email?.toLowerCase() === normalizedEmail);
          if (match) {
            console.log(`Found matching user ${match.id}. Confirming email...`);
            const { error: updateError } = await supabase.auth.admin.updateUserById(match.id, {
              email_confirm: true
            });
            if (!updateError) {
              console.log("Auto-confirmation successful. Retrying sign-in...");
              authResult = await tempAuthClient.auth.signInWithPassword({
                email: normalizedEmail,
                password: password
              });
            } else {
              console.error("Failed to update user email_confirm state:", updateError.message);
            }
          } else {
            console.warn("No user matched in admin list for auto-confirmation.");
          }
        } else {
          console.error("Failed to list users for auto-confirmation:", listError?.message);
        }
      }
    }

    if (authResult.error) {
      throw authResult.error;
    }

    const authData = authResult.data;

    if (authData.user) {
      // Fetch profile
      const { data: profile, error: dbErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, department, avatar_url, created_at, can_access_cutting_entry, can_access_remnant_entry, can_access_heat_seal_entry, can_access_poly_entry")
        .eq("id", authData.user.id)
        .single();

      if (dbErr) {
        throw new Error("Could not fetch user profile from Supabase: " + dbErr.message);
      }

      if (profile) {
        // Enrich profile with permissions from systemSettings if missing or for backward compatibility
        const userPerms = (systemSettings as any).user_permissions?.[profile.id];
        const enrichedProfile = {
          ...profile,
          can_access_cutting_entry: userPerms?.can_access_cutting_entry ?? profile.can_access_cutting_entry ?? true,
          can_access_remnant_entry: userPerms?.can_access_remnant_entry ?? profile.can_access_remnant_entry ?? true,
          can_access_heat_seal_entry: userPerms?.can_access_heat_seal_entry ?? profile.can_access_heat_seal_entry ?? true,
          can_access_poly_entry: userPerms?.can_access_poly_entry ?? profile.can_access_poly_entry ?? true,
          can_access_requisition: userPerms?.can_access_requisition ?? (profile as any).can_access_requisition ?? true
        };
        return res.json({ profile: enrichedProfile });
      }
    }
    throw new Error("Profile not found for authenticated user.");
  } catch (err: any) {
    console.error("Supabase login auth error:", err.message);
    return res.status(400).json({ error: "Authentication failed: " + err.message });
  }
});

// ==========================================
// 2. MACHINES API
// ==========================================

app.get("/api/machines", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "private, no-cache, must-revalidate");
    const { data: supabaseMachines, error: sbError } = await supabase
      .from("machines")
      .select("id, machine_name, machine_type")
      .order("machine_name", { ascending: true });

    if (sbError) {
      return res.status(500).json({ error: sbError.message });
    }

    if (supabaseMachines && supabaseMachines.length > 0) {
      return res.json(supabaseMachines);
    } else {
      // Seed default machines inside Supabase table if it is empty
      const defaultMachinesToInsert = [
        { machine_name: "Auto Cutter Machine 1", machine_type: "Auto" },
        { machine_name: "Auto Cutter Machine 2", machine_type: "Auto" },
        { machine_name: "Manual Cutting Machine", machine_type: "Manual" },
        { machine_name: "Stripe Cutting", machine_type: "Stripe" }
      ];

      const { data: seededMachines, error: seedError } = await supabase
        .from("machines")
        .insert(defaultMachinesToInsert)
        .select();

      if (seedError) {
        return res.status(500).json({ error: "Could not seed machines: " + seedError.message });
      }

      return res.json(seededMachines || []);
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/machines", async (req, res) => {
  const { machine_name, machine_type } = req.body;
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = req.headers["x-user-email"] as string;

  if (user_role !== "admin" && user_role !== "supervisor" && user_role !== "manager") {
    return res.status(403).json({ error: "Permission Denied. Only Admin and Officer can add machines." });
  }

  if (!machine_name || !machine_type) {
    return res.status(400).json({ error: "Name and type are required." });
  }

  try {
    const { data: newMachine, error: insertError } = await supabase
      .from("machines")
      .insert({ machine_name, machine_type })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    await addAuditLog(user_email || "system", "create", "machine", newMachine.id, null, newMachine);

    return res.json(newMachine);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2.5 BUYERS API
// ==========================================

app.get("/api/buyers", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "private, no-cache, must-revalidate");
    // If we have cached buyers, return them immediately
    if (cachedBuyers !== null) {
      return res.json(cachedBuyers);
    }

    const { data: buyers, error } = await supabase
      .from("buyers")
      .select("id, name, created_at")
      .order("name", { ascending: true });

    if (error) {
      console.error("Could not fetch buyers from Supabase:", error.message);
      return res.json([]);
    }

    // Save database buyers to memory cache
    cachedBuyers = buyers || [];
    return res.json(cachedBuyers);
  } catch (err: any) {
    return res.status(555).json({ error: err.message });
  }
});

app.post("/api/buyers", async (req, res) => {
  const { name } = req.body;
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = req.headers["x-user-email"] as string;

  if (user_role !== "admin" && user_role !== "supervisor" && user_role !== "manager") {
    return res.status(403).json({ error: "Only Admin and Officer can register new buyers." });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Buyer name is required." });
  }

  try {
    const cleanName = name.trim().toUpperCase();
    const { data: newBuyer, error: insertError } = await supabase
      .from("buyers")
      .insert({ name: cleanName })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    // Invalidate memory cache so it re-fetches from DB
    cachedBuyers = null;

    await addAuditLog(user_email || "system", "create", "buyer", newBuyer.id, null, newBuyer);

    return res.json(newBuyer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. CUTTING ENTRIES API (CRUD + RLS Flow)
// ==========================================

app.get("/api/entries", async (req, res) => {
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  try {
    res.setHeader("Cache-Control", "private, no-cache, must-revalidate");
    
    const entries = await fetchAllCuttingEntries();

    const { data: profiles } = await supabase.from("profiles").select("id, email");
    const profileMap = new Map((profiles || []).map(p => [p.id, p.email]));
    
    const mappedEntries = (entries || []).map(e => ({
      ...e,
      total_length_inch: Number(e.total_length_inch) || 0,
      spreading_scrap_kg: Number(e.spreading_scrap_kg) || (Number(e.fabric_used_kg) * 0.025),
      scrap_percent_per_marker: Number(e.scrap_percent_per_marker) || (100.00 - Number(e.marker_efficiency_percent)),
      created_by: profileMap.get(e.created_by) || e.created_by || user_email,
      approved_by: profileMap.get(e.approved_by) || e.approved_by || null
    }));

    mappedEntries.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime() || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.json(mappedEntries);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/entries", async (req, res) => {
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  // Verify cutting entry permission
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, role, can_access_cutting_entry")
      .eq("email", user_email)
      .single();

    if (prof) {
      const userPerms = (systemSettings as any).user_permissions?.[prof.id] || {
        can_access_cutting_entry: true,
        can_access_remnant_entry: true
      };
      const canAccessCutting = prof.can_access_cutting_entry !== undefined ? prof.can_access_cutting_entry : (userPerms.can_access_cutting_entry !== false);
      
      if (!canAccessCutting) {
        return res.status(403).json({ error: "Access Denied. You do not have permission to enter cutting entries." });
      }
    }
  } catch (err) {
    console.warn("Could not verify cutting permission from profile:", err);
  }

  if (user_role === "manager") {
    return res.status(403).json({ error: "Permission Denied. Managers do not have write access." });
  }

  const data = req.body;
  const finalStatus = data.status === "submitted" ? "approved" : (data.status || "draft");
  const isDraft = finalStatus === "draft";

  if (!data.entry_date || !data.shift || !data.machine_id) {
    return res.status(400).json({ error: "Missing required core fields: Date, Shift, or Machine" });
  }

  if (!isDraft) {
    if (!data.buyer || !data.job_no || !data.color || !data.item || !data.cut_no) {
      return res.status(400).json({ error: "Missing required core fields: Buyer, Job Order No, Fabric Color, Garment Item, or Cut No" });
    }
  }

  // Validate job_no digits pattern if submitted/approved
  if (finalStatus === "approved") {
    const jobNoStr = String(data.job_no || "").trim();
    const requiredLength = systemSettings.job_no_digits;
    const digitsPattern = new RegExp(`^\\d{${requiredLength}}$`);
    if (!digitsPattern.test(jobNoStr)) {
      return res.status(400).json({ error: `Job Order No must be exactly ${requiredLength} digits (numbers only).` });
    }
  }

  try {
    // 2. Resolve creator profile UUID
    let profId: string | null = null;
    const { data: prof } = await supabase.from("profiles").select("id").eq("email", user_email).single();
    if (prof) {
      profId = prof.id;
    }

    // Compute lay, ratio and calculate remaining fields
    const layNum = Number(data.lay) || 1;
    let ratioNum = Number(data.ratio) || 1;
    if (data.sizes && typeof data.sizes === "object" && Object.keys(data.sizes).length > 0) {
      const sumRatio: number = Object.values(data.sizes as Record<string, any>).reduce((s: number, r: any) => s + (Number(r) || 0), 0);
      if (sumRatio > 0) {
        ratioNum = sumRatio;
      }
    }
    const dataToInsert: any = {
      entry_date: data.entry_date,
      shift: sanitizeShift(data.shift),
      machine_id: data.machine_id,
      buyer: (data.buyer || "").trim() || "DRAFT",
      job_no: (data.job_no || "").trim() || "DRAFT",
      color: (data.color || "").trim() || "DRAFT",
      po_no: data.po_no || null,
      order_qty: data.order_qty !== undefined && data.order_qty !== null && data.order_qty !== "" ? Number(data.order_qty) : null,
      color_type: data.color_type || null,
      fabric_metric_id: data.fabric_metric_id || null,
      sizes: data.sizes || {},
      item: (data.item || "").trim() || "DRAFT",
      cut_no: (data.cut_no || "").trim() || "DRAFT",
      lay: layNum,
      ratio: ratioNum,
      table_no: data.table_no || "",
      fabric_type: data.fabric_type || "",
      parts: data.parts || "",
      fabric_used_kg: Number(data.fabric_used_kg) || 0,
      remnant_weight_kg: Number(data.remnant_weight_kg) || 0,
      booking_consumption: data.booking_consumption !== undefined && data.booking_consumption !== null && data.booking_consumption !== "" ? Number(data.booking_consumption) : null,
      cutting_consumption: data.cutting_consumption !== undefined && data.cutting_consumption !== null && data.cutting_consumption !== "" ? Number(data.cutting_consumption) : null,
      cutting_scrap_weight_kg: Number(data.cutting_scrap_weight_kg) || 0,
      marker_length_inch: Number(data.marker_length_inch) || 1,
      marker_consumption: data.marker_consumption !== undefined && data.marker_consumption !== null && data.marker_consumption !== "" ? Number(data.marker_consumption) : null,
      marker_efficiency_percent: Number(data.marker_efficiency_percent) || 80,
      remarks: data.remarks || "",
      supervisor_name: data.supervisor_name || null,
      status: finalStatus,
      created_by: profId,
      approved_by: finalStatus === "approved" ? profId : null
    };

    let insertedEntry: any = null;
    let insertErr: any = null;

    try {
      const { data: ins, error: err } = await supabase
        .from("cutting_entries")
        .insert(dataToInsert)
        .select()
        .single();
      insertedEntry = ins;
      insertErr = err;
    } catch (e: any) {
      insertErr = e;
    }

    if (insertErr && (insertErr.message?.includes("order_qty") || insertErr.message?.includes("color_type") || insertErr.message?.includes("sizes") || insertErr.code === "42703")) {
      console.warn("DB columns missing. Falling back to retry without them.");
      const fallbackData = { ...dataToInsert };
      delete fallbackData.order_qty;
      delete fallbackData.color_type;
      delete fallbackData.sizes;
      const { data: ins, error: err } = await supabase
        .from("cutting_entries")
        .insert(fallbackData)
        .select()
        .single();
      insertedEntry = ins;
      insertErr = err;
    }

    if (insertErr) {
      return res.status(500).json({ error: insertErr.message });
    }

    // Auto-register newly entered buyer name in buyers reference table
    if (data.buyer) {
      await ensureBuyerExists(data.buyer);
    }

    const responseEntry = {
      ...insertedEntry,
      created_by: user_email,
      approved_by: insertedEntry.status === "approved" ? user_email : null,
      total_length_inch: Number(insertedEntry.total_length_inch) || 0,
      spreading_scrap_kg: Number(insertedEntry.spreading_scrap_kg) || (Number(insertedEntry.fabric_used_kg) * 0.025),
      scrap_percent_per_marker: Number(insertedEntry.scrap_percent_per_marker) || (100.00 - Number(insertedEntry.marker_efficiency_percent))
    };

    await addAuditLog(user_email, "create", "cutting_entry", insertedEntry.id, null, responseEntry);

    return res.json(responseEntry);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Bulk entry mode
app.post("/api/entries/bulk", async (req, res) => {
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  // Verify cutting entry permission
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, role, can_access_cutting_entry")
      .eq("email", user_email)
      .single();

    if (prof) {
      const userPerms = (systemSettings as any).user_permissions?.[prof.id] || {
        can_access_cutting_entry: true,
        can_access_remnant_entry: true
      };
      const canAccessCutting = prof.can_access_cutting_entry !== undefined ? prof.can_access_cutting_entry : (userPerms.can_access_cutting_entry !== false);
      
      if (!canAccessCutting) {
        return res.status(403).json({ error: "Access Denied. You do not have permission to enter cutting entries." });
      }
    }
  } catch (err) {
    console.warn("Could not verify cutting permission from profile:", err);
  }

  if (user_role === "manager") {
    return res.status(403).json({ error: "Permission Denied. Managers do not have write access." });
  }

  const { entries } = req.body;
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: "No entries provided for bulk import" });
  }

  const added: any[] = [];
  const errors: string[] = [];

  // Resolve user Profile UUID in Supabase
  let profId: string | null = null;
  try {
    const { data: prof } = await supabase.from("profiles").select("id").eq("email", user_email).single();
    if (prof) profId = prof.id;
  } catch {}

  // Load Supabase machines for reference
  let supMachines: any[] = [];
  try {
    const { data: macs } = await supabase.from("machines").select("id, machine_name");
    if (macs) supMachines = macs;
  } catch {}

  for (const item of entries) {
    if (!item.entry_date || !item.shift || !item.machine_id || !item.buyer || !item.job_no || !item.cut_no) {
      errors.push(`Row ${item.cut_no || 'Unknown'}: Missing mandatory fields.`);
      continue;
    }

    // Validate job_no digits pattern
    const jobNoStr = String(item.job_no || "").trim();
    const requiredLength = systemSettings.job_no_digits;
    const digitsPattern = new RegExp(`^\\d{${requiredLength}}$`);
    if (!digitsPattern.test(jobNoStr)) {
      errors.push(`Row ${item.cut_no || 'Unknown'}: Job Order No '${jobNoStr}' must be exactly ${requiredLength} digits (numbers only).`);
      continue;
    }

    try {
      // Map machine ID
      let finalMachineIdToUse = item.machine_id;
      if (finalMachineIdToUse.startsWith("machine-") && supMachines.length > 0) {
        const mat = supMachines.find(sm => sm.id === finalMachineIdToUse || sm.machine_name.toLowerCase().includes(item.machine_name?.toLowerCase() || ""));
        if (mat) {
          finalMachineIdToUse = mat.id;
        } else {
          finalMachineIdToUse = supMachines[0].id;
        }
      }

      const dataToInsert: any = {
        entry_date: item.entry_date,
        shift: sanitizeShift(item.shift),
        machine_id: finalMachineIdToUse,
        buyer: item.buyer,
        job_no: item.job_no,
        color: item.color || "Default",
        po_no: item.po_no || null,
        order_qty: item.order_qty !== undefined && item.order_qty !== null && item.order_qty !== "" ? Number(item.order_qty) : null,
        color_type: item.color_type || null,
        item: item.item || "Tee",
        cut_no: item.cut_no,
        lay: Number(item.lay) || 1,
        ratio: Number(item.ratio) || 1,
        table_no: item.table_no || "T-1",
        fabric_type: item.fabric_type || "Knit",
        parts: item.parts || "Body",
        fabric_used_kg: Number(item.fabric_used_kg) || 0,
        remnant_weight_kg: Number(item.remnant_weight_kg) || 0,
        booking_consumption: item.booking_consumption !== undefined && item.booking_consumption !== null && item.booking_consumption !== "" ? Number(item.booking_consumption) : null,
        cutting_consumption: item.cutting_consumption !== undefined && item.cutting_consumption !== null && item.cutting_consumption !== "" ? Number(item.cutting_consumption) : null,
        cutting_scrap_weight_kg: Number(item.cutting_scrap_weight_kg) || 0,
        marker_length_inch: Number(item.marker_length_inch) || 1,
        marker_consumption: item.marker_consumption !== undefined && item.marker_consumption !== null && item.marker_consumption !== "" ? Number(item.marker_consumption) : null,
        marker_efficiency_percent: Number(item.marker_efficiency_percent) || 80,
        remarks: item.remarks || "Bulk imported",
        supervisor_name: item.supervisor_name || null,
        status: "approved",
        created_by: profId,
        approved_by: profId
      };

      let insertedEntry: any = null;
      let insertErr: any = null;

      try {
        const { data: ins, error: err } = await supabase
          .from("cutting_entries")
          .insert(dataToInsert)
          .select()
          .single();
        insertedEntry = ins;
        insertErr = err;
      } catch (e: any) {
        insertErr = e;
      }

      if (insertErr && (insertErr.message?.includes("order_qty") || insertErr.message?.includes("color_type") || insertErr.code === "42703")) {
        console.warn("DB columns missing for color type wise metrics on bulk import. Retrying fallback without them.");
        const fallbackData = { ...dataToInsert };
        delete fallbackData.order_qty;
        delete fallbackData.color_type;
        const { data: ins, error: err } = await supabase
          .from("cutting_entries")
          .insert(fallbackData)
          .select()
          .single();
        insertedEntry = ins;
        insertErr = err;
      }

      if (insertErr) {
        errors.push(`Row ${item.cut_no}: Supabase insertion failed: ${insertErr.message}`);
        continue;
      }

      // Auto-register newly entered buyer name in buyers reference table
      if (item.buyer) {
        await ensureBuyerExists(item.buyer);
      }

      const responseEntry = {
        ...insertedEntry,
        created_by: user_email,
        approved_by: user_email,
        total_length_inch: Number(insertedEntry.total_length_inch) || 0,
        spreading_scrap_kg: Number(insertedEntry.spreading_scrap_kg) || (Number(insertedEntry.fabric_used_kg) * 0.025),
        scrap_percent_per_marker: Number(insertedEntry.scrap_percent_per_marker) || (100.00 - Number(insertedEntry.marker_efficiency_percent))
      };

      added.push(responseEntry);
      await addAuditLog(user_email, "create", "cutting_entry", insertedEntry.id, null, responseEntry);
    } catch (e: any) {
      errors.push(`Row ${item.cut_no}: ${e.message}`);
    }
  }

  res.json({ success_count: added.length, errors, added });
});

app.put("/api/entries/:id", async (req, res) => {
  const { id } = req.params;
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  try {
    // 1. Fetch current entry from Supabase using resilient helper
    let existingEntry: any = null;
    try {
      existingEntry = await fetchSingleCuttingEntry(id);
    } catch (fetchErr: any) {
      return res.status(404).json({ error: "Entry not found in system storage: " + fetchErr.message });
    }

    if (!existingEntry) {
      return res.status(404).json({ error: "Entry not found in system storage." });
    }

    // Resolve profiles email mapping
    const { data: profiles } = await supabase.from("profiles").select("id, email");
    const profileMap = new Map((profiles || []).map(p => [p.id, p.email]));
    const creatorEmail = profileMap.get(existingEntry.created_by) || user_email;

    // Fetch caller profile and permissions
    let callerProfile: any = null;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, role, can_access_cutting_entry, can_access_remnant_entry")
        .eq("email", user_email)
        .single();
      callerProfile = data;
    } catch {}

    const callerPerms = (systemSettings as any).user_permissions?.[callerProfile?.id || ""] || {
      can_access_cutting_entry: true,
      can_access_remnant_entry: true
    };
    
    const canAccessRemnant = callerProfile?.can_access_remnant_entry !== undefined ? callerProfile.can_access_remnant_entry : (callerPerms.can_access_remnant_entry !== false);
    const activeRole = callerProfile?.role || user_role;

    const data = req.body;

    // Check if they are trying to edit core cutting fields
    const isOnlyRemarksChanging = (
      existingEntry.entry_date === data.entry_date &&
      existingEntry.shift === data.shift &&
      existingEntry.machine_id === data.machine_id &&
      existingEntry.buyer === data.buyer &&
      existingEntry.job_no === data.job_no &&
      existingEntry.color === data.color &&
      existingEntry.item === data.item &&
      existingEntry.cut_no === data.cut_no &&
      Number(existingEntry.lay) === Number(data.lay) &&
      Number(existingEntry.ratio) === Number(data.ratio) &&
      existingEntry.table_no === data.table_no &&
      existingEntry.fabric_type === data.fabric_type &&
      existingEntry.parts === data.parts &&
      Number(existingEntry.fabric_used_kg) === Number(data.fabric_used_kg) &&
      Number(existingEntry.remnant_weight_kg) === Number(data.remnant_weight_kg) &&
      Number(existingEntry.cutting_scrap_weight_kg) === Number(data.cutting_scrap_weight_kg) &&
      Number(existingEntry.marker_length_inch) === Number(data.marker_length_inch) &&
      Number(existingEntry.marker_efficiency_percent) === Number(data.marker_efficiency_percent)
    );

    // Role policies: Any user can edit their own or any cutting entries (no admin approval/restriction)
    if (activeRole !== "admin" && activeRole !== "supervisor" && activeRole !== "manager") {
      if (!canAccessRemnant && !isOnlyRemarksChanging && (data.remnant_weight_kg !== undefined || data.remnants_scrap_weight_kg !== undefined)) {
        return res.status(403).json({ error: "Access Denied. You do not have permission to enter remnant data." });
      }
    }
    const old_value = {
      ...existingEntry,
      created_by: creatorEmail,
      approved_by: profileMap.get(existingEntry.approved_by) || null
    };

    const editorProfile = (profiles || []).find(p => p.email.toLowerCase() === user_email.toLowerCase());
    const editorId = editorProfile ? editorProfile.id : null;
    const finalStatus = data.status === "submitted" ? "approved" : data.status;

    // Validate job_no digits pattern if submitted/approved
    if (finalStatus === "approved") {
      const jobNoStr = String(data.job_no || "").trim();
      const requiredLength = systemSettings.job_no_digits;
      const digitsPattern = new RegExp(`^\\d{${requiredLength}}$`);
      if (!digitsPattern.test(jobNoStr)) {
        return res.status(400).json({ error: `Job Order No must be exactly ${requiredLength} digits (numbers only).` });
      }
    }

    const approvedBy = finalStatus === "approved" ? (existingEntry.approved_by || editorId) : null;

    let updatedRatio = Number(data.ratio) || 0;
    if (data.sizes && typeof data.sizes === "object" && Object.keys(data.sizes).length > 0) {
      const sumRatio: number = Object.values(data.sizes as Record<string, any>).reduce((s: number, r: any) => s + (Number(r) || 0), 0);
      if (sumRatio > 0) {
        updatedRatio = sumRatio;
      }
    }

    // Update inside Supabase
    const updateData: any = {
      entry_date: data.entry_date,
      shift: sanitizeShift(data.shift),
      buyer: (data.buyer || "").trim() || "DRAFT",
      job_no: (data.job_no || "").trim() || "DRAFT",
      color: (data.color || "").trim() || "DRAFT",
      po_no: data.po_no || null,
      order_qty: data.order_qty !== undefined && data.order_qty !== null && data.order_qty !== "" ? Number(data.order_qty) : null,
      color_type: data.color_type || null,
      fabric_metric_id: data.fabric_metric_id || null,
      sizes: data.sizes || {},
      item: (data.item || "").trim() || "DRAFT",
      cut_no: (data.cut_no || "").trim() || "DRAFT",
      lay: Number(data.lay),
      ratio: updatedRatio,
      table_no: data.table_no,
      fabric_type: data.fabric_type,
      parts: data.parts,
      fabric_used_kg: Number(data.fabric_used_kg),
      remnant_weight_kg: Number(data.remnant_weight_kg),
      booking_consumption: data.booking_consumption !== undefined && data.booking_consumption !== null && data.booking_consumption !== "" ? Number(data.booking_consumption) : null,
      cutting_consumption: data.cutting_consumption !== undefined && data.cutting_consumption !== null && data.cutting_consumption !== "" ? Number(data.cutting_consumption) : null,
      cutting_scrap_weight_kg: Number(data.cutting_scrap_weight_kg),
      reject_qty: Number(data.reject_qty) || 0,
      marker_length_inch: Number(data.marker_length_inch),
      marker_consumption: data.marker_consumption !== undefined && data.marker_consumption !== null && data.marker_consumption !== "" ? Number(data.marker_consumption) : null,
      marker_efficiency_percent: Number(data.marker_efficiency_percent),
      remarks: data.remarks,
      supervisor_name: data.supervisor_name || null,
      status: finalStatus,
      approved_by: approvedBy
    };

    let updatedEntry: any = null;
    let updateErr: any = null;

    try {
      const { data: upd, error: err } = await supabase
        .from("cutting_entries")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      updatedEntry = upd;
      updateErr = err;
    } catch (e: any) {
      updateErr = e;
    }

    if (updateErr && (updateErr.message?.includes("order_qty") || updateErr.message?.includes("color_type") || updateErr.message?.includes("sizes") || updateErr.code === "42703")) {
      console.warn("DB columns missing on update. Falling back to retry without them.");
      const fallbackData = { ...updateData };
      delete fallbackData.order_qty;
      delete fallbackData.color_type;
      delete fallbackData.sizes;
      const { data: upd, error: err } = await supabase
        .from("cutting_entries")
        .update(fallbackData)
        .eq("id", id)
        .select()
        .single();
      updatedEntry = upd;
      updateErr = err;
    }

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message });
    }

    // Auto-register newly entered buyer name in buyers reference table
    if (data.buyer) {
      await ensureBuyerExists(data.buyer);
    }

    const responseEntry = {
      ...updatedEntry,
      created_by: creatorEmail,
      approved_by: updatedEntry.status === "approved" ? (profileMap.get(updatedEntry.approved_by) || user_email) : null,
      total_length_inch: Number(updatedEntry.total_length_inch) || 0,
      spreading_scrap_kg: Number(updatedEntry.spreading_scrap_kg) || (Number(updatedEntry.fabric_used_kg) * 0.025),
      scrap_percent_per_marker: Number(updatedEntry.scrap_percent_per_marker) || (100.00 - Number(updatedEntry.marker_efficiency_percent))
    };

    await addAuditLog(user_email, "edit", "cutting_entry", updatedEntry.id, old_value, responseEntry);

    return res.json(responseEntry);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/api/entries/:id", async (req, res) => {
  const { id } = req.params;
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  let activeRole = user_role;
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("email", user_email)
      .single();
    if (prof) {
      activeRole = prof.role;
    }
  } catch {}

  // Any role can delete cutting records (no admin approval/restriction)

  try {
    // 1. Fetch current entry for audit logs using resilient helper
    let existingEntry: any = null;
    try {
      existingEntry = await fetchSingleCuttingEntry(id);
    } catch (fetchErr: any) {
      return res.status(404).json({ error: "Entry not found: " + fetchErr.message });
    }

    if (!existingEntry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    // 2. Delete from Supabase
    const { error: deleteErr } = await supabase.from("cutting_entries").delete().eq("id", id);
    if (deleteErr) {
      return res.status(500).json({ error: deleteErr.message });
    }

    await addAuditLog(user_email, "delete", "cutting_entry", id, existingEntry, null);

    return res.json({ success: true, message: `Entry with Cut No ${existingEntry.cut_no} was deleted.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/entries/:id/approve", async (req, res) => {
  const { id } = req.params;
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  if (user_role !== "supervisor" && user_role !== "admin" && user_role !== "manager") {
    return res.status(403).json({ error: "Only Officers, Managers, or Administrators can approve cutting logs." });
  }

  try {
    let existingEntry: any = null;
    try {
      existingEntry = await fetchSingleCuttingEntry(id);
    } catch (fetchErr: any) {
      return res.status(404).json({ error: "Entry not found: " + fetchErr.message });
    }

    if (!existingEntry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    // Resolve profile ID for the supervisor approving this entry
    const { data: prof } = await supabase.from("profiles").select("id").eq("email", user_email).single();
    
    const { data: updatedEntry, error: updateErr } = await supabase
      .from("cutting_entries")
      .update({
        status: "approved",
        approved_by: prof?.id || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message });
    }

    // Get profiles for creator email mapping
    const { data: profiles } = await supabase.from("profiles").select("id, email");
    const profileMap = new Map((profiles || []).map(p => [p.id, p.email]));

    const responseEntry = {
      ...updatedEntry,
      created_by: profileMap.get(updatedEntry.created_by) || updatedEntry.created_by || user_email,
      approved_by: user_email,
      total_length_inch: Number(updatedEntry.total_length_inch) || 0,
      spreading_scrap_kg: Number(updatedEntry.spreading_scrap_kg) || (Number(updatedEntry.fabric_used_kg) * 0.025),
      scrap_percent_per_marker: Number(updatedEntry.scrap_percent_per_marker) || (100.00 - Number(updatedEntry.marker_efficiency_percent))
    };

    await addAuditLog(user_email, "approve", "cutting_entry", id, existingEntry, responseEntry);

    return res.json(responseEntry);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. AUDIT LOGS API
// ==========================================

app.get("/api/logs", async (req, res) => {
  const user_role = req.headers["x-user-role"] as UserRole;

  if (user_role !== "admin") {
    return res.status(403).json({ error: "Only System Administrators can inspect the core audit logs." });
  }

  try {
    res.setHeader("Cache-Control", "private, no-cache, must-revalidate");
    const { data: logs, error } = await supabase
      .from("audit_logs")
      .select("id, user_email, action, entity_type, entity_id, old_value, new_value, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(logs || []);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. USER PROFILES API
// ==========================================

app.get("/api/profiles", async (req, res) => {
  const user_email = req.headers["x-user-email"] as string;
  if (!user_email) {
    return res.status(401).json({ error: "Unauthorized. Session required to read profiles." });
  }

  try {
    res.setHeader("Cache-Control", "private, no-cache, must-revalidate");
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, department, avatar_url, created_at, can_access_cutting_entry, can_access_remnant_entry, can_access_heat_seal_entry, can_access_poly_entry")
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const enrichedProfiles = (profiles || []).map(p => {
      const perms = (systemSettings as any).user_permissions?.[p.id] || {
        can_access_cutting_entry: true,
        can_access_remnant_entry: true,
        can_access_heat_seal_entry: true,
        can_access_poly_entry: true,
        can_access_requisition: true
      };
      return {
        ...p,
        can_access_cutting_entry: p.can_access_cutting_entry !== undefined ? p.can_access_cutting_entry : (perms.can_access_cutting_entry !== false),
        can_access_remnant_entry: p.can_access_remnant_entry !== undefined ? p.can_access_remnant_entry : (perms.can_access_remnant_entry !== false),
        can_access_heat_seal_entry: p.can_access_heat_seal_entry !== undefined ? p.can_access_heat_seal_entry : (perms.can_access_heat_seal_entry !== false),
        can_access_poly_entry: p.can_access_poly_entry !== undefined ? p.can_access_poly_entry : (perms.can_access_poly_entry !== false),
        can_access_requisition: (p as any).can_access_requisition !== undefined ? (p as any).can_access_requisition : (perms.can_access_requisition !== false)
      };
    });

    return res.json(enrichedProfiles);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put("/api/profiles/:id/role", async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  if (user_role !== "admin") {
    return res.status(403).json({ error: "Only Admins can modify user roles." });
  }

  try {
    const { data: currentProfile, error: fetchErr } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, department, avatar_url, created_at, can_access_cutting_entry, can_access_remnant_entry, can_access_heat_seal_entry, can_access_poly_entry")
      .eq("id", id)
      .single();

    if (fetchErr || !currentProfile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    const { data: updatedProfile, error: updateErr } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message });
    }

    await addAuditLog(user_email, "edit", "profile", id, currentProfile, updatedProfile);
    
    return res.json(updatedProfile);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put("/api/profiles/:id/avatar", async (req, res) => {
  const { id } = req.params;
  const { avatar_url } = req.body;
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  if (user_role !== "admin") {
    return res.status(403).json({ error: "Only Admins can modify profile pictures." });
  }

  try {
    const { data: currentProfile, error: fetchErr } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, department, avatar_url, created_at, can_access_cutting_entry, can_access_remnant_entry, can_access_heat_seal_entry, can_access_poly_entry")
      .eq("id", id)
      .single();

    if (fetchErr || !currentProfile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    const { data: updatedProfile, error: updateErr } = await supabase
      .from("profiles")
      .update({ avatar_url })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      if (updateErr.message.includes("column") || updateErr.code === "42703") {
        return res.status(400).json({
          error: "Database column 'avatar_url' is missing. Please run 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;' in your Supabase SQL editor to enable profile pictures."
        });
      }
      return res.status(500).json({ error: updateErr.message });
    }

    await addAuditLog(user_email, "edit", "avatar", id, currentProfile, updatedProfile);
    
    return res.json(updatedProfile);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put("/api/profiles/:id/permissions", async (req, res) => {
  const { id } = req.params;
  const { can_access_cutting_entry, can_access_remnant_entry, can_access_heat_seal_entry, can_access_poly_entry, can_access_requisition } = req.body;
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  if (user_role !== "admin") {
    return res.status(403).json({ error: "Only Admins can modify user permissions." });
  }

  try {
    const { data: currentProfile, error: fetchErr } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, department, avatar_url, created_at, can_access_cutting_entry, can_access_remnant_entry, can_access_heat_seal_entry, can_access_poly_entry")
      .eq("id", id)
      .single();

    if (fetchErr || !currentProfile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    // 1. Try to update the permissions directly in the database profiles table
    let dbError: any = null;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          can_access_cutting_entry: !!can_access_cutting_entry,
          can_access_remnant_entry: !!can_access_remnant_entry,
          can_access_heat_seal_entry: !!can_access_heat_seal_entry,
          can_access_poly_entry: !!can_access_poly_entry,
          can_access_requisition: !!can_access_requisition
        })
        .eq("id", id);
      dbError = error;
    } catch (err: any) {
      dbError = err;
    }

    // If the database has not been upgraded yet (missing column error), we'll write to local settings and prompt/report
    if (dbError && (dbError.code === "42703" || dbError.message?.includes("column"))) {
      console.warn("Permission columns missing in Database profiles table. Falling back to local settings.json storage.");
    } else if (dbError) {
      return res.status(500).json({ error: "Database error: " + dbError.message });
    }

    // 2. Dual-write/fallback to systemSettings for perfect backward compatibility
    if (!(systemSettings as any).user_permissions) {
      (systemSettings as any).user_permissions = {};
    }

    const old_permissions = (systemSettings as any).user_permissions[id] || {
      can_access_cutting_entry: currentProfile.can_access_cutting_entry !== false,
      can_access_remnant_entry: currentProfile.can_access_remnant_entry !== false,
      can_access_heat_seal_entry: currentProfile.can_access_heat_seal_entry !== false,
      can_access_poly_entry: currentProfile.can_access_poly_entry !== false,
      can_access_requisition: (currentProfile as any).can_access_requisition !== false
    };

    (systemSettings as any).user_permissions[id] = {
      can_access_cutting_entry: !!can_access_cutting_entry,
      can_access_remnant_entry: !!can_access_remnant_entry,
      can_access_heat_seal_entry: !!can_access_heat_seal_entry,
      can_access_poly_entry: !!can_access_poly_entry,
      can_access_requisition: !!can_access_requisition
    };

    const success = saveSettings(systemSettings);
    if (!success) {
      return res.status(500).json({ error: "Failed to persist user permissions locally." });
    }

    const enrichedProfile = {
      ...currentProfile,
      can_access_cutting_entry: !!can_access_cutting_entry,
      can_access_remnant_entry: !!can_access_remnant_entry,
      can_access_heat_seal_entry: !!can_access_heat_seal_entry,
      can_access_poly_entry: !!can_access_poly_entry,
      can_access_requisition: !!can_access_requisition
    };

    await addAuditLog(
      user_email,
      "edit",
      "user_permissions",
      id,
      old_permissions,
      (systemSettings as any).user_permissions[id]
    );

    return res.json(enrichedProfile);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 5.5 CONSOLIDATED AUTO-SYNC API
// ==========================================

app.get("/api/sync", async (req, res) => {
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  if (!user_email) {
    return res.status(401).json({ error: "Unauthorized. Session email required to sync dashboard." });
  }

  try {
    res.setHeader("Cache-Control", "private, no-cache, must-revalidate");

    const client_version = req.query.version as string;
    const now = Date.now();

    let server_version = "";
    
    // Check if we have a valid cached metadata version to skip Supabase hits
    if (cachedMetadata && (now - lastMetadataCheck < METADATA_CACHE_TTL)) {
      server_version = [cachedMetadata, user_role || "", user_email || ""].join("|");
      if (client_version && client_version === server_version) {
        return res.json({ no_changes: true, version: server_version });
      }
    }

    // If cache miss or expired, concurrently fetch metadata counts and timestamps
    const [
      { data: entryMax, error: err1 },
      { data: entryCreatedMax, error: err2 },
      { count: entryCount, error: err3 },
      { count: logCount, error: err4 },
      { count: profileCount, error: err5 },
      { count: machineCount, error: err6 },
      { count: buyerCount, error: err7 },
      polyMax,
      polyCount,
      hsEntryMax,
      hsEntryCount,
      hsOpCount,
      hsTargetMax,
      hsTargetCount,
      fabricMax,
      fabricCount
    ] = await Promise.all([
      supabase.from("cutting_entries").select("updated_at").order("updated_at", { ascending: false }).limit(1),
      supabase.from("cutting_entries").select("created_at").order("created_at", { ascending: false }).limit(1),
      supabase.from("cutting_entries").select("id", { count: "exact", head: true }),
      supabase.from("audit_logs").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("machines").select("id", { count: "exact", head: true }),
      supabase.from("buyers").select("id", { count: "exact", head: true }),
      // additional metadata to fix sync cache bypassing
      supabase.from("poly_entries").select("created_at").order("created_at", { ascending: false }).limit(1).then(r => r.data?.[0]?.created_at || "", () => ""),
      supabase.from("poly_entries").select("id", { count: "exact", head: true }).then(r => r.count || 0, () => 0),
      supabase.from("heat_seal_entries").select("updated_at").order("updated_at", { ascending: false }).limit(1).then(r => r.data?.[0]?.updated_at || "", () => ""),
      supabase.from("heat_seal_entries").select("id", { count: "exact", head: true }).then(r => r.count || 0, () => 0),
      supabase.from("heat_seal_operators").select("id", { count: "exact", head: true }).then(r => r.count || 0, () => 0),
      supabase.from("heat_seal_targets").select("updated_at").order("updated_at", { ascending: false }).limit(1).then(r => r.data?.[0]?.updated_at || "", () => ""),
      supabase.from("heat_seal_targets").select("id", { count: "exact", head: true }).then(r => r.count || 0, () => 0),
      supabase.from("fabric_metrics").select("updated_at").order("updated_at", { ascending: false }).limit(1).then(r => r.data?.[0]?.updated_at || "", () => ""),
      supabase.from("fabric_metrics").select("id", { count: "exact", head: true }).then(r => r.count || 0, () => 0)
    ]);

    server_version = "";
    if (err1 || err2 || err3 || err4 || err5 || err6 || err7) {
      console.warn("Metadata check bypassed due to a database warning:", { err1, err2, err3, err4, err5, err6, err7 });
    } else {
      const metadataBase = [
        entryMax?.[0]?.updated_at || "",
        entryCreatedMax?.[0]?.created_at || "",
        entryCount || 0,
        logCount || 0,
        profileCount || 0,
        machineCount || 0,
        buyerCount || 0,
        polyMax,
        polyCount,
        hsEntryMax,
        hsEntryCount,
        hsOpCount,
        hsTargetMax,
        hsTargetCount,
        fabricMax,
        fabricCount,
        systemSettings?.whats_new_updated_at || ""
      ].join("|");

      // Update the shared metadata cache
      cachedMetadata = metadataBase;
      lastMetadataCheck = now;

      server_version = [metadataBase, user_role || "", user_email || ""].join("|");

      if (client_version && client_version === server_version) {
        return res.json({ no_changes: true, version: server_version });
      }
    }

    // Attach server_version to locals to include it in the final response
    res.locals.server_version = server_version;

    // 1. Fetch machines
    const machinesPromise = (async () => {
      const { data: m, error } = await supabase
        .from("machines")
        .select("id, machine_name, machine_type")
        .order("machine_name", { ascending: true });
      if (error) throw error;
      
      if (m && m.length > 0) {
        return m;
      } else {
        const defaultMachinesToInsert = [
          { machine_name: "Auto Cutter Machine 1", machine_type: "Auto" },
          { machine_name: "Auto Cutter Machine 2", machine_type: "Auto" },
          { machine_name: "Manual Cutting Machine", machine_type: "Manual" },
          { machine_name: "Stripe Cutting", machine_type: "Stripe" }
        ];
        const { data: seeded, error: seedError } = await supabase
          .from("machines")
          .insert(defaultMachinesToInsert)
          .select("id, machine_name, machine_type");
        if (seedError) throw seedError;
        return seeded || [];
      }
    })();

    // 2. Fetch buyers
    const buyersPromise = (async () => {
      if (cachedBuyers !== null) {
        return cachedBuyers;
      }
      const { data: b, error } = await supabase
        .from("buyers")
        .select("id, name, created_at")
        .order("name", { ascending: true });
      if (error) {
        console.error("Could not fetch buyers from Supabase:", error.message);
        return [];
      }
      cachedBuyers = b || [];
      return cachedBuyers;
    })();

    // 3. Fetch cutting entries
    const entriesPromise = (async () => {
      try {
        const entries = await fetchAllCuttingEntries();

        const { data: profiles } = await supabase.from("profiles").select("id, email");
        const profileMap = new Map((profiles || []).map(p => [p.id, p.email]));
        
        const mappedEntries = (entries || []).map((e: any) => ({
          ...e,
          total_length_inch: Number(e.total_length_inch) || 0,
          spreading_scrap_kg: Number(e.spreading_scrap_kg) || (Number(e.fabric_used_kg) * 0.025),
          scrap_percent_per_marker: Number(e.scrap_percent_per_marker) || (100.00 - Number(e.marker_efficiency_percent)),
          created_by: profileMap.get(e.created_by) || e.created_by || user_email,
          approved_by: profileMap.get(e.approved_by) || e.approved_by || null
        }));

        mappedEntries.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime() || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return mappedEntries;
      } catch (err: any) {
        console.error("Could not fetch cutting_entries in /api/sync:", err.message);
        return [];
      }
    })();

    // 4. Fetch audit logs (Only if admin)
    const logsPromise = (async () => {
      if (user_role !== "admin") return [];
      const { data: logs, error } = await supabase
        .from("audit_logs")
        .select("id, user_email, action, entity_type, entity_id, old_value, new_value, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return logs || [];
    })();

    // 5. Fetch profiles list
    const profilesPromise = (async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, department, avatar_url, created_at, can_access_cutting_entry, can_access_remnant_entry, can_access_heat_seal_entry, can_access_poly_entry")
        .order("created_at", { ascending: true });
      if (error) throw error;
      
      const enriched = (profiles || []).map(p => {
        const perms = (systemSettings as any).user_permissions?.[p.id] || {
          can_access_cutting_entry: true,
          can_access_remnant_entry: true,
          can_access_heat_seal_entry: true,
          can_access_poly_entry: true,
          can_access_requisition: true
        };
        return {
          ...p,
          can_access_cutting_entry: p.can_access_cutting_entry !== undefined ? p.can_access_cutting_entry : (perms.can_access_cutting_entry !== false),
          can_access_remnant_entry: p.can_access_remnant_entry !== undefined ? p.can_access_remnant_entry : (perms.can_access_remnant_entry !== false),
          can_access_heat_seal_entry: p.can_access_heat_seal_entry !== undefined ? p.can_access_heat_seal_entry : (perms.can_access_heat_seal_entry !== false),
          can_access_poly_entry: p.can_access_poly_entry !== undefined ? p.can_access_poly_entry : (perms.can_access_poly_entry !== false),
          can_access_requisition: (p as any).can_access_requisition !== undefined ? (p as any).can_access_requisition : (perms.can_access_requisition !== false)
        };
      });
      return enriched;
    })();

    // Fetch everything concurrently via parallel promise resolution
    const polyPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("poly_entries")
          .select("id, entry_date, total_received_poly, total_reused_poly, price, save, created_by, created_at, updated_at")
          .order("entry_date", { ascending: false });
        if (error) {
          console.warn("Could not fetch poly_entries from Supabase, returning local setting fallback:", error.message);
          return (systemSettings as any).poly_entries || [];
        }
        return data || [];
      } catch (err: any) {
        console.warn("Could not fetch poly_entries from Supabase, returning local setting fallback:", err.message);
        return (systemSettings as any).poly_entries || [];
      }
    })();

    const heatSealPromise = (async () => {
      try {
        const entries = await fetchAllHeatSealEntries();
        return (entries || []).map(item => ({
          ...item,
          shift: mapShiftFromDb(item.shift)
        }));
      } catch (err: any) {
        console.warn("Could not fetch heat_seal_entries from Supabase:", err.message);
        return [];
      }
    })();

    const heatSealOperatorsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("heat_seal_operators")
          .select("id, operator_name, operator_id, designation, created_at")
          .order("operator_name", { ascending: true });
        if (error) {
          console.warn("Could not fetch heat_seal_operators from Supabase:", error.message);
          return [];
        }
        return data || [];
      } catch (err: any) {
        console.warn("Could not fetch heat_seal_operators from Supabase:", err.message);
        return [];
      }
    })();

    const heatSealTargetsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("heat_seal_targets")
          .select("*")
          .order("target_date", { ascending: false });
        if (error) {
          console.warn("Could not fetch heat_seal_targets from Supabase:", error.message);
          return [];
        }
        return (data || []).map(item => ({
          ...item,
          shift: mapShiftFromDb(item.shift),
          target_qty: Number(item.target_qty) || 0,
          max_po_qty: Number(item.max_po_qty) || 0
        }));
      } catch (err: any) {
        console.warn("Could not fetch heat_seal_targets from Supabase:", err.message);
        return [];
      }
    })();

    const requisitionsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("requisitions")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) {
          console.warn("Could not fetch requisitions from Supabase, returning local setting fallback:", error.message);
          return (systemSettings as any).requisitions || [];
        }
        return data || [];
      } catch (err: any) {
        console.warn("Could not fetch requisitions from Supabase, returning local setting fallback:", err.message);
        return (systemSettings as any).requisitions || [];
      }
    })();

    const fabricMetricsPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("fabric_metrics")
          .select("*")
          .order("entry_date", { ascending: false });
        if (error) {
          console.warn("Could not fetch fabric_metrics from Supabase, returning local setting fallback:", error.message);
          return (systemSettings as any).fabric_metrics || [];
        }
        return data || [];
      } catch (err: any) {
        console.warn("Could not fetch fabric_metrics from Supabase, returning local setting fallback:", err.message);
        return (systemSettings as any).fabric_metrics || [];
      }
    })();

    const [machines, buyers, entries, auditLogs, profiles, polyEntries, heatSealEntries, heatSealOperators, heatSealTargets, requisitions, fabricMetrics] = await Promise.all([
      machinesPromise,
      buyersPromise,
      entriesPromise,
      logsPromise,
      profilesPromise,
      polyPromise,
      heatSealPromise,
      heatSealOperatorsPromise,
      heatSealTargetsPromise,
      requisitionsPromise,
      fabricMetricsPromise
    ]);

    return res.json({
      machines,
      buyers,
      entries,
      auditLogs,
      profiles,
      polyEntries,
      heatSealEntries,
      heatSealOperators,
      heatSealTargets,
      requisitions,
      fabricMetrics,
      settings: systemSettings,
      version: res.locals.server_version || ""
    });

  } catch (err: any) {
    console.error("Dashboard sync API error:", err.message);
    return res.status(500).json({ error: "Failed to perform synchronized load: " + err.message });
  }
});

// ==========================================
// POLY ENTRIES (DAILY POLY RECEIVED & RE-USE SUMMARY)
// ==========================================

app.post("/api/poly-entries", async (req, res) => {
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  // Any role can log daily poly received & re-use data (no admin approval/restriction)

  const { entry_date, total_received_poly, total_reused_poly } = req.body;
  if (!entry_date || total_received_poly === undefined || total_reused_poly === undefined) {
    return res.status(400).json({ error: "Missing required fields (Date, Total Received Poly, Total Re-Used Poly)" });
  }

  const numReceived = parseFloat(total_received_poly);
  const numReused = parseFloat(total_reused_poly);

  if (isNaN(numReceived) || numReceived < 0) {
    return res.status(400).json({ error: "Total Received Poly must be a non-negative number." });
  }
  if (isNaN(numReused) || numReused < 0) {
    return res.status(400).json({ error: "Total Re-Used Poly must be a non-negative number." });
  }

  try {
    // 1. Try resolving profile UUID from email to record creator
    let creatorId: string | null = null;
    try {
      const { data: prof } = await supabase.from("profiles").select("id").eq("email", user_email).single();
      if (prof) {
        creatorId = prof.id;
      }
    } catch {}

    const currentPrice = (systemSettings as any).poly_price !== undefined ? parseFloat((systemSettings as any).poly_price) : 1.50;
    const saveValue = parseFloat((numReused * currentPrice).toFixed(2));

    // 2. Insert or update in Supabase
    const payload = {
      entry_date,
      total_received_poly: numReceived,
      total_reused_poly: numReused,
      price: currentPrice,
      save: saveValue,
      created_by: creatorId,
      updated_at: new Date().toISOString()
    };

    let dbError: any = null;
    let insertedData: any = null;
    try {
      const { data, error } = await supabase
        .from("poly_entries")
        .upsert(payload, { onConflict: "entry_date" })
        .select();
      dbError = error;
      insertedData = data;
    } catch (err: any) {
      dbError = err;
    }

    // 3. Fallback to settings.json if table isn't created or Supabase is not available
    if (dbError) {
      console.warn("Database save failed for poly entries, falling back to local settings.json:", dbError.message || dbError);
      
      if (!(systemSettings as any).poly_entries) {
        (systemSettings as any).poly_entries = [];
      }
      
      const existingIndex = (systemSettings as any).poly_entries.findIndex((e: any) => e.entry_date === entry_date);
      const uuidPlaceholder = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const newLocalEntry = {
        id: existingIndex >= 0 ? (systemSettings as any).poly_entries[existingIndex].id : uuidPlaceholder,
        entry_date,
        total_received_poly: numReceived,
        total_reused_poly: numReused,
        price: currentPrice,
        save: saveValue,
        created_by: user_email,
        created_at: existingIndex >= 0 ? (systemSettings as any).poly_entries[existingIndex].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        (systemSettings as any).poly_entries[existingIndex] = newLocalEntry;
      } else {
        (systemSettings as any).poly_entries.push(newLocalEntry);
      }

      // Save system settings locally
      saveSettings(systemSettings);
      insertedData = [newLocalEntry];
    }

    // 4. Log Audit Trail
    await addAuditLog(
      user_email,
      "create",
      "poly_entry",
      insertedData?.[0]?.id || entry_date,
      null,
      { entry_date, total_received_poly: numReceived, total_reused_poly: numReused }
    );

    return res.json({ success: true, message: "Daily poly received and re-use logged successfully.", data: insertedData?.[0] });

  } catch (err: any) {
    console.error("Failed to log daily poly entry:", err.message);
    return res.status(500).json({ error: "Failed to log daily poly entry: " + err.message });
  }
});

app.put("/api/poly-entries/:id", async (req, res) => {
  try {
    const user_role = req.headers["x-user-role"] as string;
    const user_email = req.headers["x-user-email"] as string;

    // Any role can edit poly entries (no admin approval/restriction)

    const { id } = req.params;
    const { total_received_poly, total_reused_poly } = req.body;

    const numReceived = parseFloat(total_received_poly);
    const numReused = parseFloat(total_reused_poly);

    if (isNaN(numReceived) || numReceived < 0) {
      return res.status(400).json({ error: "Total Received Poly must be a non-negative number." });
    }

    if (isNaN(numReused) || numReused < 0) {
      return res.status(400).json({ error: "Total Re-Used Poly must be a non-negative number." });
    }

    if (numReused > numReceived) {
      return res.status(400).json({ error: "Total Re-Used Poly cannot be greater than Total Received Poly." });
    }

    let updatedData = null;

    // Supabase update
    try {
      // First get current price
      const { data: currentEntry } = await supabase.from("poly_entries").select("price").eq("id", id).single();
      const currentPrice = currentEntry?.price !== undefined && currentEntry.price !== null ? currentEntry.price : ((systemSettings as any).poly_price || 1.50);
      const saveValue = numReused * currentPrice;

      const { data, error } = await supabase
        .from("poly_entries")
        .update({
          total_received_poly: numReceived,
          total_reused_poly: numReused,
          save: saveValue,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select();

      if (error) throw error;
      updatedData = data;
    } catch (dbError: any) {
      console.warn("Database save failed for poly entries, falling back to local settings.json:", dbError.message || dbError);
      
      if ((systemSettings as any).poly_entries) {
        const existingIndex = (systemSettings as any).poly_entries.findIndex((e: any) => e.id === id || e.entry_date === id);
        
        if (existingIndex >= 0) {
          const oldEntry = (systemSettings as any).poly_entries[existingIndex];
          const currentPrice = oldEntry.price !== undefined ? oldEntry.price : ((systemSettings as any).poly_price || 1.50);
          const saveValue = numReused * currentPrice;

          (systemSettings as any).poly_entries[existingIndex] = {
            ...oldEntry,
            total_received_poly: numReceived,
            total_reused_poly: numReused,
            save: saveValue,
            updated_at: new Date().toISOString()
          };
          saveSettings(systemSettings);
          updatedData = [(systemSettings as any).poly_entries[existingIndex]];
        }
      }
    }

    await addAuditLog(
      user_email,
      "edit",
      "poly_entry",
      id,
      null,
      { total_received_poly: numReceived, total_reused_poly: numReused }
    );

    return res.json({ success: true, message: "Poly tracking entry updated successfully.", data: updatedData?.[0] });

  } catch (err: any) {
    console.error("Failed to update poly entry:", err.message);
    return res.status(500).json({ error: "Failed to update poly entry: " + err.message });
  }
});

app.delete("/api/poly-entries/:id", async (req, res) => {
  const { id } = req.params;
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  // Any role can delete poly entries (no admin approval/restriction)

  try {
    let dbError: any = null;
    let deletedCount = 0;
    try {
      let query = supabase.from("poly_entries").delete();
      if (id.includes("-") && id.length > 10) {
        query = query.eq("id", id);
      } else {
        query = query.eq("entry_date", id);
      }
      const { data, error } = await query.select();
      dbError = error;
      if (data && data.length > 0) {
        deletedCount = data.length;
      }
    } catch (err: any) {
      dbError = err;
    }

    // Fallback to local settings.json
    if (dbError || deletedCount === 0) {
      if ((systemSettings as any).poly_entries) {
        const initialLength = (systemSettings as any).poly_entries.length;
        (systemSettings as any).poly_entries = (systemSettings as any).poly_entries.filter((e: any) => e.id !== id && e.entry_date !== id);
        if ((systemSettings as any).poly_entries.length < initialLength) {
          saveSettings(systemSettings);
          deletedCount = 1;
        }
      }
    }

    if (deletedCount > 0) {
      await addAuditLog(user_email, "delete", "poly_entry", id, null, null);
      return res.json({ success: true, message: "Poly tracking entry deleted successfully." });
    } else {
      return res.status(404).json({ error: "Poly tracking entry not found." });
    }

  } catch (err: any) {
    console.error("Failed to delete poly entry:", err.message);
    return res.status(500).json({ error: "Failed to delete poly entry: " + err.message });
  }
});


// ==========================================
// FABRIC METRICS ENTRY PANEL API
// ==========================================

app.post("/api/fabric-metrics", async (req, res) => {
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  if (user_role === "manager") {
    return res.status(403).json({ error: "Permission Denied. Managers do not have write access." });
  }

  const data = req.body;
  if (!data.entry_date || !data.buyer || !data.job_no || !data.color || !data.item || !data.fabric_type || !data.po_no) {
    return res.status(400).json({ error: "Missing required core fields (Date, Buyer, Job No, Color, Item, Fabric Type, PO Number)." });
  }

  try {
    let creatorId: string | null = null;
    try {
      const { data: prof } = await supabase.from("profiles").select("id").eq("email", user_email).single();
      if (prof) {
        creatorId = prof.id;
      }
    } catch {}

    const finalStatus = data.status === "submitted" ? "approved" : (data.status || "draft");

    const payload = {
      entry_date: data.entry_date,
      buyer: data.buyer,
      job_no: data.job_no,
      color: data.color,
      item: data.item,
      fabric_type: data.fabric_type,
      po_no: data.po_no,
      po_order_qty: parseInt(data.po_order_qty) || 0,
      booking_kg: parseFloat(data.booking_kg) || 0,
      booking_gsm: parseInt(data.booking_gsm) || 0,
      booking_dia: parseInt(data.booking_dia) || 0,
      net_consumption: parseFloat(data.net_consumption) || 0,
      gross_consumption: parseFloat(data.gross_consumption) || 0,
      rib_fabric_type: data.rib_fabric_type || null,
      rib_gsm: data.rib_gsm ? parseInt(data.rib_gsm) : null,
      rib_dia: data.rib_dia ? parseInt(data.rib_dia) : null,
      rib_consumption: data.rib_consumption ? parseFloat(data.rib_consumption) : null,
      has_back_neck_tape: !!data.has_back_neck_tape,
      back_neck_tape_con: data.has_back_neck_tape && data.back_neck_tape_con ? parseFloat(data.back_neck_tape_con) : null,
      back_neck_tape_gsm: data.has_back_neck_tape && data.back_neck_tape_gsm ? parseInt(data.back_neck_tape_gsm) : null,
      back_neck_tape_dia: data.has_back_neck_tape && data.back_neck_tape_dia ? parseInt(data.back_neck_tape_dia) : null,
      has_neck_binding: !!data.has_neck_binding,
      neck_binding_con: data.has_neck_binding && data.neck_binding_con ? parseFloat(data.neck_binding_con) : null,
      neck_binding_gsm: data.has_neck_binding && data.neck_binding_gsm ? parseInt(data.neck_binding_gsm) : null,
      neck_binding_dia: data.has_neck_binding && data.neck_binding_dia ? parseInt(data.neck_binding_dia) : null,
      size_bookings: data.size_bookings || null,
      status: finalStatus,
      created_by: creatorId,
      updated_at: new Date().toISOString()
    };

    let dbError: any = null;
    let insertedData: any = null;

    try {
      const { data: dbData, error } = await supabase
        .from("fabric_metrics")
        .insert([payload])
        .select();
      dbError = error;
      insertedData = dbData;
    } catch (err: any) {
      dbError = err;
    }

    if (dbError) {
      console.warn("Database insert failed for fabric metrics, falling back to local settings.json:", dbError.message || dbError);
      if (!(systemSettings as any).fabric_metrics) {
        (systemSettings as any).fabric_metrics = [];
      }
      const uuidPlaceholder = "local_" + Math.random().toString(36).substring(2, 15);
      const newLocalEntry = {
        id: uuidPlaceholder,
        ...payload,
        created_at: new Date().toISOString()
      };
      (systemSettings as any).fabric_metrics.push(newLocalEntry);
      saveSettings(systemSettings);
      insertedData = [newLocalEntry];
    }

    await addAuditLog(
      user_email,
      "create",
      "fabric_metrics",
      insertedData?.[0]?.id,
      null,
      payload
    );

    return res.json({ success: true, message: "Fabric metrics logged successfully.", data: insertedData?.[0] });

  } catch (err: any) {
    console.error("Failed to log fabric metrics:", err.message);
    return res.status(500).json({ error: "Failed to log fabric metrics: " + err.message });
  }
});

app.put("/api/fabric-metrics/:id", async (req, res) => {
  const { id } = req.params;
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  if (user_role === "manager") {
    return res.status(403).json({ error: "Permission Denied. Managers do not have write access." });
  }

  const data = req.body;

  try {
    const payload = {
      entry_date: data.entry_date,
      buyer: data.buyer,
      job_no: data.job_no,
      color: data.color,
      item: data.item,
      fabric_type: data.fabric_type,
      po_no: data.po_no,
      po_order_qty: parseInt(data.po_order_qty) || 0,
      booking_kg: parseFloat(data.booking_kg) || 0,
      booking_gsm: parseInt(data.booking_gsm) || 0,
      booking_dia: parseInt(data.booking_dia) || 0,
      net_consumption: parseFloat(data.net_consumption) || 0,
      gross_consumption: parseFloat(data.gross_consumption) || 0,
      rib_fabric_type: data.rib_fabric_type || null,
      rib_gsm: data.rib_gsm ? parseInt(data.rib_gsm) : null,
      rib_dia: data.rib_dia ? parseInt(data.rib_dia) : null,
      rib_consumption: data.rib_consumption ? parseFloat(data.rib_consumption) : null,
      has_back_neck_tape: !!data.has_back_neck_tape,
      back_neck_tape_con: data.has_back_neck_tape && data.back_neck_tape_con ? parseFloat(data.back_neck_tape_con) : null,
      back_neck_tape_gsm: data.has_back_neck_tape && data.back_neck_tape_gsm ? parseInt(data.back_neck_tape_gsm) : null,
      back_neck_tape_dia: data.has_back_neck_tape && data.back_neck_tape_dia ? parseInt(data.back_neck_tape_dia) : null,
      has_neck_binding: !!data.has_neck_binding,
      neck_binding_con: data.has_neck_binding && data.neck_binding_con ? parseFloat(data.neck_binding_con) : null,
      neck_binding_gsm: data.has_neck_binding && data.neck_binding_gsm ? parseInt(data.neck_binding_gsm) : null,
      neck_binding_dia: data.has_neck_binding && data.neck_binding_dia ? parseInt(data.neck_binding_dia) : null,
      size_bookings: data.size_bookings || null,
      status: data.status || "draft",
      updated_at: new Date().toISOString()
    };

    let dbError: any = null;
    let updatedData: any = null;

    if (id && !id.startsWith("local_")) {
      try {
        const { data: dbData, error } = await supabase
          .from("fabric_metrics")
          .update(payload)
          .eq("id", id)
          .select();
        dbError = error;
        updatedData = dbData;
      } catch (err: any) {
        dbError = err;
      }
    }

    if (dbError || !updatedData || updatedData.length === 0) {
      if ((systemSettings as any).fabric_metrics) {
        const existingIndex = (systemSettings as any).fabric_metrics.findIndex((e: any) => e.id === id);
        if (existingIndex >= 0) {
          const merged = { ...(systemSettings as any).fabric_metrics[existingIndex], ...payload };
          (systemSettings as any).fabric_metrics[existingIndex] = merged;
          saveSettings(systemSettings);
          updatedData = [merged];
        }
      }
    }

    if (!updatedData || updatedData.length === 0) {
      return res.status(404).json({ error: "Fabric metrics entry not found." });
    }

    await addAuditLog(
      user_email,
      "edit",
      "fabric_metrics",
      id,
      null,
      payload
    );

    return res.json({ success: true, message: "Fabric metrics updated successfully.", data: updatedData[0] });

  } catch (err: any) {
    console.error("Failed to update fabric metrics:", err.message);
    return res.status(500).json({ error: "Failed to update fabric metrics: " + err.message });
  }
});

app.delete("/api/fabric-metrics/:id", async (req, res) => {
  const { id } = req.params;
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  if (user_role === "operator" || user_role === "manager") {
    if ((systemSettings as any).fabric_metrics) {
      const entry = (systemSettings as any).fabric_metrics.find((e: any) => e.id === id);
      if (entry && entry.status !== "draft") {
        return res.status(403).json({ error: "Access Denied. Only Supervisors and Admins can delete approved/submitted entries." });
      }
    }
  }

  try {
    let dbError: any = null;
    let deletedCount = 0;

    if (id && !id.startsWith("local_")) {
      try {
        const { data, error } = await supabase
          .from("fabric_metrics")
          .delete()
          .eq("id", id)
          .select();
        dbError = error;
        if (data && data.length > 0) {
          deletedCount = data.length;
        }
      } catch (err: any) {
        dbError = err;
      }
    }

    if (dbError || deletedCount === 0) {
      if ((systemSettings as any).fabric_metrics) {
        const initialLength = (systemSettings as any).fabric_metrics.length;
        (systemSettings as any).fabric_metrics = (systemSettings as any).fabric_metrics.filter((e: any) => e.id !== id);
        if ((systemSettings as any).fabric_metrics.length < initialLength) {
          saveSettings(systemSettings);
          deletedCount = 1;
        }
      }
    }

    if (deletedCount > 0) {
      await addAuditLog(user_email, "delete", "fabric_metrics", id, null, null);
      return res.json({ success: true, message: "Fabric metrics deleted successfully." });
    } else {
      return res.status(404).json({ error: "Fabric metrics entry not found." });
    }

  } catch (err: any) {
    console.error("Failed to delete fabric metrics:", err.message);
    return res.status(500).json({ error: "Failed to delete fabric metrics: " + err.message });
  }
});

app.put("/api/fabric-metrics/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  if (!["supervisor", "admin"].includes(user_role)) {
    return res.status(403).json({ error: "Access Denied. Only Supervisors and Admins can approve entries." });
  }

  if (!status) {
    return res.status(400).json({ error: "Status is required." });
  }

  try {
    let approverId: string | null = null;
    try {
      const { data: prof } = await supabase.from("profiles").select("id").eq("email", user_email).single();
      if (prof) {
        approverId = prof.id;
      }
    } catch {}

    const payload = {
      status,
      approved_by: status === "approved" ? approverId : null,
      updated_at: new Date().toISOString()
    };

    let dbError: any = null;
    let updatedData: any = null;

    if (id && !id.startsWith("local_")) {
      try {
        const { data: dbData, error } = await supabase
          .from("fabric_metrics")
          .update(payload)
          .eq("id", id)
          .select();
        dbError = error;
        updatedData = dbData;
      } catch (err: any) {
        dbError = err;
      }
    }

    if (dbError || !updatedData || updatedData.length === 0) {
      if ((systemSettings as any).fabric_metrics) {
        const existingIndex = (systemSettings as any).fabric_metrics.findIndex((e: any) => e.id === id);
        if (existingIndex >= 0) {
          const merged = { 
            ...(systemSettings as any).fabric_metrics[existingIndex], 
            ...payload,
            approved_by: status === "approved" ? user_email : null
          };
          (systemSettings as any).fabric_metrics[existingIndex] = merged;
          saveSettings(systemSettings);
          updatedData = [merged];
        }
      }
    }

    if (!updatedData || updatedData.length === 0) {
      return res.status(404).json({ error: "Fabric metrics entry not found." });
    }

    await addAuditLog(
      user_email,
      "approve",
      "fabric_metrics",
      id,
      null,
      { status }
    );

    return res.json({ success: true, message: `Fabric metrics entry ${status} successfully.`, data: updatedData[0] });

  } catch (err: any) {
    console.error("Failed to update status of fabric metrics:", err.message);
    return res.status(500).json({ error: "Failed to update status of fabric metrics: " + err.message });
  }
});


// ==========================================
// HEAT SEAL ENTRIES API
// ==========================================

app.post("/api/heat-seal-entries", async (req, res) => {
  try {
    const user_role = req.headers["x-user-role"] as string;
    const user_email = req.headers["x-user-email"] as string;
    if (!["operator", "supervisor", "admin"].includes(user_role)) {
      return res.status(403).json({ error: "Access Denied. Operators, Supervisors, and Admins can create entries." });
    }
    
    // Use auth data if we have it from profile fetch later, but here just an email is sent in headers
    // Find the user's UUID
    let created_by = null;
    const { data: profile } = await supabase.from("profiles").select("id").ilike("email", user_email).maybeSingle();
    if (profile) created_by = profile.id;

    const { entry_date, shift, operator_name, operator_id, designation, job_no, color, po_no, target_id, hourly_data, status } = req.body;
    const dbShift = mapShiftToDb(shift);

    const { data, error } = await supabase
      .from("heat_seal_entries")
      .insert([{
        entry_date, shift: dbShift, operator_name, operator_id, designation, job_no, color, po_no, target_id, hourly_data, status, created_by
      }])
      .select();

    if (error) throw error;

    const returnedData = data?.[0] ? { ...data[0], shift: mapShiftFromDb(data[0].shift) } : null;
    await addAuditLog(user_email, "create", "heat_seal_entry", data?.[0]?.id || "", null, returnedData);

    return res.json({ success: true, message: "Heat Seal Entry created", data: returnedData });
  } catch (err: any) {
    console.error("Failed to create heat seal entry:", err.message);
    return res.status(500).json({ error: "Failed to create heat seal entry: " + err.message });
  }
});

app.put("/api/heat-seal-entries/:id", async (req, res) => {
  try {
    const user_role = req.headers["x-user-role"] as string;
    const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();
    const { id } = req.params;
    
    const { data: existing } = await supabase.from("heat_seal_entries").select("id, entry_date, shift, operator_name, operator_id, designation, job_no, color, po_no, target_id, hourly_data, created_by, status, created_at, updated_at").eq("id", id).single();
    if (!existing) return res.status(404).json({ error: "Entry not found" });

    // Fetch the actual role from profiles to handle mismatch elegantly
    let active_role = user_role;
    try {
      const { data: prof } = await supabase.from("profiles").select("role").eq("email", user_email).single();
      if (prof) {
        active_role = prof.role;
      }
    } catch {}

    if (active_role === "manager") {
      return res.status(403).json({ error: "Access Denied. Managers can only view production." });
    }

    // RLS in DB also prevents unauthorized updates, but we do basic check here
    if (active_role === "operator" && existing.status !== "draft") {
      return res.status(403).json({ error: "Operators can only edit draft entries." });
    }

    // Safely extract only database-writable columns, discarding read-only metadata or ID keys
    const {
      entry_date,
      shift,
      operator_name,
      operator_id,
      designation,
      job_no,
      color,
      po_no,
      target_id,
      hourly_data,
      status
    } = req.body;

    const updates: any = {};
    if (entry_date !== undefined) updates.entry_date = entry_date;
    if (shift !== undefined) updates.shift = mapShiftToDb(shift);
    if (operator_name !== undefined) updates.operator_name = operator_name;
    if (operator_id !== undefined) updates.operator_id = operator_id;
    if (designation !== undefined) updates.designation = designation;
    if (job_no !== undefined) updates.job_no = job_no;
    if (color !== undefined) updates.color = color;
    if (po_no !== undefined) updates.po_no = po_no;
    if (target_id !== undefined) updates.target_id = target_id;
    if (hourly_data !== undefined) updates.hourly_data = hourly_data;
    if (status !== undefined) updates.status = status;
    updates.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from("heat_seal_entries")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;

    const returnedData = data?.[0] ? { ...data[0], shift: mapShiftFromDb(data[0].shift) } : null;
    const cleanExisting = { ...existing, shift: mapShiftFromDb(existing.shift) };
    await addAuditLog(user_email, "edit", "heat_seal_entry", id, cleanExisting, returnedData);

    return res.json({ success: true, message: "Heat Seal Entry updated", data: returnedData });
  } catch (err: any) {
    console.error("Failed to update heat seal entry:", err.message);
    return res.status(500).json({ error: "Failed to update heat seal entry: " + err.message });
  }
});

app.delete("/api/heat-seal-entries/:id", async (req, res) => {
  try {
    const user_role = req.headers["x-user-role"] as string;
    const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();
    
    // Fetch the actual role from profiles to handle mismatch elegantly
    let active_role = user_role;
    try {
      const { data: prof } = await supabase.from("profiles").select("role").eq("email", user_email).single();
      if (prof) {
        active_role = prof.role;
      }
    } catch {}

    if (!["supervisor", "admin"].includes(active_role)) {
      return res.status(403).json({ error: "Access Denied. Only Supervisors and Admins can delete entries." });
    }
    const { id } = req.params;

    const { error } = await supabase.from("heat_seal_entries").delete().eq("id", id);
    if (error) throw error;

    await addAuditLog(user_email, "delete", "heat_seal_entry", id, null, null);

    return res.json({ success: true, message: "Heat Seal Entry deleted" });
  } catch (err: any) {
    console.error("Failed to delete heat seal entry:", err.message);
    return res.status(500).json({ error: "Failed to delete heat seal entry: " + err.message });
  }
});

// ==========================================
// HEAT SEAL OPERATORS & TARGETS API
// ==========================================

app.post("/api/heat-seal-operators", async (req, res) => {
  try {
    const user_role = req.headers["x-user-role"] as string;
    const user_email = req.headers["x-user-email"] as string;
    if (!["operator", "supervisor", "admin"].includes(user_role)) {
      return res.status(403).json({ error: "Access Denied. Only Operators, Supervisors, and Admins can manage operators." });
    }
    const { operator_name, operator_id, designation } = req.body;
    const { data, error } = await supabase
      .from("heat_seal_operators")
      .insert([{ operator_name, operator_id, designation }])
      .select();
    if (error) throw error;
    await addAuditLog(user_email, "create", "heat_seal_operator", data?.[0]?.id || "", null, data?.[0]);
    return res.json({ success: true, data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/api/heat-seal-operators/:id", async (req, res) => {
  try {
    const user_role = req.headers["x-user-role"] as string;
    const user_email = req.headers["x-user-email"] as string;
    if (!["supervisor", "admin"].includes(user_role)) {
      return res.status(403).json({ error: "Access Denied. Only Supervisors and Admins can delete operators." });
    }
    const { id } = req.params;
    const { error } = await supabase.from("heat_seal_operators").delete().eq("id", id);
    if (error) throw error;
    await addAuditLog(user_email, "delete", "heat_seal_operator", id, null, null);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/heat-seal-targets", async (req, res) => {
  try {
    const user_role = req.headers["x-user-role"] as string;
    const user_email = req.headers["x-user-email"] as string;
    if (!["operator", "supervisor", "admin"].includes(user_role)) {
      return res.status(403).json({ error: "Access Denied. Only Operators, Supervisors, and Admins can pre-set targets." });
    }

    let created_by = null;
    const { data: profile } = await supabase.from("profiles").select("id").ilike("email", user_email).maybeSingle();
    if (profile) created_by = profile.id;

    const { target_date, shift, operator_id, operator_name, job_no, color, po_no, hourly_target, target_qty, max_po_qty } = req.body;
    const dbShift = mapShiftToDb(shift);

    const targetPayload = {
      target_date,
      shift: dbShift,
      operator_id,
      operator_name,
      job_no,
      color,
      po_no,
      hourly_target,
      target_qty: Number(target_qty) || 0,
      max_po_qty: Number(max_po_qty) || 0,
      created_by
    };

    const { data, error } = await supabase
      .from("heat_seal_targets")
      .insert([targetPayload])
      .select();
    
    if (error) {
      // Fallback if target_qty / max_po_qty or status column is missing
      const { target_qty: _, max_po_qty: __, ...basicPayload } = targetPayload;
      const { data: retryData, error: retryError } = await supabase
        .from("heat_seal_targets")
        .insert([basicPayload])
        .select();
      if (retryError) throw retryError;
      const returnedData = retryData?.[0] ? { ...retryData[0], target_qty: Number(target_qty) || 0, max_po_qty: Number(max_po_qty) || 0, status: 'active', shift: mapShiftFromDb(retryData[0].shift) } : null;
      await addAuditLog(user_email, "create", "heat_seal_target", retryData?.[0]?.id || "", null, returnedData);
      return res.json({ success: true, data: returnedData });
    }

    const returnedData = data?.[0] ? { ...data[0], target_qty: Number(data[0].target_qty || target_qty) || 0, max_po_qty: Number(data[0].max_po_qty || max_po_qty) || 0, status: data[0].status || 'active', shift: mapShiftFromDb(data[0].shift) } : null;
    await addAuditLog(user_email, "create", "heat_seal_target", data?.[0]?.id || "", null, returnedData);

    return res.json({ success: true, data: returnedData });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put("/api/heat-seal-targets/:id", async (req, res) => {
  try {
    const user_role = req.headers["x-user-role"] as string;
    const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();
    
    // Fetch the actual role from profiles to handle mismatch elegantly
    let active_role = user_role;
    try {
      const { data: prof } = await supabase.from("profiles").select("role").eq("email", user_email).single();
      if (prof) {
        active_role = prof.role;
      }
    } catch {}

    if (!["operator", "supervisor", "admin"].includes(active_role)) {
      return res.status(403).json({ error: "Access Denied. Only Operators, Supervisors, and Admins can update targets." });
    }
    const { id } = req.params;
    const { data: existing } = await supabase.from("heat_seal_targets").select("id, target_date, shift, operator_id, operator_name, job_no, color, po_no, hourly_target, status, created_by, created_at, updated_at").eq("id", id).single();
    if (!existing) return res.status(404).json({ error: "Target not found" });

    const {
      target_date,
      shift,
      operator_id,
      operator_name,
      job_no,
      color,
      po_no,
      hourly_target,
      target_qty,
      max_po_qty,
      status
    } = req.body;

    const updates: any = {};
    if (target_date !== undefined) updates.target_date = target_date;
    if (shift !== undefined) updates.shift = mapShiftToDb(shift);
    if (operator_id !== undefined) updates.operator_id = operator_id;
    if (operator_name !== undefined) updates.operator_name = operator_name;
    if (job_no !== undefined) updates.job_no = job_no;
    if (color !== undefined) updates.color = color;
    if (po_no !== undefined) updates.po_no = po_no;
    if (hourly_target !== undefined) updates.hourly_target = hourly_target;
    if (target_qty !== undefined) updates.target_qty = Number(target_qty) || 0;
    if (max_po_qty !== undefined) updates.max_po_qty = Number(max_po_qty) || 0;
    if (status !== undefined) updates.status = status;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("heat_seal_targets")
      .update(updates)
      .eq("id", id)
      .select();
    
    if (error) {
      if (error.message.includes("status") || error.message.includes("schema cache")) {
        // Fallback: remove status from updates and retry
        const { status: _, ...otherUpdates } = updates;
        const { data: retryData, error: retryError } = await supabase
          .from("heat_seal_targets")
          .update(otherUpdates)
          .eq("id", id)
          .select();
        if (retryError) throw retryError;
        const returnedData = retryData?.[0] ? { ...retryData[0], status: 'active', shift: mapShiftFromDb(retryData[0].shift) } : null;
        const cleanExisting = { ...existing, shift: mapShiftFromDb(existing.shift) };
        await addAuditLog(user_email, "edit", "heat_seal_target", id, cleanExisting, returnedData);
        return res.json({ success: true, data: returnedData, warning: "Database schema needs update for Status tracking." });
      }
      throw error;
    }

    const returnedData = data?.[0] ? { ...data[0], status: data[0].status || 'active', shift: mapShiftFromDb(data[0].shift) } : null;
    const cleanExisting = { ...existing, shift: mapShiftFromDb(existing.shift) };
    await addAuditLog(user_email, "edit", "heat_seal_target", id, cleanExisting, returnedData);

    return res.json({ success: true, data: returnedData });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/api/heat-seal-targets/:id", async (req, res) => {
  try {
    const user_role = req.headers["x-user-role"] as string;
    const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();
    
    // Fetch the actual role from profiles to handle mismatch elegantly
    let active_role = user_role;
    try {
      const { data: prof } = await supabase.from("profiles").select("role").eq("email", user_email).single();
      if (prof) {
        active_role = prof.role;
      }
    } catch {}

    if (!["supervisor", "admin"].includes(active_role)) {
      return res.status(403).json({ error: "Access Denied. Only Supervisors and Admins can delete targets." });
    }
    const { id } = req.params;
    const { error } = await supabase.from("heat_seal_targets").delete().eq("id", id);
    if (error) throw error;
    await addAuditLog(user_email, "delete", "heat_seal_target", id, null, null);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// JOB LOOKUP API
// ==========================================
app.get("/api/job-lookup/:job_no", async (req, res) => {
  try {
    const { job_no } = req.params;
    if (!job_no) {
      return res.status(400).json({ error: "Job number is required" });
    }

    const cacheKey = job_no.toLowerCase().trim();
    const cached = jobLookupCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 60000)) {
      return res.json(cached.response);
    }

    const uniqueCombinations = new Map<string, { color: string; po_no: string; po_qty: number }>();

    // 1. Find in cutting_entries
    const { data: cuttingData } = await supabase
      .from("cutting_entries")
      .select("color, po_no, order_qty")
      .ilike("job_no", job_no)
      .limit(100);

    if (cuttingData) {
      for (const row of cuttingData) {
        if (row.color) {
          const col = row.color.trim();
          const po = (row.po_no || "").trim();
          const key = `${col.toLowerCase()}|||${po.toLowerCase()}`;
          const qty = Number(row.order_qty) || 0;
          const existing = uniqueCombinations.get(key);
          if (!existing) {
            uniqueCombinations.set(key, { color: col, po_no: po, po_qty: qty });
          } else if (qty > existing.po_qty) {
            existing.po_qty = qty;
          }
        }
      }
    }

    // 2. Find in heat_seal_targets
    const { data: targetData } = await supabase
      .from("heat_seal_targets")
      .select("color, po_no, target_qty, max_po_qty")
      .ilike("job_no", job_no)
      .limit(100);

    if (targetData) {
      for (const row of targetData) {
        if (row.color) {
          const col = row.color.trim();
          const po = (row.po_no || "").trim();
          const key = `${col.toLowerCase()}|||${po.toLowerCase()}`;
          const qty = Number(row.max_po_qty || row.target_qty) || 0;
          const existing = uniqueCombinations.get(key);
          if (!existing) {
            uniqueCombinations.set(key, { color: col, po_no: po, po_qty: qty });
          } else if (qty > existing.po_qty) {
            existing.po_qty = qty;
          }
        }
      }
    }

    // 3. Find in heat_seal_entries
    const { data: hsData } = await supabase
      .from("heat_seal_entries")
      .select("color, po_no")
      .ilike("job_no", job_no)
      .limit(100);

    if (hsData) {
      for (const row of hsData) {
        if (row.color) {
          const col = row.color.trim();
          const po = (row.po_no || "").trim();
          const key = `${col.toLowerCase()}|||${po.toLowerCase()}`;
          if (!uniqueCombinations.has(key)) {
            uniqueCombinations.set(key, { color: col, po_no: po, po_qty: 0 });
          }
        }
      }
    }

    const results = Array.from(uniqueCombinations.values());
    const responsePayload = results.length > 0
      ? { found: true, job_no, results }
      : { found: false, results: [] };

    jobLookupCache.set(cacheKey, { timestamp: Date.now(), response: responsePayload });
    return res.json(responsePayload);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 6. SYSTEM SETTINGS API
// ==========================================

app.get("/api/settings", async (req, res) => {
  const user_email = req.headers["x-user-email"] as string;
  if (!user_email) {
    return res.status(401).json({ error: "Unauthorized. Session required to read system settings." });
  }
  res.setHeader("Cache-Control", "private, no-cache, must-revalidate");
  return res.json(systemSettings);
});

app.post("/api/settings", async (req, res) => {
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  if (user_role !== "admin") {
    return res.status(403).json({ error: "Only Admins can modify system configurations." });
  }

  const { job_no_digits, is_po_number_required, whats_new_title, whats_new_content, whats_new_updated_at, poly_price, color_type_metrics } = req.body;
  if (job_no_digits === undefined || typeof job_no_digits !== "number" || job_no_digits <= 0 || job_no_digits > 20) {
    return res.status(400).json({ error: "Job No digits must be a positive integer between 1 and 20." });
  }

  const newPolyPrice = poly_price !== undefined ? parseFloat(poly_price) : ((systemSettings as any).poly_price || 1.50);
  if (isNaN(newPolyPrice) || newPolyPrice < 0) {
    return res.status(400).json({ error: "Poly price must be a non-negative number." });
  }

  const old_value = { ...systemSettings };
  const newSettings = {
    ...systemSettings,
    job_no_digits,
    is_po_number_required: typeof is_po_number_required === "boolean" ? is_po_number_required : (systemSettings.is_po_number_required || false),
    whats_new_title: typeof whats_new_title === "string" ? whats_new_title : (systemSettings.whats_new_title || ""),
    whats_new_content: typeof whats_new_content === "string" ? whats_new_content : (systemSettings.whats_new_content || ""),
    whats_new_updated_at: typeof whats_new_updated_at === "string" ? whats_new_updated_at : (systemSettings.whats_new_updated_at || ""),
    poly_price: newPolyPrice,
    color_type_metrics: color_type_metrics !== undefined ? color_type_metrics : ((systemSettings as any).color_type_metrics || null)
  };

  const success = saveSettings(newSettings);

  if (!success) {
    return res.status(500).json({ error: "Failed to persist new system settings locally." });
  }

  // Also sync to DB
  try {
    const { error: dbError } = await supabase
      .from("settings")
      .upsert({ key: "app_settings", value: newSettings }, { onConflict: "key" });
    if (dbError) {
      console.warn("Failed to persist settings to DB:", dbError.message);
    }
  } catch (err: any) {
    console.warn("Exception persisting settings to DB:", err.message);
  }

  // Audit log setting change
  await addAuditLog(
    user_email,
    "edit",
    "system_settings",
    "00000000-0000-0000-0000-000000000000",
    old_value,
    systemSettings
  );

  return res.json(systemSettings);
});

app.post("/api/admin/create-user", async (req, res) => {
  const admin_role = req.headers["x-user-role"] as UserRole;
  const admin_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  if (admin_role !== "admin") {
    return res.status(403).json({ error: "Only Admins can directly register new users." });
  }

  const { email, password, full_name, role, department } = req.body;
  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: "Email, password, full name, and role are required." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const userName = full_name.trim();
  const userRole = role;
  const userDept = department?.trim() || "Cutting Deck 1";

  try {
    // Check if profile/user already exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists." });
    }

    // Register with Supabase Auth admin API (auto-confirmed)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true
    });

    if (authError) {
      throw authError;
    }

    const userId = authData.user?.id || "00000000-0000-0000-0000-000000000000";
    
    const newProfile: any = {
      id: userId,
      full_name: userName,
      email: normalizedEmail,
      role: userRole,
      department: userDept
    };

    // Try to insert with default permissions. If database doesn't have columns yet, fall back.
    let dbError: any = null;
    try {
      const { error } = await supabase
        .from("profiles")
        .insert({
          ...newProfile,
          can_access_cutting_entry: true,
          can_access_remnant_entry: true,
          can_access_heat_seal_entry: true,
          can_access_poly_entry: true,
          can_access_requisition: true
        });
      dbError = error;
    } catch (err: any) {
      dbError = err;
    }

    if (dbError && (dbError.code === "42703" || dbError.message?.includes("column"))) {
      // Fallback if DB column is missing
      const { error } = await supabase
        .from("profiles")
        .insert(newProfile);
      dbError = error;
    }

    if (dbError) {
      console.warn("Could not insert profile in Supabase table, cleaning auth user...", dbError.message);
      // Try to clean up auth user if DB insertion failed to avoid orphaned records
      await supabase.auth.admin.deleteUser(userId).catch(() => {});
      return res.status(400).json({ error: dbError.message });
    }

    // Set default permissions in systemSettings
    if (!(systemSettings as any).user_permissions) {
      (systemSettings as any).user_permissions = {};
    }
    (systemSettings as any).user_permissions[userId] = {
      can_access_cutting_entry: true,
      can_access_remnant_entry: true,
      can_access_heat_seal_entry: true,
      can_access_poly_entry: true,
      can_access_requisition: true
    };
    saveSettings(systemSettings);

    // Log administrative action
    await addAuditLog(
      admin_email,
      "create",
      "profiles",
      userId,
      null,
      { email: normalizedEmail, full_name: userName, role: userRole, department: userDept }
    );

    const enrichedProfile = {
      ...newProfile,
      can_access_cutting_entry: true,
      can_access_remnant_entry: true,
      can_access_heat_seal_entry: true,
      can_access_poly_entry: true,
      can_access_requisition: true
    };

    return res.json({ profile: enrichedProfile, message: "User account created successfully by admin" });

  } catch (err: any) {
    console.error("Supabase Admin direct user creation error:", err.message);
    return res.status(400).json({ error: err.message });
  }
});


// ==========================================
// REQUISITION ENDPOINTS (CRUD & WORKFLOW)
// ==========================================

app.post("/api/requisitions", async (req, res) => {
  const reqData = req.body;
  
  try {
    const { data, error } = await supabase
      .from("requisitions")
      .insert([reqData])
      .select("*");
      
    if (error) {
      console.warn("Database insert failed for requisition, falling back to local settings.json:", error.message);
      throw error;
    }
    return res.json(data?.[0] || reqData);
  } catch (err: any) {
    if (!(systemSettings as any).requisitions) {
      (systemSettings as any).requisitions = [];
    }
    (systemSettings as any).requisitions.push(reqData);
    
    try {
      fs.writeFileSync(settingsFilePath, JSON.stringify(systemSettings, null, 2), "utf-8");
    } catch (writeErr) {
      console.error("Failed to write fallback requisitions to settings.json");
    }
    
    return res.json(reqData);
  }
});

app.post("/api/requisitions/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;
  const approved_at = new Date().toISOString().split('T')[0];
  
  try {
    const { data, error } = await supabase
      .from("requisitions")
      .update({ status: "approved", approved_by, approved_at })
      .eq("id", id)
      .select("*");
      
    if (error) {
      console.warn("Database update failed for requisition, falling back to local settings.json:", error.message);
      throw error;
    }
    return res.json(data?.[0] || { status: "success" });
  } catch (err: any) {
    if ((systemSettings as any).requisitions) {
      const idx = (systemSettings as any).requisitions.findIndex((r: any) => r.id === id);
      if (idx >= 0) {
        (systemSettings as any).requisitions[idx].status = "approved";
        (systemSettings as any).requisitions[idx].approved_by = approved_by;
        (systemSettings as any).requisitions[idx].approved_at = approved_at;
        
        try {
          fs.writeFileSync(settingsFilePath, JSON.stringify(systemSettings, null, 2), "utf-8");
        } catch (writeErr) {}
      }
    }
    return res.json({ status: "success" });
  }
});

app.post("/api/requisitions/:id/reject", async (req, res) => {
  const { id } = req.params;
  const { rejected_by } = req.body;
  const approved_at = new Date().toISOString().split('T')[0];
  
  try {
    const { data, error } = await supabase
      .from("requisitions")
      .update({ status: "rejected", approved_by: rejected_by, approved_at })
      .eq("id", id)
      .select("*");
      
    if (error) {
      console.warn("Database update failed for requisition, falling back to local settings.json:", error.message);
      throw error;
    }
    return res.json(data?.[0] || { status: "success" });
  } catch (err: any) {
    if ((systemSettings as any).requisitions) {
      const idx = (systemSettings as any).requisitions.findIndex((r: any) => r.id === id);
      if (idx >= 0) {
        (systemSettings as any).requisitions[idx].status = "rejected";
        (systemSettings as any).requisitions[idx].approved_by = rejected_by;
        (systemSettings as any).requisitions[idx].approved_at = approved_at;
        
        try {
          fs.writeFileSync(settingsFilePath, JSON.stringify(systemSettings, null, 2), "utf-8");
        } catch (writeErr) {}
      }
    }
    return res.json({ status: "success" });
  }
});

app.put("/api/requisitions/:id", async (req, res) => {
  const { id } = req.params;
  const updatedFields = req.body;
  
  try {
    const { data, error } = await supabase
      .from("requisitions")
      .update(updatedFields)
      .eq("id", id)
      .select("*");
      
    if (error) {
      console.warn("Database update failed for requisition, falling back to local settings.json:", error.message);
      throw error;
    }
    return res.json(data?.[0] || { status: "success" });
  } catch (err: any) {
    if ((systemSettings as any).requisitions) {
      const idx = (systemSettings as any).requisitions.findIndex((r: any) => r.id === id);
      if (idx >= 0) {
        (systemSettings as any).requisitions[idx] = {
          ...(systemSettings as any).requisitions[idx],
          ...updatedFields
        };
        
        try {
          fs.writeFileSync(settingsFilePath, JSON.stringify(systemSettings, null, 2), "utf-8");
        } catch (writeErr) {}
      }
    }
    return res.json({ status: "success" });
  }
});

app.delete("/api/requisitions/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const { error } = await supabase
      .from("requisitions")
      .delete()
      .eq("id", id);
      
    if (error) {
      console.warn("Database delete failed for requisition, falling back to local settings.json:", error.message);
      throw error;
    }
    return res.json({ success: true });
  } catch (err: any) {
    if ((systemSettings as any).requisitions) {
      (systemSettings as any).requisitions = (systemSettings as any).requisitions.filter((r: any) => r.id !== id);
      
      try {
        fs.writeFileSync(settingsFilePath, JSON.stringify(systemSettings, null, 2), "utf-8");
      } catch (writeErr) {}
    }
    return res.json({ success: true });
  }
});


// ==========================================
// STATIC FILES & VITE HMR HANDLER
// ==========================================

if (process.env.NODE_ENV !== "production") {
  import("vite").then(({ createServer: createViteServer }) => {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      app.use(vite.middlewares);
      
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Development Server running on port ${PORT}`);
      });
    });
  });
} else {
  const distPath = path.join(process.cwd(), "dist");
  
  // Configure express.static with optimal browser caching options
  app.use(express.static(distPath, {
    maxAge: "1d",
    setHeaders: (res, filePath) => {
      const isAsset = filePath.includes(path.join("dist", "assets")) || 
                      filePath.includes("/assets/") || 
                      filePath.includes("\\assets\\");
      // Vite production builds place compiled JS/CSS in the dist/assets folder with content hashes.
      // Since these are fully immutable, we can safely cache them forever (1 year).
      if (isAsset) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath.endsWith(".html")) {
        // Main index.html or other HTML entrypoints must never cache indefinitely to ensure
        // client browsers fetch new releases when the app updates.
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      } else {
        // Other non-hashed root assets (like manifest.json, favicon.ico, images)
        // are cached for 1 day with revalidation required afterwards.
        res.setHeader("Cache-Control", "public, max-age=86400, must-revalidate");
      }
    }
  }));

  app.get("*", (req, res) => {
    // Send index.html with headers ensuring it is revalidated on every request
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.sendFile(path.join(distPath, "index.html"));
  });
  
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Production Server running on port ${PORT}`);
  });
}

export default app;
