import { getSupabaseClient } from "./supabase-client.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { genre, duration, lyrics, customerEmail, customerPhone } = JSON.parse(event.body);

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("song_briefs")
      .insert({
        genre,
        duration,
        lyrics_notes: lyrics || null,
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, briefId: data.id }),
    };
  } catch (error) {
    console.error("Submit brief error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
