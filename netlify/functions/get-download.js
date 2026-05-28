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

    const files = [
      {
        name: `${product.slug}.mp3`,
        key: `products/${product.slug}/track.mp3`,
        type: "audio",
      },
    ];

    const signedFiles = await Promise.all(
      files.map(async (f) => {
        const command = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: f.key,
        });
        
        try {
          const url = await getSignedUrl(r2, command, { expiresIn: 3600 }); // 1 hour
          return { ...f, signedUrl: url };
        } catch (err) {
          console.error("Error signing url for key:", f.key, err);
          return { ...f, signedUrl: null, error: "Failed to generate link" };
        }
      })
    );

    return { statusCode: 200, body: JSON.stringify({ files: signedFiles }) };
  } catch (error) {
    console.error("Get download error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
