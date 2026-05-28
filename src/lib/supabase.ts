import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: "voiceover" | "game_audio" | "custom_song" | "sound_pack";
  description: string;
  price_kes: number;
  r2_preview_url: string | null;
  r2_product_urls: { name: string; url: string }[];
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  customer_email: string;
  customer_phone: string | null;
  product_id: string;
  amount_kes: number;
  pesapal_order_id: string | null;
  pesapal_tracking_id: string | null;
  status: "pending" | "paid" | "failed" | "expired";
  download_token: string | null;
  download_expires_at: string | null;
  created_at: string;
}
