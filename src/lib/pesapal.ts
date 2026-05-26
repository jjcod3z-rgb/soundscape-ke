// Pesapal V3 REST API Integration
// This replaces the legacy OAuth 1.0a XML integration with the modern JSON REST API

const isProd = process.env.NODE_ENV === "production";
const BASE_URL = isProd ? "https://pay.pesapal.com/v3" : "https://cybqa.pesapal.com/pesapalv3";
const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || "QaVJ1jCtqK3ezJhMu1ulWeceZ1vZrwvX";
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || "hcJ7g4IwNbv1RSHuYJz2446FXCM=";

// 1. Get Authentication Token
export async function getPesapalToken() {
  const response = await fetch(`${BASE_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`Pesapal auth failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.token;
}

// 2. Register IPN URL
export async function registerIPN(token: string, ipnUrl: string) {
  const response = await fetch(`${BASE_URL}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: "POST",
    }),
  });

  const data = await response.json();
  return data.ipn_id;
}

// 3. Submit Order
export async function submitOrder(
  token: string,
  orderData: {
    id: string;
    currency: string;
    amount: number;
    description: string;
    callback_url: string;
    ipn_id: string;
    billing_address: {
      email_address: string;
      first_name?: string;
      last_name?: string;
    };
  },
) {
  const response = await fetch(`${BASE_URL}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Pesapal order error: ${data.error.message}`);
  }

  // data.redirect_url contains the iframe URL
  return data;
}

// 4. Get Transaction Status
export async function getTransactionStatus(token: string, orderTrackingId: string) {
  const response = await fetch(
    `${BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return await response.json();
}
