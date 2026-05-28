import { getSupabaseClient } from "./supabase-client.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = (process.env.JWT_SECRET || "development-secret-change-in-production").replace(/^['"]|['"]$/g, "");

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { id, token } = JSON.parse(event.body);

    // 1. Verify admin token
    jwt.verify(token, JWT_SECRET);

    // 2. Delete from Supabase
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Delete pack error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
