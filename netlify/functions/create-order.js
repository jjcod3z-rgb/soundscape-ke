import { getSupabaseClient } from "./supabase-client.js";

async function getPesapalToken() {
  const res = await fetch("https://pay.pesapal.com/v3/api/Auth/RequestToken", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Pesapal auth failed: ${await res.text()}`);
  const data = await res.json();
  return data.token;
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const supabase = getSupabaseClient();
    const { amount, description, email, name, productId, callbackUrl } = JSON.parse(event.body);

    // 1. Get Pesapal Auth Token
    const token = await getPesapalToken();

    // 2. Register IPN
    const ipnUrl = process.env.URL ? `${process.env.URL}/.netlify/functions/pesapal-callback` : "https://the-sound-scape.netlify.app/.netlify/functions/pesapal-callback";
    const ipnRes = await fetch("https://pay.pesapal.com/v3/api/URLSetup/RegisterIPN", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url: ipnUrl, ipn_notification_type: "GET" })
    });
    const ipnData = await ipnRes.json();
    const ipnId = ipnData.ipn_id || ipnData.error?.message?.ipn_id || "fallback-id";

    // 3. Create Order in Supabase
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_email: email,
        product_id: productId,
        amount_kes: amount,
        status: "pending"
      })
      .select()
      .single();

    if (orderError) throw new Error(`Supabase error: ${orderError.message}`);

    // 4. Submit Order to Pesapal
    const orderData = {
      id: order.id,
      currency: "KES",
      amount: amount,
      description: description,
      callback_url: callbackUrl,
      notification_id: ipnId,
      billing_address: {
        email_address: email,
        first_name: name.split(" ")[0] || "Customer",
        last_name: name.split(" ").slice(1).join(" ") || "Name",
      },
    };

    const submitRes = await fetch("https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(orderData)
    });

    if (!submitRes.ok) throw new Error(`Pesapal order failed: ${await submitRes.text()}`);
    const submitData = await submitRes.json();

    // 5. Update Supabase with Pesapal Tracking ID
    await supabase.from("orders").update({
      pesapal_order_id: submitData.order_tracking_id
    }).eq("id", order.id);

    return { statusCode: 200, body: JSON.stringify({ success: true, redirectUrl: submitData.redirect_url, orderId: order.id }) };
  } catch (error) {
    console.error("Create order error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
