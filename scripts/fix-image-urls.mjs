/**
 * fix-image-urls.mjs
 *
 * Rewrites all r2_preview_url and r2_product_urls fields in the `products`
 * table from private R2 API URLs to public dev URLs.
 *
 * Usage:
 *   node scripts/fix-image-urls.mjs
 *
 * Requires R2_PUBLIC_URL and SUPABASE_* to be set in .env
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const PUBLIC_BASE = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

if (!PUBLIC_BASE) {
  console.error("❌ R2_PUBLIC_URL is not set in .env — please add your public R2 dev URL first.");
  process.exit(1);
}

console.log(`✅ Using public base URL: ${PUBLIC_BASE}\n`);

/**
 * Rewrite a single private R2 URL to the public URL.
 * Input:  https://soundscape.5cc83bc58a9538c026cb1607d9b01c43.r2.cloudflarestorage.com/uploads/file.jpg
 * Output: https://pub-xxx.r2.dev/uploads/file.jpg
 */
function rewrite(url) {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("data:")) return url; // base64 — can't fix without re-upload
  if (url.includes(".r2.cloudflarestorage.com/")) {
    const parts = url.split(".r2.cloudflarestorage.com/");
    const path = parts[1] || "";
    // Strip leading bucket name if present
    const cleanPath = path.startsWith("soundscape/") ? path.replace(/^soundscape\//, "") : path;
    return `${PUBLIC_BASE}/${cleanPath}`;
  }
  return url; // already a public or unknown URL — leave unchanged
}

async function run() {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, r2_preview_url, r2_product_urls");

  if (error) {
    console.error("❌ Failed to fetch products:", error.message);
    process.exit(1);
  }

  console.log(`Found ${products.length} product(s) to inspect.\n`);

  for (const p of products) {
    const updates = {};
    let changed = false;

    // 1. Fix cover image URL
    const newCover = rewrite(p.r2_preview_url);
    if (newCover !== p.r2_preview_url) {
      console.log(`  [${p.name}] cover: ${p.r2_preview_url}`);
      console.log(`           → ${newCover}`);
      updates.r2_preview_url = newCover;
      changed = true;
    } else if (p.r2_preview_url?.startsWith("data:")) {
      console.warn(`  ⚠ [${p.name}] cover is a base64 data URI — needs to be re-uploaded manually.`);
    } else {
      console.log(`  [${p.name}] cover already OK: ${p.r2_preview_url}`);
    }

    // 2. Fix file URLs
    if (Array.isArray(p.r2_product_urls)) {
      const newFiles = p.r2_product_urls.map((f) => {
        const newUrl = rewrite(f.url);
        if (newUrl !== f.url) {
          changed = true;
          console.log(`  [${p.name}] file "${f.name}": ${f.url}`);
          console.log(`           → ${newUrl}`);
        }
        return { ...f, url: newUrl };
      });
      if (changed) updates.r2_product_urls = newFiles;
    }

    if (changed) {
      const { error: updateErr } = await supabase
        .from("products")
        .update(updates)
        .eq("id", p.id);

      if (updateErr) {
        console.error(`  ❌ Failed to update [${p.name}]:`, updateErr.message);
      } else {
        console.log(`  ✅ [${p.name}] updated successfully.\n`);
      }
    } else {
      console.log(`  ✔  [${p.name}] no changes needed.\n`);
    }
  }

  console.log("Done.");
}

run();
