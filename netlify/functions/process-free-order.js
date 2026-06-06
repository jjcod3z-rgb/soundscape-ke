import { getSupabaseClient } from "./supabase-client.js";
import crypto from "crypto";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const supabase = getSupabaseClient();
    const { email, name, productId, productIds } = JSON.parse(event.body);

    if (!email || !name || (!productId && (!productIds || productIds.length === 0))) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const idsToCheck = Array.isArray(productIds) && productIds.length > 0 ? productIds : [productId];

    // 1. Verify all products are actually free
    const { data: products, error: productsErr } = await supabase
      .from("products")
      .select("name, price_kes")
      .in("id", idsToCheck);

    if (productsErr || !products || products.length === 0) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "One or more products not found" }),
      };
    }

    for (const p of products) {
      if (p.price_kes !== 0) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: `Product "${p.name}" is not free. Checkout via PesaPal is required.` }),
        };
      }
    }

    // 2. Generate download token and expiry
    const downloadToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // 3. Create the paid order directly
    const insertPayload = {
      customer_email: email,
      product_id: productId || idsToCheck[0],
      amount_kes: 0,
      status: "paid",
      download_token: downloadToken,
      download_expires_at: expiresAt.toISOString()
    };

    if (Array.isArray(productIds) && productIds.length > 0) {
      insertPayload.product_ids = productIds;
    }

    let order;
    let orderError;

    const { data: orderWithIds, error: errWithIds } = await supabase
      .from("orders")
      .insert(insertPayload)
      .select()
      .single();

    order = orderWithIds;
    orderError = errWithIds;

    // Self-healing fallback if product_ids column does not exist yet
    if (orderError && (orderError.message.includes("product_ids") || orderError.message.includes("column"))) {
      console.warn("orders table lacks product_ids column. Retrying free order creation with legacy product_id fallback...");
      const fallbackPayload = {
        customer_email: email,
        product_id: productId || idsToCheck[0],
        amount_kes: 0,
        status: "paid",
        download_token: downloadToken,
        download_expires_at: expiresAt.toISOString()
      };
      const { data: fallbackOrder, error: fallbackErr } = await supabase
        .from("orders")
        .insert(fallbackPayload)
        .select()
        .single();

      order = fallbackOrder;
      orderError = fallbackErr;
    }

    if (orderError) {
      throw new Error(`Failed to insert order: ${orderError.message}`);
    }

    // 4. Send Confirmation Email if RESEND_API_KEY is configured
    if (process.env.RESEND_API_KEY) {
      try {
        const downloadLink = `${process.env.URL || "https://the-sound-scape.netlify.app"}/cart?orderId=${order.id}`;

        const productNames = products.map((p) => p.name).join(", ");
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "The-Sound-Scape <onboarding@resend.dev>",
            to: email,
            subject: `Your Free Audio Pack Download — The-Sound-Scape`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
                <h2 style="color: #10b981;">Your download is ready!</h2>
                <p>Hi there,</p>
                <p>You have successfully claimed: <strong>${productNames || "Free Audio Pack"}</strong>.</p>
                <p>Click the button below to download your audio files immediately:</p>
                <div style="margin: 30px 0; text-align: center;">
                  <a href="${downloadLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-weight: bold; display: inline-block;">Download Audio Files</a>
                </div>
                <p style="color: #666; font-size: 12px;">Note: This link will expire in 7 days for your security.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #999;">© The-Sound-Scape. Made in Kenya 🇰🇪</p>
              </div>
            `,
          }),
        });

        if (!emailRes.ok) {
          console.error("Resend API error:", await emailRes.text());
        }
      } catch (emailErr) {
        console.error("Failed to send free order email via Resend:", emailErr);
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        orderId: order.id,
        downloadToken,
      }),
    };
  } catch (error) {
    console.error("Process free order error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};
