import { getSupabaseClient } from "./supabase-client.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = (process.env.JWT_SECRET || "development-secret-change-in-production").replace(/^['"]|['"]$/g, "");

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const supabase = getSupabaseClient();
    const { title, description, price, coverUrl, files, token } = JSON.parse(event.body);

    // 1. Verify admin token
    jwt.verify(token, JWT_SECRET);

    // 2. Generate slug with uniqueness suffix
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // 3. Insert into Supabase
    const { data, error } = await supabase
      .from("products")
      .insert({
        slug,
        name: title,
        category: "sound_pack",
        description,
        price_kes: parseInt(price, 10),
        r2_preview_url: coverUrl || null,
        r2_product_urls: Array.isArray(files) ? files : [],
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", JSON.stringify(error));
      throw new Error(error.message || "Database insert failed");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, product: data }),
    };
  } catch (error) {
    console.error("Create pack error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: error.message || "Unknown error" }),
    };
  }
};
