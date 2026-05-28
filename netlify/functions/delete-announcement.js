import { getSupabaseClient } from "./supabase-client.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = (process.env.JWT_SECRET || "development-secret-change-in-production").replace(/^['"]|['"]$/g, "");

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { id, token } = JSON.parse(event.body);

    // Verify token
    jwt.verify(token, JWT_SECRET);

    if (!id) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "ID is required" }),
      };
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("Delete announcement error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err.message || "Failed to delete announcement" }),
    };
  }
};
