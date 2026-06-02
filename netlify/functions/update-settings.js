import { getSupabaseClient } from "./supabase-client.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = (process.env.JWT_SECRET || "development-secret-change-in-production").replace(/^['"]|['"]$/g, "");

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { token, settings } = JSON.parse(event.body);

    // 1. Verify admin token
    jwt.verify(token, JWT_SECRET);

    // 2. Map fields to snake_case for Supabase
    const payload = {
      brand_name: settings.brandName,
      hero_quip: settings.heroQuip,
      hero_subtitle: settings.heroSubtitle,
      about_description: settings.aboutDescription,
      hero_image_url: settings.heroImageUrl,
      contact_number: settings.contactNumber,
      logo_url: settings.logoUrl,
    };

    const supabase = getSupabaseClient();
    
    // We update the row where id = 'global'
    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: "global", ...payload })
      .select();

    if (error) {
      console.error("Supabase settings update error:", JSON.stringify(error));
      throw new Error(error.message || "Failed to update global settings");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Update settings error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: error.message || "Unknown error" }),
    };
  }
};
