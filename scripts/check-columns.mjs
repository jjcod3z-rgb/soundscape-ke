import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }

  console.log("Columns in 'orders' table:", Object.keys(data[0] || {}));
}

check();
