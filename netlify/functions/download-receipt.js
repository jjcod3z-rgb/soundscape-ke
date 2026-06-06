import { getSupabaseClient } from "./supabase-client.js";

export const handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const supabase = getSupabaseClient();
    const { orderId } = event.queryStringParameters || {};

    if (!orderId) {
      return { statusCode: 400, body: "Missing orderId" };
    }

    // 1. Fetch order details
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order || order.status !== "paid") {
      return { statusCode: 403, body: "Invalid or unpaid order" };
    }

    // Fetch all products in this order
    const ids = Array.isArray(order.product_ids) && order.product_ids.length > 0
      ? order.product_ids
      : [order.product_id].filter(Boolean);

    let productNames = "Premium Audio Pack";
    if (ids.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("name")
        .in("id", ids);
      if (products && products.length > 0) {
        productNames = products.map((p) => p.name).join(", ");
      }
    }
    const purchaseDate = new Date(order.created_at).toUTCString();
    const siteUrl = process.env.URL || "https://the-sound-scape.netlify.app";
    const redownloadUrl = `${siteUrl}/cart?orderId=${order.id}`;
    const redownloadPageUrl = `${siteUrl}/redownload`;

    // 2. Build the receipt .txt content
    const receipt = `
================================================================================
                     THE-SOUND-SCAPE — PURCHASE RECEIPT
================================================================================

  Reference ID  : ${order.id}
  Date          : ${purchaseDate}
  Status        : PAID ✓

  CUSTOMER DETAILS
  ─────────────────────────────────────────────────────────────
  Email         : ${order.customer_email}

  PURCHASE DETAILS
  ─────────────────────────────────────────────────────────────
  Product       : ${productNames}
  Amount        : KES ${order.amount_kes.toLocaleString()}

  RE-DOWNLOAD
  ─────────────────────────────────────────────────────────────
  You can re-access your files at any time using the link below.
  Bookmark this page or save your Order Reference ID.

  Direct Link   : ${redownloadUrl}
  Re-download   : ${redownloadPageUrl}
  (Enter your email + Order Reference ID at the re-download page)

  ─────────────────────────────────────────────────────────────
  ⚠  IMPORTANT — ANTI-PIRACY NOTICE  ⚠
  ─────────────────────────────────────────────────────────────
  This purchase is licensed for your personal and commercial use
  only (one license, one user). Redistribution, resale, or public
  sharing of these files — or this download link — is strictly
  prohibited and constitutes copyright infringement.

  Misuse will result in the permanent revocation of your download
  access and may be subject to legal action.
  ─────────────────────────────────────────────────────────────

  Thank you for supporting independent Kenyan audio production.
  — The-Sound-Scape Team

================================================================================
`.trim();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="receipt-${order.id.slice(0, 8)}.txt"`,
      },
      body: receipt,
    };
  } catch (err) {
    console.error("download-receipt error:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
