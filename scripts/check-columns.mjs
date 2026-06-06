import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*");

  if (error) {
    console.error("Error fetching site_settings:", error);
    return;
  }

  console.log("Rows in 'site_settings' table:", data);
}

check();
