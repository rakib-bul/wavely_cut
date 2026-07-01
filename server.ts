import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { calculateFields } from "./src/utils/calculations";
import { CuttingEntry, Machine, Profile, AuditLog, UserRole } from "./src/types";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

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

// System Settings persistence
const SETTINGS_FILE_PATH = path.join(process.cwd(), "settings.json");
let systemSettings = {
  job_no_digits: 7,
  whats_new_title: "",
  whats_new_content: "",
  whats_new_updated_at: ""
};

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const content = fs.readFileSync(SETTINGS_FILE_PATH, "utf-8");
      systemSettings = JSON.parse(content);
      console.log("Loaded system settings:", systemSettings);
    } else {
      fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(systemSettings, null, 2), "utf-8");
      console.log("Created default system settings:", systemSettings);
    }
  } catch (err: any) {
    console.error("Error loading system settings:", err.message);
  }
}

function saveSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), "utf-8");
    systemSettings = settings;
    console.log("Saved system settings:", systemSettings);
    return true;
  } catch (err: any) {
    console.error("Error saving system settings:", err.message);
    return false;
  }
}

// Call loadSettings on startup
loadSettings();

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
    
    const newProfile = {
      id: userId,
      full_name: userName,
      email: normalizedEmail,
      role: userRole,
      department: userDept
    };

    // Insert into Supabase profiles table
    const { error: dbError } = await supabase
      .from("profiles")
      .insert(newProfile);

    if (dbError) {
      console.warn("Could not insert profile in Supabase table:", dbError.message);
      return res.status(400).json({ error: dbError.message });
    }

    return res.json({ profile: newProfile, message: "Account created successfully" });

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
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (dbErr) {
        throw new Error("Could not fetch user profile from Supabase: " + dbErr.message);
      }

      if (profile) {
        return res.json({ profile });
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
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    const { data: supabaseMachines, error: sbError } = await supabase
      .from("machines")
      .select("*")
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

  if (user_role !== "admin" && user_role !== "supervisor") {
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
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    // If we have cached buyers, return them immediately
    if (cachedBuyers !== null) {
      return res.json(cachedBuyers);
    }

    const { data: buyers, error } = await supabase
      .from("buyers")
      .select("*")
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

  if (user_role !== "admin" && user_role !== "supervisor") {
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
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    let query = supabase.from("cutting_entries").select("*");
    
    if (user_role === "operator") {
      const { data: prof } = await supabase.from("profiles").select("id").eq("email", user_email).single();
      if (prof?.id) {
        query = query.eq("created_by", prof.id);
      } else {
        query = query.eq("created_by", "00000000-0000-0000-0000-000000000000");
      }
    }

    const { data: entries, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data: profiles } = await supabase.from("profiles").select("id, email");
    const profileMap = new Map((profiles || []).map(p => [p.id, p.email]));
    
    const mappedEntries = (entries || []).map(e => ({
      ...e,
      total_length_inch: Number(e.total_length_inch) || (Number(e.marker_length_inch) * Number(e.lay)),
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

  if (user_role === "manager") {
    return res.status(403).json({ error: "Permission Denied. Managers do not have write access." });
  }

  const data = req.body;
  if (!data.entry_date || !data.shift || !data.machine_id || !data.buyer || !data.job_no || !data.color || !data.item || !data.cut_no) {
    return res.status(400).json({ error: "Missing required core fields" });
  }

  // Validate job_no digits pattern if submitted/approved
  const finalStatus = data.status === "submitted" ? "approved" : (data.status || "draft");
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
    const ratioNum = Number(data.ratio) || 1;
    const dataToInsert = {
      entry_date: data.entry_date,
      shift: sanitizeShift(data.shift),
      machine_id: data.machine_id,
      buyer: data.buyer,
      job_no: data.job_no,
      color: data.color,
      item: data.item,
      cut_no: data.cut_no,
      lay: layNum,
      ratio: ratioNum,
      table_no: data.table_no || "",
      fabric_type: data.fabric_type || "",
      parts: data.parts || "",
      fabric_used_kg: Number(data.fabric_used_kg) || 0,
      remnant_weight_kg: Number(data.remnant_weight_kg) || 0,
      cutting_scrap_weight_kg: Number(data.cutting_scrap_weight_kg) || 0,
      marker_length_inch: Number(data.marker_length_inch) || 1,
      marker_efficiency_percent: Number(data.marker_efficiency_percent) || 80,
      remarks: data.remarks || "",
      status: finalStatus,
      created_by: profId,
      approved_by: finalStatus === "approved" ? profId : null
    };

    const { data: insertedEntry, error: insertErr } = await supabase
      .from("cutting_entries")
      .insert(dataToInsert)
      .select()
      .single();

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
      total_length_inch: Number(insertedEntry.total_length_inch) || (Number(insertedEntry.marker_length_inch) * Number(insertedEntry.lay)),
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

      const dataToInsert = {
        entry_date: item.entry_date,
        shift: sanitizeShift(item.shift),
        machine_id: finalMachineIdToUse,
        buyer: item.buyer,
        job_no: item.job_no,
        color: item.color || "Default",
        item: item.item || "Tee",
        cut_no: item.cut_no,
        lay: Number(item.lay) || 1,
        ratio: Number(item.ratio) || 1,
        table_no: item.table_no || "T-1",
        fabric_type: item.fabric_type || "Knit",
        parts: item.parts || "Body",
        fabric_used_kg: Number(item.fabric_used_kg) || 0,
        remnant_weight_kg: Number(item.remnant_weight_kg) || 0,
        cutting_scrap_weight_kg: Number(item.cutting_scrap_weight_kg) || 0,
        marker_length_inch: Number(item.marker_length_inch) || 1,
        marker_efficiency_percent: Number(item.marker_efficiency_percent) || 80,
        remarks: item.remarks || "Bulk imported",
        status: "approved",
        created_by: profId,
        approved_by: profId
      };

      const { data: insertedEntry, error: insertErr } = await supabase
        .from("cutting_entries")
        .insert(dataToInsert)
        .select()
        .single();

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
        total_length_inch: Number(insertedEntry.total_length_inch) || (Number(insertedEntry.marker_length_inch) * Number(insertedEntry.lay)),
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
    // 1. Fetch current entry from Supabase
    const { data: existingEntry, error: fetchErr } = await supabase
      .from("cutting_entries")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existingEntry) {
      return res.status(404).json({ error: "Entry not found in system storage." });
    }

    // Resolve profiles email mapping
    const { data: profiles } = await supabase.from("profiles").select("id, email");
    const profileMap = new Map((profiles || []).map(p => [p.id, p.email]));
    const creatorEmail = profileMap.get(existingEntry.created_by) || user_email;

    // Role policies
    if (user_role === "operator" && existingEntry.status === "approved") {
      return res.status(403).json({ error: "Operators cannot edit approved cutting entries." });
    }
    if (user_role === "operator" && creatorEmail.toLowerCase() !== user_email) {
      return res.status(403).json({ error: "Operators can only edit their own draft entries." });
    }
    if (user_role === "manager") {
      return res.status(403).json({ error: "Managers do not have edit rights." });
    }

    const data = req.body;
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

    // Update inside Supabase
    const { data: updatedEntry, error: updateErr } = await supabase
      .from("cutting_entries")
      .update({
        entry_date: data.entry_date,
        shift: sanitizeShift(data.shift),
        buyer: data.buyer,
        job_no: data.job_no,
        color: data.color,
        item: data.item,
        cut_no: data.cut_no,
        lay: Number(data.lay),
        ratio: Number(data.ratio),
        table_no: data.table_no,
        fabric_type: data.fabric_type,
        parts: data.parts,
        fabric_used_kg: Number(data.fabric_used_kg),
        remnant_weight_kg: Number(data.remnant_weight_kg),
        cutting_scrap_weight_kg: Number(data.cutting_scrap_weight_kg),
        marker_length_inch: Number(data.marker_length_inch),
        marker_efficiency_percent: Number(data.marker_efficiency_percent),
        remarks: data.remarks,
        status: finalStatus,
        approved_by: approvedBy
      })
      .eq("id", id)
      .select()
      .single();

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
      total_length_inch: Number(updatedEntry.total_length_inch) || (Number(updatedEntry.marker_length_inch) * Number(updatedEntry.lay)),
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

  if (user_role !== "supervisor" && user_role !== "admin") {
    return res.status(403).json({ error: "Only Officers or Administrators can delete cutting records." });
  }

  try {
    // 1. Fetch current entry for audit logs
    const { data: existingEntry, error: fetchErr } = await supabase
      .from("cutting_entries")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existingEntry) {
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

  if (user_role !== "supervisor" && user_role !== "admin") {
    return res.status(403).json({ error: "Only Officers or Administrators can approve cutting logs." });
  }

  try {
    const { data: existingEntry, error: fetchErr } = await supabase
      .from("cutting_entries")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existingEntry) {
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
      total_length_inch: Number(updatedEntry.total_length_inch) || (Number(updatedEntry.marker_length_inch) * Number(updatedEntry.lay)),
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
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    const { data: logs, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

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
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(profiles || []);
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
      .select("*")
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
      .select("*")
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


// ==========================================
// 6. SYSTEM SETTINGS API
// ==========================================

app.get("/api/settings", async (req, res) => {
  const user_email = req.headers["x-user-email"] as string;
  if (!user_email) {
    return res.status(401).json({ error: "Unauthorized. Session required to read system settings." });
  }
  res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
  return res.json(systemSettings);
});

app.post("/api/settings", async (req, res) => {
  const user_role = req.headers["x-user-role"] as UserRole;
  const user_email = (req.headers["x-user-email"] as string || "").toLowerCase();

  if (user_role !== "admin") {
    return res.status(403).json({ error: "Only Admins can modify system configurations." });
  }

  const { job_no_digits, whats_new_title, whats_new_content, whats_new_updated_at } = req.body;
  if (job_no_digits === undefined || typeof job_no_digits !== "number" || job_no_digits <= 0 || job_no_digits > 20) {
    return res.status(400).json({ error: "Job No digits must be a positive integer between 1 and 20." });
  }

  const old_value = { ...systemSettings };
  const success = saveSettings({
    job_no_digits,
    whats_new_title: typeof whats_new_title === "string" ? whats_new_title : (systemSettings.whats_new_title || ""),
    whats_new_content: typeof whats_new_content === "string" ? whats_new_content : (systemSettings.whats_new_content || ""),
    whats_new_updated_at: typeof whats_new_updated_at === "string" ? whats_new_updated_at : (systemSettings.whats_new_updated_at || "")
  });

  if (!success) {
    return res.status(500).json({ error: "Failed to persist new system settings." });
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
    
    const newProfile = {
      id: userId,
      full_name: userName,
      email: normalizedEmail,
      role: userRole,
      department: userDept
    };

    // Insert into profiles
    const { error: dbError } = await supabase
      .from("profiles")
      .insert(newProfile);

    if (dbError) {
      console.warn("Could not insert profile in Supabase table, cleaning auth user...", dbError.message);
      // Try to clean up auth user if DB insertion failed to avoid orphaned records
      await supabase.auth.admin.deleteUser(userId).catch(() => {});
      return res.status(400).json({ error: dbError.message });
    }

    // Log administrative action
    await addAuditLog(
      admin_email,
      "create",
      "profiles",
      userId,
      null,
      { email: normalizedEmail, full_name: userName, role: userRole, department: userDept }
    );

    return res.json({ profile: newProfile, message: "User account created successfully by admin" });

  } catch (err: any) {
    console.error("Supabase Admin direct user creation error:", err.message);
    return res.status(400).json({ error: err.message });
  }
});


// ==========================================
// STATIC FILES & VITE HMR HANDLER
// ==========================================

if (process.env.VERCEL) {
  // On Vercel, static files and routing are handled by Vercel CDN using vercel.json.
  // The Express app is exported to be run as a Serverless Function.
  console.log("Running in Vercel Serverless environment");
} else if (process.env.NODE_ENV !== "production") {
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
      // Vite production builds place compiled JS/CSS in the dist/assets folder with content hashes.
      // Since these are fully immutable, we can safely cache them forever (1 year).
      if (filePath.includes(path.join("dist", "assets")) || filePath.includes("/assets/")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath.endsWith(".html")) {
        // Main index.html or other HTML entrypoints must never cache indefinitely to ensure
        // client browsers fetch new releases when the app updates.
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      } else {
        // Other non-hashed root assets (like manifest.json, favicon.ico, images in /public)
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
