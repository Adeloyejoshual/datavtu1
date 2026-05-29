// services/airtime.service.js

import axios from "axios";

import config from "../config/env.js";

import {
  getClient,
  withTransaction,
  query,
} from "../database/db.js";

import {
  createTransaction,
  updateTransactionStatus,
  checkIdempotency,
} from "./transaction.service.js";

import {
  debitWallet,
  creditWallet,
} from "./wallet.service.js";

import { payFirstPurchaseBonus } from "./referral.service.js";

import {
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  VTPASS_SERVICE_IDS,
} from "../config/constants.js";

import { generateReference } from "../utils/generateReference.js";

import logger from "../utils/logger.js";

/* -------------------------------------------------------------------------- */
/*                               VTPASS CLIENT                                */
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
/*                           AIRTIME SERVICE MAP                              */
/* -------------------------------------------------------------------------- */

const AIRTIME_SERVICE_MAP = {
  mtn: VTPASS_SERVICE_IDS.MTN_AIRTIME,
  glo: VTPASS_SERVICE_IDS.GLO_AIRTIME,
  airtel: VTPASS_SERVICE_IDS.AIRTEL_AIRTIME,
  etisalat: VTPASS_SERVICE_IDS.ETISALAT_AIRTIME,
};

/* -------------------------------------------------------------------------- */
/*                              BUY AIRTIME                                   */
/* -------------------------------------------------------------------------- */

export async function buyAirtimeService(
  userId,
  data
) {
  const {
    network,
    phone,
    amount,
    idempotency_key,
  } = data;

  /* -------------------------- IDEMPOTENCY CHECK ------------------------- */

  if (idempotency_key) {
    const existingTransaction =
      await checkIdempotency(
        idempotency_key
      );

    if (existingTransaction) {
      logger.warn(
        "Duplicate airtime transaction detected",
        {
          userId,
          idempotency_key,
        }
      );

      return {
        success: true,

        message:
          "Transaction already processed.",

        data: existingTransaction,
      };
    }
  }

  /* --------------------------- VALIDATE NETWORK ------------------------- */

  const serviceID =
    AIRTIME_SERVICE_MAP[
      network?.toLowerCase()
    ];

  if (!serviceID) {
    throw new Error(
      "Invalid network selected."
    );
  }

  /* -------------------------- NORMALIZE PHONE --------------------------- */

  const normalizedPhone =
    normalizePhone(phone);

  /* -------------------------- GENERATE REF ------------------------------ */

  const reference =
    generateReference("AIR");

  /* --------------------------- DB TRANSACTION --------------------------- */

  const client = await getClient();

  try {
    await client.query("BEGIN");

    /* ---------------------------- DEBIT WALLET -------------------------- */

    const walletResult =
      await debitWallet(
        userId,
        amount,
        client
      );

    /* ---------------------- CREATE TRANSACTION -------------------------- */

    const transaction =
      await createTransaction(
        {
          user_id: userId,

          reference,

          type:
            TRANSACTION_TYPES.AIRTIME_PURCHASE,

          amount,

          fee: 0,

          total_amount: amount,

          balance_before:
            walletResult.balance_before,

          balance_after:
            walletResult.balance_after,

          status:
            TRANSACTION_STATUS.PROCESSING,

          provider: "vtpass",

          metadata: {
            network,
            phone: normalizedPhone,
            original_phone: phone,
            serviceID,
          },

          description: `${network.toUpperCase()} airtime recharge for ${normalizedPhone}`,

          idempotency_key:
            idempotency_key || null,
        },

        client
      );

    await client.query("COMMIT");

    /* ---------------------------- CALL VTPASS --------------------------- */

    let vtpassResponse;

    try {
      vtpassResponse =
        await vtpassApi.post(
          "/pay",
          {
            request_id: reference,

            serviceID,

            amount,

            phone:
              normalizedPhone,
          }
        );

      logger.info(
        "VTpass airtime API response",
        {
          reference,
          network,
          amount,
          response:
            vtpassResponse.data,
        }
      );
    } catch (apiError) {
      logger.error(
        "VTpass airtime API failed",
        {
          reference,
          error:
            apiError.message,
        }
      );

      /* ---------------------- REVERSE TRANSACTION ---------------------- */

      await reverseAirtimeTransaction(
        {
          userId,
          reference,
          amount,
          walletResult,
        }
      );

      throw new Error(
        "Airtime purchase failed. Wallet refunded."
      );
    }

    /* ------------------------- HANDLE RESPONSE -------------------------- */

    const vtpassCode =
      vtpassResponse.data?.code;

    const providerTransactionId =
      vtpassResponse.data?.content
        ?.transactions
        ?.transactionId || null;

    /* ----------------------------- SUCCESS ------------------------------ */

    if (vtpassCode === "000") {
      await updateTransactionStatus(
        reference,
        TRANSACTION_STATUS.SUCCESS,
        providerTransactionId
      );

      /* ---------------- FIRST PURCHASE BONUS ---------------- */

      triggerFirstPurchaseBonus(
        userId,
        transaction.id
      );

      logger.info(
        "Airtime purchase successful",
        {
          userId,
          reference,
          amount,
          network,
        }
      );

      return {
        success: true,

        message:
          "Airtime purchase successful.",

        data: {
          reference,

          network:
            network.toUpperCase(),

          phone:
            normalizedPhone,

          amount,

          balance:
            walletResult.balance_after,

          status: "success",

          provider_reference:
            providerTransactionId,
        },
      };
    }

    /* ------------------------------ PENDING ----------------------------- */

    if (vtpassCode === "099") {
      await updateTransactionStatus(
        reference,
        TRANSACTION_STATUS.PENDING
      );

      logger.warn(
        "Airtime transaction pending",
        {
          reference,
          userId,
        }
      );

      return {
        success: true,

        message:
          "Airtime purchase is being processed.",

        data: {
          reference,

          network:
            network.toUpperCase(),

          phone:
            normalizedPhone,

          amount,

          balance:
            walletResult.balance_after,

          status: "pending",
        },
      };
    }

    /* ------------------------------- FAILED ----------------------------- */

    const failureMessage =
      vtpassResponse.data
        ?.response_description ||
      "Airtime purchase failed.";

    logger.error(
      "VTpass airtime failed",
      {
        reference,
        failureMessage,
      }
    );

    await reverseAirtimeTransaction({
      userId,
      reference,
      amount,
      walletResult,
    });

    throw new Error(
      `${failureMessage} Wallet refunded.`
    );
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}

    logger.error(
      "Buy airtime service failed",
      {
        userId,
        error: error.message,
      }
    );

    throw error;
  } finally {
    client.release();
  }
}

/* -------------------------------------------------------------------------- */
/*                       FIRST PURCHASE REFERRAL BONUS                        */
/* -------------------------------------------------------------------------- */

async function triggerFirstPurchaseBonus(
  userId,
  transactionId
) {
  try {
    const purchaseCount =
      await query(
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

    const totalPurchases =
      parseInt(
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
/*                        REVERSE FAILED TRANSACTION                          */
/* -------------------------------------------------------------------------- */

async function reverseAirtimeTransaction({
  userId,
  reference,
  amount,
  walletResult,
}) {
  try {
    await withTransaction(
      async (client) => {
        /* ---------------------- CREDIT WALLET -------------------------- */

        await creditWallet(
          userId,
          amount,
          client
        );

        /* ---------------- UPDATE ORIGINAL TXN ------------------------- */

        await updateTransactionStatus(
          reference,
          TRANSACTION_STATUS.FAILED,
          null,
          client
        );

        /* ---------------- CREATE REVERSAL RECORD ---------------------- */

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
                "Airtime purchase failure",
            },

            description: `Reversal for failed airtime transaction ${reference}`,
          },

          client
        );
      }
    );

    logger.info(
      "Airtime transaction reversed",
      {
        reference,
        amount,
        userId,
      }
    );
  } catch (error) {
    logger.error(
      "CRITICAL: Airtime reversal failed",
      {
        reference,
        userId,
        amount,
        error: error.message,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                        REQUERY AIRTIME TRANSACTION                         */
/* -------------------------------------------------------------------------- */

export async function requeryAirtimeTransaction(
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
      "Airtime requery failed",
      {
        reference,
        error: error.message,
      }
    );

    throw new Error(
      "Unable to verify airtime transaction status."
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                         GET AIRTIME HISTORY                                */
/* -------------------------------------------------------------------------- */

export async function getAirtimeHistory(
  userId,
  options = {}
) {
  const {
    page = 1,
    limit = 20,
    network,
  } = options;

  const offset =
    (page - 1) * limit;

  let whereClause =
    "WHERE user_id = $1 AND type = $2";

  const params = [
    userId,
    TRANSACTION_TYPES.AIRTIME_PURCHASE,
  ];

  let paramIndex = 3;

  if (network) {
    whereClause += ` AND metadata->>'network' = $${paramIndex}`;

    params.push(
      network.toLowerCase()
    );

    paramIndex++;
  }

  const countResult =
    await query(
      `
        SELECT COUNT(*)
        FROM transactions
        ${whereClause}
      `,
      params
    );

  const dataResult =
    await query(
      `
        SELECT *
        FROM transactions
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex}
        OFFSET $${paramIndex + 1}
      `,
      [
        ...params,
        limit,
        offset,
      ]
    );

  return {
    transactions:
      dataResult.rows,

    total: parseInt(
      countResult.rows[0].count
    ),

    page,

    limit,
  };
}

/* -------------------------------------------------------------------------- */
/*                           NORMALIZE PHONE                                  */
/* -------------------------------------------------------------------------- */

function normalizePhone(phone) {
  // 08012345678 => 2348012345678
  if (phone.startsWith("0")) {
    return `234${phone.slice(1)}`;
  }

  // +2348012345678 => 2348012345678
  if (phone.startsWith("+234")) {
    return phone.slice(1);
  }

  return phone;
}

/* -------------------------------------------------------------------------- */
/*                        DETECT NETWORK FROM PHONE                           */
/* -------------------------------------------------------------------------- */

export function detectNetworkFromPhone(
  phone
) {
  const normalized =
    phone
      .replace("+234", "0")
      .replace(/^234/, "0");

  const prefixMap = {
    mtn: [
      "0803",
      "0806",
      "0810",
      "0813",
      "0814",
      "0816",
      "0903",
      "0906",
      "0913",
      "0916",
    ],

    glo: [
      "0805",
      "0807",
      "0811",
      "0815",
      "0905",
      "0915",
    ],

    airtel: [
      "0802",
      "0808",
      "0812",
      "0901",
      "0902",
      "0907",
    ],

    etisalat: [
      "0809",
      "0817",
      "0818",
      "0908",
      "0909",
    ],
  };

  for (const [
    network,
    prefixes,
  ] of Object.entries(
    prefixMap
  )) {
    if (
      prefixes.some((prefix) =>
        normalized.startsWith(
          prefix
        )
      )
    ) {
      return network;
    }
  }

  return null;
}