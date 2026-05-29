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


// ✅ 1. Verify Smart Card
export async function verifySmartCard(provider, smart_card_number) {
  try {
    const response = await vtpassApi.post("/merchant-verify", {
      billersCode: smart_card_number,
      serviceID: provider,
    });

    const data = response.data;

    if (!data?.content?.Customer_Name) {
      throw new Error("Smart card not found or invalid.");
    }

    return {
      customer_name: data.content.Customer_Name,
      smart_card_number,
      provider,
      due_date: data.content.Due_Date || null,
      current_package: data.content.Current_Bouquet || null,
    };
  } catch (error) {
    if (error.message === "Smart card not found or invalid.") throw error;
    throw new Error("Unable to verify smart card. Try again.");
  }
}


// ✅ 2. Get Cable Packages
export async function getCablePackages(provider) {
  try {
    const response = await vtpassApi.get(
      `/service-variations?serviceID=${provider}`
    );

    const variations = response.data?.content?.varations || [];

    return variations.map((pkg) => ({
      code: pkg.variation_code,
      name: pkg.name,
      amount: parseFloat(pkg.variation_amount),
    }));
  } catch (error) {
    throw new Error("Unable to fetch cable packages.");
  }
}


// ✅ 3. Buy Cable Subscription
export async function buyCableService(userId, data) {
  const { provider, smart_card_number, package_code, amount } = data;

  const reference = generateReference("CABLE");
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // Debit wallet
    const walletResult = await debitWallet(userId, amount, client);

    // Create transaction
    const transaction = await createTransaction({
      user_id: userId,
      reference,
      type: TRANSACTION_TYPES.CABLE_PURCHASE,
      amount,
      fee: 0,
      total_amount: amount,
      balance_before: walletResult.balance_before,
      balance_after: walletResult.balance_after,
      status: TRANSACTION_STATUS.PROCESSING,
      provider: "vtpass",
      metadata: {
        provider,
        smart_card_number,
        package_code,
      },
      description: `${provider.toUpperCase()} subscription for ${smart_card_number}`,
    }, client);

    await client.query("COMMIT");

    // Call VTpass
    let vtpassResponse;
    try {
      vtpassResponse = await vtpassApi.post("/pay", {
        request_id: reference,
        serviceID: provider,
        billersCode: smart_card_number,
        variation_code: package_code,
        amount,
        phone: "08000000000",
        subscription_type: "change",
      });
    } catch (apiError) {
      await reverseCable(userId, reference, amount);
      throw new Error("Cable subscription failed. Wallet refunded.");
    }

    const code = vtpassResponse.data?.code;

    if (code === "000") {
      const txContent = vtpassResponse.data?.content?.transactions;

      await updateTransactionStatus(
        reference,
        TRANSACTION_STATUS.SUCCESS,
        txContent?.transactionId
      );

      // Store subscription record
      await query(
        `INSERT INTO cable_subscriptions
          (user_id, transaction_id, provider, smart_card_number,
           package_name, package_code, customer_name, amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          transaction.id,
          provider,
          smart_card_number,
          txContent?.product_name || package_code,
          package_code,
          txContent?.customerName || null,
          amount,
        ]
      );

      // Process agent commission
      await processCommission(
        userId,
        transaction.id,
        TRANSACTION_TYPES.CABLE_PURCHASE,
        amount
      );

      return {
        success: true,
        message: "Cable subscription successful.",
        data: {
          reference,
          provider: provider.toUpperCase(),
          smart_card_number,
          package: txContent?.product_name || package_code,
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
        message: "Cable subscription is being processed.",
        data: {
          reference,
          status: "pending",
          balance: walletResult.balance_after,
        },
      };
    }

    await reverseCable(userId, reference, amount);
    throw new Error(
      vtpassResponse.data?.response_description ||
      "Cable subscription failed. Wallet refunded."
    );

  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  } finally {
    client.release();
  }
}


// ✅ Reverse cable transaction
async function reverseCable(userId, reference, amount) {
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
      description: `Reversal for failed cable subscription ${reference}`,
    }, client);
  });
}


// ✅ Get cable subscription history
export async function getCableHistory(userId, options = {}) {
  const result = await query(
    `SELECT cs.*, t.status, t.reference
     FROM cable_subscriptions cs
     JOIN transactions t ON t.id = cs.transaction_id
     WHERE cs.user_id = $1
     ORDER BY cs.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, options.limit || 20, ((options.page || 1) - 1) * (options.limit || 20)]
  );

  return result.rows;
}