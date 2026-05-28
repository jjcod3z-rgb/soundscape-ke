import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || "development-secret-change-in-production";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { title, description, price, coverUrl, files, token } = JSON.parse(event.body);

    // 1. Verify admin token
    jwt.verify(token, JWT_SECRET);

    // 2. Generate slug
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

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

    if (error) throw error;

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
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
