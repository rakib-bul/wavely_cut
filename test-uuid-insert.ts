import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = "https://qkcbxpafpykmktisyioy.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2J4cGFmcHlrbWt0aXN5aW95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE5NzMyNSwiZXhwIjoyMDk3NzczMzI1fQ.-2bMfw9d1hkbAVNWBrOwBKA5WRNNcU2XRXXvM1u4gBQ";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const uuid = crypto.randomUUID();
  console.log("Inserting profile with UUID:", uuid);
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: uuid,
      full_name: "TEST USER",
      email: "test_user_random@kafe.com",
      role: "operator",
      department: "Cutting Floor 1"
    })
    .select()
    .single();

  if (error) {
    console.error("Insert failed:", error);
  } else {
    console.log("Insert succeeded:", data);
    // Cleanup
    await supabase.from("profiles").delete().eq("id", uuid);
    console.log("Cleanup succeeded.");
  }
}

run();
