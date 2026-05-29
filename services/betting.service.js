import axios from "axios";
import config from "../config/env.js";
import { generateReference } from "../utils/generateReference.js";
import { debitWallet, creditWallet } from "./wallet.service.js";
import { createTransaction, updateTransactionStatus } from "./transaction.service.js";
import { getClient, withTransaction, query } from "../database/db.js";
import { TRANSACTION_TYPES, TRANSACTION_STATUS } from "../config/constants.js";
import { processCommission } from "./commission.service.js";
import logger from "../utils/logger.js";

const vtpassApi = axios.create({
  baseURL: config.vtpass.baseUrl,
  headers: {
    "api-key": config.vtpass.apiKey,
    "secret-key": config.vtpass.secretKey,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});


// ✅ 1. Verify Betting Customer ID
export async function verifyBettingCustomer(platform, customer_id) {
  try {
    const response = await vtpassApi.post("/merchant-verify", {
      billersCode: customer_id,
      serviceID: platform,
    });

    const data = response.data;

    if (!data?.content?.Customer_Name) {
      throw new Error("Betting account not found.");
    }

    return {
      customer_name: data.content.Customer_Name,
      customer_id,
      platform,
    };
  } catch (error) {
    if (error.message === "Betting account not found.") throw error;
    throw new Error("Unable to verify betting account.");
  }
}


// ✅ 2. Fund Betting Account
export async function fundBettingService(userId, data) {
  const { platform, customer_id, amount } = data;

  const reference = generateReference("BET");
  const client = await getClient();

  try {
    await client.query("BEGIN");

    const walletResult = await debitWallet(userId, amount, client);

    const transaction = await createTransaction({
      user_id: userId,
      reference,
      type: TRANSACTION_TYPES.BETTING_PURCHASE,
      amount,
      fee: 0,
      total_amount: amount,
      balance_before: walletResult.balance_before,
      balance_after: walletResult.balance_after,
      status: TRANSACTION_STATUS.PROCESSING,
      provider: "vtpass",
      metadata: { platform, customer_id },
      description: `${platform.toUpperCase()} wallet funding for ${customer_id}`,
    }, client);

    await client.query("COMMIT");

    let vtpassResponse;
    try {
      vtpassResponse = await vtpassApi.post("/pay", {
        request_id: reference,
        serviceID: platform,
        billersCode: customer_id,
        variation_code: "default",
        amount,
        phone: "08000000000",
      });
    } catch (apiError) {
      await reverseBetting(userId, reference, amount);
      throw new Error("Betting fund failed. Wallet refunded.");
    }

    const code = vtpassResponse.data?.code;

    if (code === "000") {
      const txContent = vtpassResponse.data?.content?.transactions;

      await updateTransactionStatus(
        reference,
        TRANSACTION_STATUS.SUCCESS,
        txContent?.transactionId
      );

      // Store betting log
      await query(
        `INSERT INTO betting_fund_logs
          (user_id, transaction_id, platform, customer_id, amount, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, transaction.id, platform, customer_id, amount, "success"]
      );

      // Process agent commission
      await processCommission(
        userId,
        transaction.id,
        TRANSACTION_TYPES.BETTING_PURCHASE,
        amount
      );

      return {
        success: true,
        message: "Betting account funded successfully.",
        data: {
          reference,
          platform: platform.toUpperCase(),
          customer_id,
          amount,
          balance: walletResult.balance_after,
          status: "success",
        },
      };
    }

    if (code === "099") {
      await updateTransactionStatus(reference, TRANSACTION_STATUS.PENDING);
      return {
        success: true,
        message: "Betting fund is being processed.",
        data: {
          reference,
          status: "pending",
          balance: walletResult.balance_after,
        },
      };
    }

    await reverseBetting(userId, reference, amount);
    throw new Error(
      vtpassResponse.data?.response_description ||
      "Betting fund failed. Wallet refunded."
    );

  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  } finally {
    client.release();
  }
}


// ✅ Reverse betting transaction
async function reverseBetting(userId, reference, amount) {
  await withTransaction(async (client) => {
    const walletResult = await creditWallet(userId, amount, client);

    await updateTransactionStatus(
      reference,
      TRANSACTION_STATUS.FAILED,
      null,
      client
    );

    await createTransaction({
      user_id: userId,
      reference: generateReference("REV"),
      type: TRANSACTION_TYPES.REVERSAL,
      amount,
      fee: 0,
      total_amount: amount,
      balance_before: walletResult.balance_before,
      balance_after: walletResult.balance_after,
      status: TRANSACTION_STATUS.SUCCESS,
      metadata: { original_reference: reference },
      description: `Reversal for failed betting fund ${reference}`,
    }, client);
  });
}


// ✅ Get betting history
export async function getBettingHistory(userId, options = {}) {
  const result = await query(
    `SELECT bl.*, t.reference, t.status
     FROM betting_fund_logs bl
     JOIN transactions t ON t.id = bl.transaction_id
     WHERE bl.user_id = $1
     ORDER BY bl.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, options.limit || 20, ((options.page || 1) - 1) * (options.limit || 20)]
  );

  return result.rows;
}