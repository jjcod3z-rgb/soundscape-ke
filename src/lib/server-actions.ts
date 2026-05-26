import { createServerFn } from "@tanstack/react-start";
import jwt from "jsonwebtoken";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getPesapalToken, registerIPN, submitOrder } from "./pesapal";

// S3 Client configured for Cloudflare R2
const getS3Client = () =>
  new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || "",
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });
const R2_BUCKET = process.env.R2_BUCKET_NAME || "kelele-sound-files";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key-for-dev";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export const loginFn = createServerFn({ method: "POST" }).handler(
  async ({ data: password }: { data: string }) => {
    if (password === ADMIN_PASSWORD) {
      const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "1d" });
      return { success: true, token };
    }
    return { success: false, error: "Invalid password" };
  },
);

export const verifyTokenFn = createServerFn({ method: "POST" }).handler(
  async ({ data: token }: { data: string }) => {
    try {
      jwt.verify(token, JWT_SECRET);
      return { authed: true };
    } catch {
      return { authed: false };
    }
  },
);

export const getUploadUrlFn = createServerFn({ method: "POST" }).handler(
  async ({
    data: { filename, contentType, token },
  }: {
    data: { filename: string; contentType: string; token: string };
  }) => {
    try {
      // Verify admin token before allowing upload
      jwt.verify(token, JWT_SECRET);

      const client = getS3Client();
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
      // The public URL assuming the bucket has a public custom domain set up
      const publicUrl = process.env.R2_PUBLIC_URL
        ? `${process.env.R2_PUBLIC_URL}/${command.input.Key}`
        : uploadUrl.split("?")[0]; // fallback to the endpoint URL without query params (might not be publicly accessible if R2 bucket isn't public, but good enough for dev)

      return { success: true, uploadUrl, publicUrl };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message || "Failed to generate upload URL" };
    }
  },
);

export const createPesapalOrderFn = createServerFn({ method: "POST" }).handler(
  async ({
    data,
  }: {
    data: {
      amount: number;
      description: string;
      email: string;
      name: string;
      reference: string;
      callbackUrl: string;
    };
  }) => {
    try {
      const token = await getPesapalToken();

      // The IPN URL should be your public API endpoint that listens to Pesapal notifications.
      // If PESAPAL_IPN_URL is not set in env, fallback to localhost which won't work in prod but avoids crashes.
      const ipnUrl =
        process.env.PESAPAL_IPN_URL || "https://your-public-domain.com/api/pesapal/ipn";
      const ipnId = await registerIPN(token, ipnUrl);

      const orderData = {
        id: data.reference,
        currency: "KES",
        amount: data.amount,
        description: data.description,
        callback_url: data.callbackUrl,
        ipn_id: ipnId,
        billing_address: {
          email_address: data.email,
          first_name: data.name.split(" ")[0],
          last_name: data.name.split(" ").slice(1).join(" ") || "Customer",
        },
      };

      const result = await submitOrder(token, orderData);

      return { success: true, redirectUrl: result.redirect_url };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message || "Failed to create Pesapal order" };
    }
  },
);
