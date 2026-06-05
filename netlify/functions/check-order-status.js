import { getSupabaseClient } from "./supabase-client.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { orderId } = JSON.parse(event.body);

    if (!orderId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing orderId" }),
      };
    }

    const supabase = getSupabaseClient();

    const { data: order, error } = await supabase
      .from("orders")
      .select("status, download_token")
      .eq("id", orderId)
      .single();

    if (error) {
      console.error("Error fetching order status:", error);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Failed to fetch order status" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        status: order.status,
        downloadToken: order.download_token,
      }),
    };
  } catch (err) {
    console.error("check-order-status error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Internal Server Error" }),
    };
  }
};
