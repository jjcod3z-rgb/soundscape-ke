import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data, error } = await supabase
    .from("products")
    .select("name, r2_preview_url, r2_product_urls");

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("PRODUCTS COVER IMAGE AND FILES URLS:");
  data.forEach((p) => {
    console.log(`- Product: ${p.name}`);
    console.log(`  Cover URL: ${p.r2_preview_url}`);
    console.log(`  Files URLs:`);
    p.r2_product_urls?.forEach((f) => {
      console.log(`    * ${f.name}: ${f.url}`);
    });
  });
}

check();
