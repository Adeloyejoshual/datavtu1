import axios from "axios";
import config from "../config/env.js";
import logger from "../utils/logger.js";

let monnifyToken = null;
let tokenExpiry = null;

// Get access token
async function getAccessToken() {
  if (monnifyToken && tokenExpiry && Date.now() < tokenExpiry) {
    return monnifyToken;
  }

  try {
    const credentials = Buffer.from(
      `${config.monnify.apiKey}:${config.monnify.secretKey}`
    ).toString("base64");

    const response = await axios.post(
      `${config.monnify.baseUrl}/api/v1/auth/login`,
      {},
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    monnifyToken = response.data.responseBody.accessToken;
    tokenExpiry = Date.now() + 290000; // Token valid for ~5 minutes

    return monnifyToken;
  } catch (error) {
    logger.error("Monnify auth failed", { error: error.message });
    throw new Error("Payment service authentication failed.");
  }
}

// Create reserved account
export async function createReservedAccount(userData) {
  try {
    const token = await getAccessToken();

    const response = await axios.post(
      `${config.monnify.baseUrl}/api/v2/bank-transfer/reserved-accounts`,
      {
        accountReference: `VTU-${userData.userId}`,
        accountName: `${userData.first_name} ${userData.last_name}`,
        currencyCode: "NGN",
        contractCode: config.monnify.contractCode,
        customerEmail: userData.email,
        customerName: `${userData.first_name} ${userData.last_name}`,
        getAllAvailableBanks: true,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.responseBody;
  } catch (error) {
    logger.error("Monnify reserved account failed", { error: error.message });
    throw new Error("Unable to create virtual account.");
  }
}

// Verify transaction
export async function verifyMonnifyTransaction(transactionReference) {
  try {
    const token = await getAccessToken();
    const encodedRef = encodeURIComponent(transactionReference);

    const response = await axios.get(
      `${config.monnify.baseUrl}/api/v2/transactions/${encodedRef}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.responseBody;
  } catch (error) {
    logger.error("Monnify verification failed", { error: error.message });
    throw new Error("Unable to verify transaction.");
  }
}