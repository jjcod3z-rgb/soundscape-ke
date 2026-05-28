import { getSupabaseClient } from "./supabase-client.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = (process.env.JWT_SECRET || "development-secret-change-in-production").replace(/^['"]|['"]$/g, "");

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { title, body, token } = JSON.parse(event.body);

    // Verify token
    jwt.verify(token, JWT_SECRET);

    if (!title || !body) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Title and body are required" }),
      };
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("announcements")
      .insert({ title, body })
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, announcement: data }),
    };
  } catch (err) {
    console.error("Create announcement error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err.message || "Failed to create announcement" }),
    };
  }
};
