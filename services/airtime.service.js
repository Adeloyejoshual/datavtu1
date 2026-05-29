import axios from "axios";
import config from "../config/env.js";
import { generateReference } from "../utils/generateReference.js";
import { debitWallet, creditWallet } from "./wallet.service.js";
import {
  createTransaction,
  updateTransactionStatus,
  checkIdempotency,
} from "./transaction.service.js";
import { getClient, withTransaction } from "../database/db.js";
import {
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  VTPASS_SERVICE_IDS,
  AIRTIME_DISCOUNT_RATES,
} from "../config/constants.js";
import logger from "../utils/logger.js";

// VTpass axios instance
const vtpassApi = axios.create({
  baseURL: config.vtpass.baseUrl,
  headers: {
    "api-key": config.vtpass.apiKey,
    "secret-key": config.vtpass.secretKey,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Map network name to VTpass service ID
const AIRTIME_SERVICE_MAP = {
  mtn: VTPASS_SERVICE_IDS.MTN_AIRTIME,
  glo: VTPASS_SERVICE_IDS.GLO_AIRTIME,
  airtel: VTPASS_SERVICE_IDS.AIRTEL_AIRTIME,
  etisalat: VTPASS_SERVICE_IDS.ETISALAT_AIRTIME,
};

// ========================
// Buy Airtime
// ========================
export async function buyAirtimeService(userId, data) {
  const { network, phone, amount, idempotency_key } = data;

  // 1. Idempotency check — prevent duplicate purchases
  if (idempotency_key) {
    const existing = await checkIdempotency(idempotency_key);
    if (existing) {
      logger.warn("Duplicate airtime transaction detected", {
        idempotency_key,
        userId,
      });
      return {
        success: true,
        message: "Transaction already processed.",
        data: existing,
      };
    }
  }

  // 2. Validate network
  const serviceID = AIRTIME_SERVICE_MAP[network];
  if (!serviceID) {
    throw new Error("Invalid network selected.");
  }

  const reference = generateReference("AIR");

  // 3. Normalize phone number for VTpass
  const normalizedPhone = normalizePhone(phone);

  const client = await getClient();

  try {
    await client.query("BEGIN");

    // 4. Debit wallet (with row-level locking)
    const walletResult = await debitWallet(userId, amount, client);

    // 5. Create PROCESSING transaction
    const transaction = await createTransaction(
      {
        user_id: userId,
        reference,
        type: TRANSACTION_TYPES.AIRTIME_PURCHASE,
        amount,
        fee: 0,
        total_amount: amount,
        balance_before: walletResult.balance_before,
        balance_after: walletResult.balance_after,
        status: TRANSACTION_STATUS.PROCESSING,
        provider: "vtpass",
        metadata: {
          network,
          phone: normalizedPhone,
          serviceID,
          original_phone: phone,
        },
        description: `${network.toUpperCase()} airtime recharge for ${phone}`,
        idempotency_key: idempotency_key || null,
      },
      client
    );

    await client.query("COMMIT");

    // 6. Call VTpass API (outside DB transaction)
    let vtpassResponse;

    try {
      vtpassResponse = await vtpassApi.post("/pay", {
        request_id: reference,
        serviceID,
        amount,
        phone: normalizedPhone,
      });

      logger.info("VTpass airtime response", {
        reference,
        network,
        amount,
        code: vtpassResponse.data?.code,
        response: vtpassResponse.data,
      });
    } catch (apiError) {
      // VTpass unreachable — reverse wallet debit
      logger.error("VTpass airtime API call failed", {
        reference,
        error: apiError.message,
      });

      await reverseAirtimeTransaction(
        userId,
        reference,
        amount,
        walletResult
      );

      throw new Error(
        "Airtime purchase failed. Your wallet has been refunded."
      );
    }

    // 7. Handle VTpass response codes
    return await handleVtpassAirtimeResponse(
      vtpassResponse.data,
      {
        userId,
        reference,
        network,
        phone: normalizedPhone,
        amount,
        walletResult,
      }
    );
  } catch (error) {
    // Rollback if DB transaction still open
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      // Already committed or rolled back
    }
    throw error;
  } finally {
    client.release();
  }
}

// ========================
// Handle VTpass Response
// ========================
async function handleVtpassAirtimeResponse(responseData, context) {
  const { userId, reference, network, phone, amount, walletResult } = context;
  const code = responseData?.code;
  const transactionId =
    responseData?.content?.transactions?.transactionId || null;

  // Success
  if (code === "000") {
    await updateTransactionStatus(
      reference,
      TRANSACTION_STATUS.SUCCESS,
      transactionId
    );

    logger.info("Airtime purchase successful", {
      reference,
      network,
      phone,
      amount,
    });

    return {
      success: true,
      message: "Airtime purchase successful.",
      data: {
        reference,
        network: network.toUpperCase(),
        phone,
        amount,
        balance: walletResult.balance_after,
        status: "success",
        provider_reference: transactionId,
      },
    };
  }

  // Pending / processing
  if (code === "099") {
    await updateTransactionStatus(reference, TRANSACTION_STATUS.PENDING);

    logger.warn("Airtime purchase pending", { reference, network, phone });

    return {
      success: true,
      message: "Airtime purchase is being processed. Check back shortly.",
      data: {
        reference,
        network: network.toUpperCase(),
        phone,
        amount,
        balance: walletResult.balance_after,
        status: "pending",
      },
    };
  }

  // Failed — reverse wallet debit
  const errorMessage =
    responseData?.response_description ||
    "Airtime purchase failed.";

  logger.error("VTpass airtime failed", {
    reference,
    code,
    network,
    errorMessage,
  });

  await reverseAirtimeTransaction(userId, reference, amount, walletResult);

  throw new Error(`${errorMessage} Your wallet has been refunded.`);
}

// ========================
// Reverse Failed Transaction
// ========================
async function reverseAirtimeTransaction(userId, reference, amount, originalWallet) {
  try {
    await withTransaction(async (client) => {
      // Credit wallet back
      const refundedWallet = await creditWallet(userId, amount, client);

      // Mark original as failed
      await updateTransactionStatus(
        reference,
        TRANSACTION_STATUS.FAILED,
        null,
        client
      );

      // Create reversal record
      const reversalRef = generateReference("REV");

      await createTransaction(
        {
          user_id: userId,
          reference: reversalRef,
          type: TRANSACTION_TYPES.REVERSAL,
          amount,
          fee: 0,
          total_amount: amount,
          balance_before: originalWallet.balance_after,
          balance_after: originalWallet.balance_before,
          status: TRANSACTION_STATUS.SUCCESS,
          metadata: {
            original_reference: reference,
            reason: "Airtime purchase failed",
          },
          description: `Reversal for failed airtime transaction ${reference}`,
        },
        client
      );
    });

    logger.info("Airtime transaction reversed successfully", {
      reference,
      amount,
      userId,
    });
  } catch (error) {
    logger.error("CRITICAL: Airtime reversal failed!", {
      reference,
      userId,
      amount,
      error: error.message,
    });
    // TODO: Alert admin via email/SMS
  }
}

// ========================
// Requery Airtime Transaction
// ========================
export async function requeryAirtimeTransaction(reference) {
  try {
    const response = await vtpassApi.post("/requery", {
      request_id: reference,
    });

    return response.data;
  } catch (error) {
    logger.error("Airtime requery failed", {
      reference,
      error: error.message,
    });
    throw new Error("Unable to verify airtime transaction status.");
  }
}

// ========================
// Get Airtime Transaction History
// ========================
export async function getAirtimeHistory(userId, options = {}) {
  const { query } = await import("../database/db.js");
  const { page = 1, limit = 20, network } = options;
  const offset = (page - 1) * limit;

  let whereClause = "WHERE user_id = $1 AND type = $2";
  const params = [userId, TRANSACTION_TYPES.AIRTIME_PURCHASE];
  let paramIndex = 3;

  if (network) {
    whereClause += ` AND metadata->>'network' = $${paramIndex}`;
    params.push(network.toLowerCase());
    paramIndex++;
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM transactions ${whereClause}`,
    params
  );

  const dataResult = await query(
    `SELECT * FROM transactions ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  return {
    transactions: dataResult.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
  };
}

// ========================
// Normalize Phone Number
// ========================
function normalizePhone(phone) {
  // Convert 08012345678 → 2348012345678
  if (phone.startsWith("0")) {
    return `234${phone.slice(1)}`;
  }

  // Strip + if present
  if (phone.startsWith("+234")) {
    return phone.slice(1);
  }

  return phone;
}

// ========================
// Detect Network from Phone
// ========================
export function detectNetworkFromPhone(phone) {
  const normalized = phone.replace("+234", "0").replace(/^234/, "0");

  const prefixMap = {
    mtn: [
      "0803", "0806", "0810", "0813",
      "0814", "0816", "0903", "0906",
      "0913", "0916",
    ],
    glo: ["0805", "0807", "0811", "0815", "0905", "0915"],
    airtel: [
      "0802", "0808", "0812", "0901",
      "0902", "0907",
    ],
    etisalat: ["0809", "0817", "0818", "0908", "0909"],
  };

  for (const [network, prefixes] of Object.entries(prefixMap)) {
    if (prefixes.some((p) => normalized.startsWith(p))) {
      return network;
    }
  }

  return null; // Unknown network
}