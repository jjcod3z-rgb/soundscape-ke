/**
 * One-time script to set CORS policy on the Cloudflare R2 bucket.
 * This allows the browser to PUT files directly to R2 via presigned URLs.
 *
 * Run with: node scripts/set-r2-cors.mjs
 */
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";

config(); // load .env

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "soundscape";

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error("Missing R2 credentials in .env file");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const corsRules = [
  {
    AllowedOrigins: [
      "https://the-sound-scape.netlify.app",
      "http://localhost:8888",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag", "Content-Length"],
    MaxAgeSeconds: 3600,
  },
];

async function main() {
  console.log(`Setting CORS on bucket "${R2_BUCKET_NAME}"...`);
  console.log("Allowed origins:", corsRules[0].AllowedOrigins);

  try {
    await client.send(
      new PutBucketCorsCommand({
        Bucket: R2_BUCKET_NAME,
        CORSConfiguration: { CORSRules: corsRules },
      })
    );
    console.log("✅ CORS policy set successfully!");

    // Verify
    const result = await client.send(
      new GetBucketCorsCommand({ Bucket: R2_BUCKET_NAME })
    );
    console.log("Verified CORS rules:", JSON.stringify(result.CORSRules, null, 2));
  } catch (err) {
    console.error("❌ Failed to set CORS:", err.message);
    process.exit(1);
  }
}

main();
