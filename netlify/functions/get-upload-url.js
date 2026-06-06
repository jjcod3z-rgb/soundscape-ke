import jwt from "jsonwebtoken";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const JWT_SECRET = process.env.JWT_SECRET || "development-secret-change-in-production";

const getS3Client = () =>
  new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });

const R2_BUCKET = process.env.R2_BUCKET_NAME || "soundscape";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { filename, contentType, token } = JSON.parse(event.body);

    // Verify token
    jwt.verify(token, JWT_SECRET);

    const client = getS3Client();
    const key = `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    
    // Construct the publicly accessible URL for storing in the DB.
    // Priority: explicit R2_PUBLIC_URL > fall back to the private r2.cloudflarestorage.com URL
    // (the frontend getPublicUrl() helper will rewrite private URLs using VITE_R2_PUBLIC_URL at display time)
    const publicBase = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
    const publicUrl = publicBase
      ? `${publicBase}/${key}`
      : uploadUrl.split("?")[0]; // private URL — getPublicUrl() on frontend will rewrite this

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, uploadUrl, publicUrl, key }),
    };
  } catch (err) {
    console.error("Upload URL generation error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err.message || "Failed to generate upload URL" }),
    };
  }
};
