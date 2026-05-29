// services/data.service.js

import axios from "axios";
import config from "../config/env.js";

import { query, withTransaction, getClient } from "../database/db.js";

import { generateReference } from "../utils/generateReference.js";

import logger from "../utils/logger.js";

import {
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  VTPASS_SERVICE_IDS,
} from "../config/constants.js";

import {
  debitWallet,
  creditWallet,
} from "./wallet.service.js";

import {
  createTransaction,
  updateTransactionStatus,
  checkIdempotency,
} from "./transaction.service.js";

import { payFirstPurchaseBonus } from "./referral.service.js";

/* -------------------------------------------------------------------------- */
/*                              VTPASS AXIOS                                  */
/* -------------------------------------------------------------------------- */

const vtpassApi = axios.create({
  baseURL: config.vtpass.baseUrl,

  headers: {
    "api-key": config.vtpass.apiKey,
    "secret-key": config.vtpass.secretKey,
    "Content-Type": "application/json",
  },

  timeout: 30000,
});

/* -------------------------------------------------------------------------- */
/*                             BUY DATA SERVICE                               */
/* -------------------------------------------------------------------------- */

export async function buyDataService(userId, data) {
  const {
    network,
    phone,
    plan_code,
    amount,
    idempotency_key,
  } = data;

  /* -------------------------- CHECK IDEMPOTENCY -------------------------- */

  if (idempotency_key) {
    const existingTransaction =
      await checkIdempotency(idempotency_key);

    if (existingTransaction) {
      logger.warn("Duplicate transaction blocked", {
        userId,
        idempotency_key,
      });

      return {
        success: true,
        message: "Transaction already processed.",
        data: existingTransaction,
      };
    }
  }

  /* --------------------------- SERVICE MAPPING --------------------------- */

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

  /* -------------------------- GENERATE REF ------------------------------- */

  const reference = generateReference("DATA");

  /* ------------------------- DB TRANSACTION ------------------------------ */

  const client = await getClient();

  try {
    await client.query("BEGIN");

    /* ---------------------------- DEBIT USER ----------------------------- */

    const walletResult = await debitWallet(
      userId,
      amount,
      client
    );

    /* ---------------------- CREATE TRANSACTION --------------------------- */

    const transaction = await createTransaction(
      {
        user_id: userId,

        reference,

        type: TRANSACTION_TYPES.DATA_PURCHASE,

        amount,

        fee: 0,

        total_amount: amount,

        balance_before:
          walletResult.balance_before,

        balance_after:
          walletResult.balance_after,

        status: TRANSACTION_STATUS.PROCESSING,

        provider: "vtpass",

        metadata: {
          network,
          phone,
          plan_code,
          serviceID,
        },

        description: `${network.toUpperCase()} data purchase for ${phone}`,

        idempotency_key:
          idempotency_key || null,
      },

      client
    );

    await client.query("COMMIT");

    /* -------------------------- CALL VTPASS ------------------------------ */

    let vtpassResponse;

    try {
      vtpassResponse = await vtpassApi.post(
        "/pay",
        {
          request_id: reference,

          serviceID,

          billersCode: phone,

          variation_code: plan_code,

          amount,

          phone,
        }
      );

      logger.info("VTpass API success", {
        reference,
        response: vtpassResponse.data,
      });
    } catch (apiError) {
      logger.error("VTpass API failed", {
        reference,
        error: apiError.message,
      });

      /* ---------------------- REVERSE TRANSACTION ----------------------- */

      await reverseTransaction({
        userId,
        reference,
        amount,
        walletResult,
      });

      throw new Error(
        "Data purchase failed. Wallet refunded."
      );
    }

    /* -------------------------- PROCESS RESPONSE ------------------------- */

    const vtpassCode =
      vtpassResponse.data?.code;

    /* ----------------------------- SUCCESS ------------------------------- */

    if (vtpassCode === "000") {
      await updateTransactionStatus(
        reference,
        TRANSACTION_STATUS.SUCCESS,
        vtpassResponse.data?.content
          ?.transactions?.transactionId
      );

      /* ---------------- FIRST PURCHASE REFERRAL BONUS ---------------- */

      triggerFirstPurchaseBonus(
        userId,
        transaction.id
      );

      return {
        success: true,

        message:
          "Data purchase successful.",

        data: {
          reference,

          network:
            network.toUpperCase(),

          phone,

          amount,

          balance:
            walletResult.balance_after,

          status: "success",
        },
      };
    }

    /* ------------------------------ PENDING ------------------------------ */

    if (vtpassCode === "099") {
      await updateTransactionStatus(
        reference,
        TRANSACTION_STATUS.PENDING
      );

      return {
        success: true,

        message:
          "Data purchase is being processed.",

        data: {
          reference,

          status: "pending",

          balance:
            walletResult.balance_after,
        },
      };
    }

    /* ------------------------------ FAILED ------------------------------- */

    await reverseTransaction({
      userId,
      reference,
      amount,
      walletResult,
    });

    throw new Error(
      vtpassResponse.data
        ?.response_description ||
        "Data purchase failed. Wallet refunded."
    );
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}

    logger.error("Buy data failed", {
      userId,
      error: error.message,
    });

    throw error;
  } finally {
    client.release();
  }
}

/* -------------------------------------------------------------------------- */
/*                         FIRST PURCHASE BONUS                               */
/* -------------------------------------------------------------------------- */

async function triggerFirstPurchaseBonus(
  userId,
  transactionId
) {
  try {
    const purchaseCount = await query(
      `
        SELECT COUNT(*) AS total
        FROM transactions
        WHERE user_id = $1
          AND type IN (
            'data_purchase',
            'airtime_purchase',
            'cable_purchase',
            'electricity_purchase',
            'betting_purchase'
          )
          AND status = 'success'
      `,
      [userId]
    );

    const totalPurchases = parseInt(
      purchaseCount.rows[0].total
    );

    // First successful purchase
    if (totalPurchases === 1) {
      await payFirstPurchaseBonus(
        userId,
        transactionId
      );

      logger.info(
        "First purchase bonus paid",
        {
          userId,
          transactionId,
        }
      );
    }
  } catch (error) {
    logger.error(
      "First purchase bonus failed",
      {
        userId,
        transactionId,
        error: error.message,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                         REVERSE FAILED TRANSACTION                         */
/* -------------------------------------------------------------------------- */

async function reverseTransaction({
  userId,
  reference,
  amount,
  walletResult,
}) {
  try {
    await withTransaction(
      async (client) => {
        /* ------------------------- CREDIT WALLET ------------------------ */

        await creditWallet(
          userId,
          amount,
          client
        );

        /* ---------------------- UPDATE FAILED TXN ---------------------- */

        await updateTransactionStatus(
          reference,
          TRANSACTION_STATUS.FAILED,
          null,
          client
        );

        /* ---------------------- CREATE REVERSAL TXN -------------------- */

        const reversalReference =
          generateReference("REV");

        await createTransaction(
          {
            user_id: userId,

            reference:
              reversalReference,

            type:
              TRANSACTION_TYPES.REVERSAL,

            amount,

            fee: 0,

            total_amount: amount,

            balance_before:
              walletResult.balance_after,

            balance_after:
              walletResult.balance_before,

            status:
              TRANSACTION_STATUS.SUCCESS,

            metadata: {
              original_reference:
                reference,

              reason:
                "VTpass API failure",
            },

            description: `Reversal for failed transaction ${reference}`,
          },

          client
        );
      }
    );

    logger.info(
      "Transaction reversed successfully",
      {
        reference,
        amount,
        userId,
      }
    );
  } catch (error) {
    logger.error(
      "CRITICAL: Reversal failed",
      {
        reference,
        amount,
        userId,
        error: error.message,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                            GET DATA PLANS                                  */
/* -------------------------------------------------------------------------- */

export async function getDataPlans(
  serviceID
) {
  try {
    const response = await vtpassApi.get(
      `/service-variations?serviceID=${serviceID}`
    );

    if (
      response.data?.content?.varations
    ) {
      return response.data.content.varations.map(
        (plan) => ({
          code:
            plan.variation_code,

          name: plan.name,

          amount: parseFloat(
            plan.variation_amount
          ),

          validity:
            plan.fixedPrice || "N/A",
        })
      );
    }

    return [];
  } catch (error) {
    logger.error(
      "Failed to fetch data plans",
      {
        serviceID,
        error: error.message,
      }
    );

    throw new Error(
      "Unable to fetch data plans."
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                         VERIFY VTPASS TRANSACTION                          */
/* -------------------------------------------------------------------------- */

export async function verifyVtpassTransaction(
  reference
) {
  try {
    const response =
      await vtpassApi.post(
        "/requery",
        {
          request_id: reference,
        }
      );

    return response.data;
  } catch (error) {
    logger.error(
      "VTpass verification failed",
      {
        reference,
        error: error.message,
      }
    );

    throw new Error(
      "Unable to verify transaction."
    );
  }
}