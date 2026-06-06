import { getSupabaseClient } from "./supabase-client.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = (process.env.JWT_SECRET || "development-secret-change-in-production").replace(/^['"]|['"]$/g, "");

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const supabase = getSupabaseClient();
    const { id, title, description, price, coverUrl, maxPurchases, isActive, token } = JSON.parse(event.body);

    // 1. Verify admin token
    jwt.verify(token, JWT_SECRET);

    if (!id) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Missing product id" }),
      };
    }

    // 2. Build update payload — only include fields that were sent
    const payload = {};
    if (title !== undefined) payload.name = title;
    if (description !== undefined) payload.description = description;
    if (price !== undefined) payload.price_kes = parseInt(price, 10);
    if (coverUrl !== undefined) payload.r2_preview_url = coverUrl;
    if (isActive !== undefined) payload.is_active = isActive;
    // maxPurchases: null means unlimited, a number means fixed stock
    if (maxPurchases !== undefined) payload.max_purchases = maxPurchases === null ? null : parseInt(maxPurchases, 10);

    if (Object.keys(payload).length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "No fields to update" }),
      };
    }

    // 3. Update in Supabase
    const { data, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update-pack error:", JSON.stringify(error));
      throw new Error(error.message || "Database update failed");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, product: data }),
    };
  } catch (error) {
    console.error("update-pack error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: error.message || "Unknown error" }),
    };
  }
};
