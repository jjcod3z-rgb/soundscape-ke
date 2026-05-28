import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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
    const token = await getPesapalToken();
    
    // 1. Verify with PesaPal Status API (IPN)
    const statusRes = await fetch(`https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const statusData = await statusRes.json();
    
    // 2. Update Supabase
    // statusData.payment_status_description typically contains "Completed", "Failed", etc.
    // For Sandbox it's "Completed".
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

    const { error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", OrderMerchantReference);
      
    if (error) {
      console.error("Supabase update error:", error);
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
