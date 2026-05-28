/**
 * Shared Supabase client factory for Netlify functions.
 * Uses the "ws" package for WebSocket support on Node.js < 22.
 */
import { createClient } from "@supabase/supabase-js";

export function getSupabaseClient() {
  const url = (process.env.SUPABASE_URL || "").replace(/^['"]|['"]$/g, "");
  const key = (process.env.SUPABASE_SERVICE_KEY || "").replace(/^['"]|['"]$/g, "");

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables");
  }

  return createClient(url, key, {
    realtime: false,           // serverless functions don't need realtime
    auth: { persistSession: false },
  });
}
