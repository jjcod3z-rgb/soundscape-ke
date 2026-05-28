// Diagnostic function — call GET /.netlify/functions/debug-env to check env vars
// DELETE THIS FILE after debugging is complete!

export const handler = async (event) => {
  const vars = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
    "SUPABASE_ANON_KEY",
    "JWT_SECRET",
    "ADMIN_PASSWORD",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
  ];

  const report = {};
  for (const v of vars) {
    const val = process.env[v];
    if (!val) {
      report[v] = "❌ NOT SET";
    } else {
      // Show first 8 chars and length for verification, never the full secret
      report[v] = `✅ SET (${val.length} chars, starts with: ${val.substring(0, 8)}...)`;
    }
  }

  // Also test Supabase connectivity
  let supabaseTest = "skipped";
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (url && key) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(url, key);
      const { data, error } = await supabase.from("products").select("id").limit(1);
      if (error) {
        supabaseTest = `❌ Query failed: ${error.message}`;
      } else {
        supabaseTest = `✅ Connected! Found ${data.length} row(s) in products table`;
      }
    } catch (e) {
      supabaseTest = `❌ createClient crashed: ${e.message}`;
    }
  } else {
    supabaseTest = "❌ Cannot test — URL or key is missing";
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ envVars: report, supabaseTest, nodeVersion: process.version }, null, 2),
  };
};
