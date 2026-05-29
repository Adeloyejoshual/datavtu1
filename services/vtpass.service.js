import axios from "axios";
import config from "../config/env.js";
import { generateReference } from "../utils/generateReference.js";
import { debitWallet } from "./wallet.service.js";
import { createTransaction, updateTransactionStatus, checkIdempotency } from "./transaction.service.js";
import { withTransaction, getClient } from "../database/db.js";
import { TRANSACTION_TYPES, TRANSACTION_STATUS, VTPASS_SERVICE_IDS } from "../config/constants.js";
import logger from "../utils/logger.js";

// Create axios instance for VTpass
const vtpassApi = axios.create({
  baseURL: config.vtpass.baseUrl,
  headers: {
    "api-key": config.vtpass.apiKey,
    "secret-key": config.vtpass.secretKey,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Buy data service
export async function buyDataService(userId, data) {
  const { network, phone, plan_code, amount, idempotency_key } = data;

  // Check idempotency first
  if (idempotency_key) {
    const existing = await checkIdempotency(idempotency_key);
    if (existing) {
      logger.warn("Duplicate transaction detected", { idempotency_key, userId });
      return {
        success: true,
        message: "Transaction already processed.",
        data: existing,
      };
    }
  }

  const reference = generateReference("DATA");

  // Map network to VTpass service ID
  const serviceMap = {
    mtn: VTPASS_SERVICE_IDS.MTN_DATA,
    glo: VTPASS_SERVICE_IDS.GLO_DATA,
    airtel: VTPASS_SERVICE_IDS.AIRTEL_DATA,
    etisalat: VTPASS_SERVICE_IDS.ETISALAT_DATA,
  };

  const serviceID = serviceMap[network];

  if (!serviceID) {
    throw new Error("Invalid network selected.");
  }

  // Execute in database transaction
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // 1. Debit wallet
    const walletResult = await debitWallet(userId, amount, client);

    // 2. Create pending transaction
    const transaction = await createTransaction({
      user_id: userId,
      reference,
      type: TRANSACTION_TYPES.DATA_PURCHASE,
      amount,
      fee: 0,
      total_amount: amount,
      balance_before: walletResult.balance_before,
      balance_after: walletResult.balance_after,
      status: TRANSACTION_STATUS.PROCESSING,
      provider: "vtpass",
      metadata: { network, phone, plan_code, serviceID },
      description: `${network.toUpperCase()} data purchase for ${phone}`,
      idempotency_key: idempotency_key || null,
    }, client);

    await client.query("COMMIT");

    // 3. Call VTpass API (outside DB transaction)
    let vtpassResponse;
    try {
      vtpassResponse = await vtpassApi.post("/pay", {
        request_id: reference,
        serviceID,
        billersCode: phone,
        variation_code: plan_code,
        amount,
        phone,
      });

      logger.info("VTpass API response", {
        reference,
        status: vtpassResponse.data?.code,
        response: vtpassResponse.data,
      });
    } catch (apiError) {
      // VTpass API failed — reverse the wallet debit
      logger.error("VTpass API call failed", {
        reference,
        error: apiError.message,
      });

      await reverseTransaction(userId, reference, amount, walletResult);
      throw new Error("Data purchase failed. Your wallet has been refunded.");
    }

    // 4. Process VTpass response
    const vtpassCode = vtpassResponse.data?.code;

    if (vtpassCode === "000") {
      // Success
      await updateTransactionStatus(
        reference,
        TRANSACTION_STATUS.SUCCESS,
        vtpassResponse.data?.content?.transactions?.transactionId
      );

      return {
        success: true,
        message: "Data purchase successful.",
        data: {
          reference,
          network: network.toUpperCase(),
          phone,
          amount,
          balance: walletResult.balance_after,
          status: "success",
        },
      };
    } else if (vtpassCode === "099") {
      // Pending — don't reverse yet
      await updateTransactionStatus(reference, TRANSACTION_STATUS.PENDING);

      return {
        success: true,
        message: "Data purchase is being processed.",
        data: {
          reference,
          status: "pending",
          balance: walletResult.balance_after,
        },
      };
    } else {
      // Failed — reverse
      await reverseTransaction(userId, reference, amount, walletResult);
      throw new Error(
        vtpassResponse.data?.response_description || "Data purchase failed. Wallet refunded."
      );
    }
  } catch (error) {
    // If DB transaction is still open, rollback
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rbError) {
        // Rollback may fail if already committed
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

// Reverse failed transaction
async function reverseTransaction(userId, reference, amount, originalWallet) {
  try {
    await withTransaction(async (client) => {
      // Credit wallet back
      const { creditWallet } = await import("./wallet.service.js");
      await creditWallet(userId, amount, client);

      // Update original transaction to failed
      await updateTransactionStatus(reference, TRANSACTION_STATUS.FAILED, null, client);

      // Create reversal transaction record
      const reversalRef = generateReference("REV");
      await createTransaction({
        user_id: userId,
        reference: reversalRef,
        type: TRANSACTION_TYPES.REVERSAL,
        amount,
        fee: 0,
        total_amount: amount,
        balance_before: originalWallet.balance_after,
        balance_after: originalWallet.balance_before,
        status: TRANSACTION_STATUS.SUCCESS,
        metadata: { original_reference: reference, reason: "API failure" },
        description: `Reversal for failed transaction ${reference}`,
      }, client);
    });

    logger.info("Transaction reversed successfully", { reference, amount, userId });
  } catch (error) {
    logger.error("CRITICAL: Transaction reversal failed!", {
      reference,
      userId,
      amount,
      error: error.message,
    });
    // This should trigger an alert to admins
  }
}

// Get available data plans from VTpass
export async function getDataPlans(serviceID) {
  try {
    const response = await vtpassApi.get(`/service-variations?serviceID=${serviceID}`);

    if (response.data?.content?.varations) {
      return response.data.content.varations.map((plan) => ({
        code: plan.variation_code,
        name: plan.name,
        amount: parseFloat(plan.variation_amount),
        validity: plan.fixedPrice || "N/A",
      }));
    }

    return [];
  } catch (error) {
    logger.error("Failed to fetch data plans", { serviceID, error: error.message });
    throw new Error("Unable to fetch data plans. Please try again.");
  }
}

// Verify transaction status with VTpass
export async function verifyVtpassTransaction(reference) {
  try {
    const response = await vtpassApi.post("/requery", {
      request_id: reference,
    });

    return response.data;
  } catch (error) {
    logger.error("VTpass requery failed", { reference, error: error.message });
    throw new Error("Unable to verify transaction status.");
  }
}