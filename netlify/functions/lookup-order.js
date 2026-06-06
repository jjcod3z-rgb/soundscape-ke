import { getSupabaseClient } from "./supabase-client.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const supabase = getSupabaseClient();
    const { email, orderId } = JSON.parse(event.body);

    if (!email || !orderId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Both email and Order Reference ID are required." }),
      };
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select("id, status, customer_email, amount_kes, created_at, products(name)")
      .eq("id", orderId.trim())
      .eq("customer_email", email.trim().toLowerCase())
      .single();

    if (error || !order) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No order found with that email and reference ID. Please double-check both fields." }),
      };
    }

    if (order.status !== "paid") {
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "This order has not been completed. Status: " + order.status }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        orderId: order.id,
        productName: order.products?.name || "Audio Pack",
        amountKes: order.amount_kes,
        purchaseDate: order.created_at,
      }),
    };
  } catch (err) {
    console.error("lookup-order error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
