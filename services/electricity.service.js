import axios from "axios";
import config from "../config/env.js";
import { generateReference } from "../utils/generateReference.js";
import { debitWallet, creditWallet } from "./wallet.service.js";
import { createTransaction, updateTransactionStatus } from "./transaction.service.js";
import { getClient, withTransaction } from "../database/db.js";
import { TRANSACTION_TYPES, TRANSACTION_STATUS } from "../config/constants.js";
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


// ✅ 1. Validate Meter
export async function validateMeter(serviceID, meter_number, meter_type) {
  try {
    const response = await vtpassApi.post("/merchant-verify", {
      billersCode: meter_number,
      serviceID,
      type: meter_type,
    });

    return response.data;
  } catch (error) {
    throw new Error("Unable to validate meter.");
  }
}


// ✅ 2. Purchase Electricity
export async function buyElectricityService(userId, data) {
  const { service_id, meter_number, meter_type, amount } = data;

  const reference = generateReference("ELEC");

  const client = await getClient();

  try {
    await client.query("BEGIN");

    const walletResult = await debitWallet(userId, amount, client);

    await createTransaction({
      user_id: userId,
      reference,
      type: TRANSACTION_TYPES.ELECTRICITY_PURCHASE,
      amount,
      fee: 0,
      total_amount: amount,
      balance_before: walletResult.balance_before,
      balance_after: walletResult.balance_after,
      status: TRANSACTION_STATUS.PROCESSING,
      provider: "vtpass",
      metadata: { service_id, meter_number, meter_type },
      description: `Electricity purchase for meter ${meter_number}`,
    }, client);

    await client.query("COMMIT");

    // Call VTpass
    const response = await vtpassApi.post("/pay", {
      request_id: reference,
      serviceID: service_id,
      billersCode: meter_number,
      variation_code: meter_type,
      amount,
      phone: "08000000000" // required dummy field
    });

    const code = response.data?.code;

    if (code === "000") {

      const token = response.data?.content?.transactions?.token;
      const units = response.data?.content?.transactions?.units;

      await updateTransactionStatus(
        reference,
        TRANSACTION_STATUS.SUCCESS,
        response.data?.content?.transactions?.transactionId
      );

      return {
        success: true,
        message: "Electricity purchase successful.",
        data: {
          reference,
          meter_number,
          amount,
          token,
          units,
          balance: walletResult.balance_after
        }
      };
    }

    // Failed → refund
    await reverseElectricity(userId, reference, amount);

    throw new Error(
      response.data?.response_description || "Electricity purchase failed."
    );

  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  } finally {
    client.release();
  }
}


async function reverseElectricity(userId, reference, amount) {
  await withTransaction(async (client) => {

    const walletResult = await creditWallet(userId, amount, client);

    await updateTransactionStatus(reference, TRANSACTION_STATUS.FAILED, null, client);

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
      description: `Reversal for failed electricity ${reference}`
    }, client);

  });
}