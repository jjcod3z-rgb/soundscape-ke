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
  if (!res.ok) throw new Error("Pesapal auth failed");
  const data = await res.json();
  return data.token;
}

export const handler = async (event) => {
  // PesaPal sends IPN notifications as GET requests with OrderTrackingId and OrderMerchantReference
  const { OrderTrackingId, OrderMerchantReference } = event.queryStringParameters;
  
  if (!OrderTrackingId || !OrderMerchantReference) {
    return { statusCode: 400, body: "Missing parameters" };
  }

  try {
    const supabase = getSupabaseClient();
    const token = await getPesapalToken();
    
    // 1. Verify with PesaPal Status API (IPN)
    const statusRes = await fetch(`https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const statusData = await statusRes.json();
    
    // 2. Update Supabase
    const isCompleted = statusData.payment_status_description?.toLowerCase() === "completed" || statusData.status_code === 1;

    // Generate a secure download token if paid
    const downloadToken = isCompleted ? crypto.randomUUID() : null;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const updatePayload = { 
      status: isCompleted ? "paid" : "failed",
      pesapal_tracking_id: OrderTrackingId
    };

    if (isCompleted) {
      updatePayload.download_token = downloadToken;
      updatePayload.download_expires_at = expiresAt.toISOString();
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", OrderMerchantReference)
      .select("*, products(name)")
      .single();
      
    if (orderErr) {
      console.error("Supabase update error:", orderErr);
    }

    // Increment total_purchases on the product
    if (isCompleted && order?.product_id) {
      await supabase.rpc("increment_product_purchases", { product_id: order.product_id }).catch((err) =>
        console.error("Failed to increment total_purchases:", err)
      );
    }

    // 2.5 Send Confirmation Email if paid and RESEND_API_KEY is configured
    if (isCompleted && order && process.env.RESEND_API_KEY) {
      try {
        const productName = order.products?.name || "Premium Audio Pack";
        const downloadLink = `${process.env.URL || "https://the-sound-scape.netlify.app"}/cart?orderId=${order.id}`;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "The-Sound-Scape <onboarding@resend.dev>",
            to: order.customer_email,
            subject: `Your Purchase Confirmation — The-Sound-Scape`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
                <h2 style="color: #10b981;">Thank you for your purchase!</h2>
                <p>Hi there,</p>
                <p>Your payment has been successfully confirmed. You bought: <strong>${productName}</strong> for <strong>KES ${order.amount_kes}</strong>.</p>
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
        console.error("Failed to send email via Resend:", emailErr);
      }
    }

    // 3. Return postMessage HTML to parent window (since this is loaded inside an iframe)
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            window.parent.postMessage({
              type: '${isCompleted ? "PAYMENT_SUCCESS" : "PAYMENT_FAILED"}',
              orderId: '${OrderMerchantReference}',
              downloadToken: '${downloadToken}'
            }, '*');
          </script>
          <p style="font-family:sans-serif;text-align:center;padding:40px;color:white;">
            ${isCompleted ? "Payment confirmed. You can now download your files." : "Payment failed. Please try again."}
          </p>
        </body>
      </html>
    `;
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: html
    };
  } catch (error) {
    console.error("Pesapal callback error:", error);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
