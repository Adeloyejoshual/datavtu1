import { query, withTransaction } from "../database/db.js";
import { verifyVtpassTransaction } from "../services/vtpass.service.js";
import { requeryAirtimeTransaction } from "../services/airtime.service.js";
import { creditWallet } from "../services/wallet.service.js";
import { createTransaction } from "../services/transaction.service.js";
import { generateReference } from "../utils/generateReference.js";
import { TRANSACTION_STATUS, TRANSACTION_TYPES } from "../config/constants.js";
import logger from "../utils/logger.js";

export async function verifyPendingTransactions() {
  logger.info("Running pending transaction verification job...");

  try {
    // Fetch all pending VTpass transactions (data + airtime)
    const pendingTx = await query(
      `SELECT * FROM transactions
       WHERE status IN ($1, $2)
       AND provider = 'vtpass'
       AND type IN ($3, $4)
       AND created_at < NOW() - INTERVAL '2 minutes'
       AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at ASC
       LIMIT 30`,
      [
        TRANSACTION_STATUS.PENDING,
        TRANSACTION_STATUS.PROCESSING,
        TRANSACTION_TYPES.DATA_PURCHASE,
        TRANSACTION_TYPES.AIRTIME_PURCHASE,
      ]
    );

    if (pendingTx.rows.length === 0) {
      logger.info("No pending transactions found.");
      return;
    }

    logger.info(`Found ${pendingTx.rows.length} pending transaction(s) to verify.`);

    for (const tx of pendingTx.rows) {
      try {
        await verifyAndUpdateTransaction(tx);
      } catch (err) {
        logger.error("Error processing transaction in job", {
          reference: tx.reference,
          type: tx.type,
          error: err.message,
        });
      }

      // Rate limit between API calls
      await sleep(2000);
    }
  } catch (error) {
    logger.error("Verify pending transactions job crashed", {
      error: error.message,
    });
  }
}

async function verifyAndUpdateTransaction(tx) {
  const { reference, type, user_id, amount, balance_before } = tx;

  logger.info("Verifying transaction", { reference, type });

  let result;

  // Use appropriate requery based on type
  if (type === TRANSACTION_TYPES.AIRTIME_PURCHASE) {
    result = await requeryAirtimeTransaction(reference);
  } else {
    result = await verifyVtpassTransaction(reference);
  }

  const code = result?.code;
  const transactionId = result?.content?.transactions?.transactionId;

  // Success
  if (code === "000") {
    await query(
      `UPDATE transactions SET
        status = $1,
        provider_reference = $2,
        updated_at = NOW()
      WHERE reference = $3`,
      [TRANSACTION_STATUS.SUCCESS, transactionId || null, reference]
    );

    logger.info("Transaction verified as SUCCESS", { reference });
    return;
  }

  // Still pending
  if (code === "099") {
    logger.info("Transaction still pending", { reference });
    return;
  }

  // Failed — auto-refund user
  if (code && code !== "099") {
    logger.warn("Transaction verified as FAILED — initiating refund", {
      reference,
      type,
      amount,
    });

    await withTransaction(async (client) => {
      // Mark transaction failed
      await client.query(
        "UPDATE transactions SET status = $1, updated_at = NOW() WHERE reference = $2",
        [TRANSACTION_STATUS.FAILED, reference]
      );

      // Credit wallet back
      const refundedWallet = await creditWallet(user_id, parseFloat(amount), client);

      // Create reversal record
      const reversalRef = generateReference("REV");

      await createTransaction(
        {
          user_id,
          reference: reversalRef,
          type: TRANSACTION_TYPES.REVERSAL,
          amount: parseFloat(amount),
          fee: 0,
          total_amount: parseFloat(amount),
          balance_before: refundedWallet.balance_before,
          balance_after: refundedWallet.balance_after,
          status: TRANSACTION_STATUS.SUCCESS,
          provider: "system",
          metadata: {
            original_reference: reference,
            original_type: type,
            reason: "Auto-refund: transaction failed on provider",
          },
          description: `Auto-refund for failed ${type.replace("_", " ")} ${reference}`,
        },
        client
      );
    });

    logger.info("Auto-refund complete", { reference, amount, user_id });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function startTransactionVerificationJob(intervalMs = 300000) {
  logger.info("Transaction verification job started", { intervalMs });
  setInterval(verifyPendingTransactions, intervalMs);
}