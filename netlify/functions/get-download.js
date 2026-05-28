import { createClient } from "@supabase/supabase-js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { orderId } = event.queryStringParameters;
    if (!orderId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing orderId" }) };
    }

    // 1. Verify order exists and is paid
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, products(*)")
      .eq("id", orderId)
      .single();

    if (orderError || !order || order.status !== "paid") {
      return { statusCode: 403, body: JSON.stringify({ error: "Invalid or unpaid order" }) };
    }

    if (order.download_expires_at && new Date() > new Date(order.download_expires_at)) {
      return { statusCode: 410, body: JSON.stringify({ error: "Download link expired" }) };
    }

    // 2. Generate signed URLs for individual files (NO ZIPPING)
    // For this storefront, we just serve the main track for each product associated with the order.
    // Wait, the order structure from the prompt: order has product_id.
    const product = order.products;

    if (!product) {
      return { statusCode: 404, body: JSON.stringify({ error: "Product not found" }) };
    }

    const filesToSign = Array.isArray(product.r2_product_urls) ? product.r2_product_urls : [];

    if (filesToSign.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: "No files found for this product" }) };
    }

    const files = filesToSign.map(async (f) => {
      // The stored URL might be a full R2 public URL or a local base64 fallback.
      // If it's a base64 string, we can't sign it with S3, we just pass it through.
      // But typically it's an R2 URL. Wait, the frontend uploads via presigned URL and gets back the full URL.
      // But `f.url` is what we have. To sign it via S3, we need the Object Key, not the URL.
      // Let's extract the key from the URL.
      // URL format: https://<custom_domain>/<filename> or similar.
      // Actually, wait! The frontend uploaded it and set `res.publicUrl`.
      // Let's check `get-upload-url.js` to see what `publicUrl` is. 
      // It's likely `https://${process.env.R2_PUBLIC_URL}/${key}` or similar.
      // Let's assume `f.name` was used as the key, or we just extract the path.
      // Wait, let's look at get-upload-url.js to be sure.

      let key = "";
      try {
        const urlObj = new URL(f.url);
        // If it's a direct R2 URL (e.g. https://<account>.r2.cloudflarestorage.com/soundscape/uploads/...)
        // we need to extract the path after the bucket name or domain.
        // For standard S3-like URLs: /<bucket>/<key>
        if (urlObj.hostname.includes("r2.cloudflarestorage.com")) {
            // Path is usually /<bucket_name>/<key>
            const pathParts = urlObj.pathname.split("/").filter(Boolean);
            if (pathParts[0] === process.env.R2_BUCKET_NAME) {
               key = pathParts.slice(1).join("/");
            } else {
               key = pathParts.join("/");
            }
        } else if (process.env.R2_PUBLIC_URL && f.url.startsWith(process.env.R2_PUBLIC_URL)) {
            key = f.url.substring(process.env.R2_PUBLIC_URL.length).replace(/^\//, "");
        }
      } catch (e) {
        // If it's a data URI or invalid URL, we can't sign it.
      }

      if (!key) {
        // If we couldn't extract a key, we just return the original URL (e.g., local base64 fallback)
        return { name: f.name, signedUrl: f.url, type: "audio" };
      }

      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      });
      
      try {
        const url = await getSignedUrl(r2, command, { expiresIn: 3600 }); // 1 hour
        return { name: f.name, signedUrl: url, type: "audio" };
      } catch (err) {
        console.error("Error signing url for key:", key, err);
        return { name: f.name, signedUrl: null, error: "Failed to generate link" };
      }
    });

    const signedFiles = await Promise.all(files);

    return { statusCode: 200, body: JSON.stringify({ files: signedFiles }) };
  } catch (error) {
    console.error("Get download error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
