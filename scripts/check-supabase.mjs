/**
 * Diagnostic script to check Supabase tables and connectivity.
 * Run with: node scripts/check-supabase.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
  process.exit(1);
}

console.log("Supabase URL:", SUPABASE_URL);
console.log("Service key starts with:", SUPABASE_SERVICE_KEY.substring(0, 15) + "...");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function check() {
  // 1. Check products table
  console.log("\n--- Checking 'products' table ---");
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, name, slug, price_kes")
    .limit(5);

  if (prodErr) {
    console.error("❌ products table error:", prodErr.message, prodErr.code);
  } else {
    console.log(`✅ products table OK — ${products.length} rows found`);
    products.forEach((p) => console.log(`   • ${p.name} (${p.slug}) — KES ${p.price_kes}`));
  }

  // 2. Check orders table
  console.log("\n--- Checking 'orders' table ---");
  const { data: orders, error: ordErr } = await supabase
    .from("orders")
    .select("id, status")
    .limit(5);

  if (ordErr) {
    console.error("❌ orders table error:", ordErr.message, ordErr.code);
  } else {
    console.log(`✅ orders table OK — ${orders.length} rows found`);
  }

  // 3. Check song_briefs table
  console.log("\n--- Checking 'song_briefs' table ---");
  const { data: briefs, error: briefErr } = await supabase
    .from("song_briefs")
    .select("id, genre")
    .limit(5);

  if (briefErr) {
    console.error("❌ song_briefs table error:", briefErr.message, briefErr.code);
  } else {
    console.log(`✅ song_briefs table OK — ${briefs.length} rows found`);
  }

  // 4. Check announcements table
  console.log("\n--- Checking 'announcements' table ---");
  const { data: anns, error: annErr } = await supabase
    .from("announcements")
    .select("id, title")
    .limit(5);

  if (annErr) {
    console.error("❌ announcements table error:", annErr.message, annErr.code);
  } else {
    console.log(`✅ announcements table OK — ${anns.length} rows found`);
  }

  // 5. Try inserting a test product and rolling it back
  console.log("\n--- Test insert into 'products' ---");
  const testSlug = "diag-test-" + Date.now();
  const { data: testProd, error: insertErr } = await supabase
    .from("products")
    .insert({
      slug: testSlug,
      name: "Diagnostic Test Pack",
      category: "sound_pack",
      description: "Test — will be deleted",
      price_kes: 100,
      r2_preview_url: null,
      r2_product_urls: [],
      is_active: false,
    })
    .select()
    .single();

  if (insertErr) {
    console.error("❌ Insert failed:", insertErr.message, insertErr.code, insertErr.details);
  } else {
    console.log(`✅ Insert succeeded — id: ${testProd.id}`);
    // Clean up
    await supabase.from("products").delete().eq("id", testProd.id);
    console.log("   (cleaned up test row)");
  }

  console.log("\n--- Done ---");
}

check().catch((err) => console.error("Fatal:", err));
