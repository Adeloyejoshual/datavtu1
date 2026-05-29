import { query } from "../database/db.js";
import { verifyVtpassTransaction } from "../services/vtpass.service.js";
import { TRANSACTION_STATUS } from "../config/constants.js";
import logger from "../utils/logger.js";

// Run every 5 minutes to check pending transactions
export async function verifyPendingTransactions() {
  try {
    // Get pending transactions older than 2 minutes
    const pendingTx = await query(
      `SELECT * FROM transactions
       WHERE status IN ($1, $2)
       AND provider = 'vtpass'
       AND created_at < NOW() - INTERVAL '2 minutes'
       AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at ASC
       LIMIT 20`,
      [TRANSACTION_STATUS.PENDING, TRANSACTION_STATUS.PROCESSING]
    );

    for (const tx of pendingTx.rows) {
      try {
        const result = await verifyVtpassTransaction(tx.reference);

        if (result?.code === "000") {
          await query(
            "UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2",
            [TRANSACTION_STATUS.SUCCESS, tx.id]
          );
          logger.info("Pending transaction verified as success", { reference: tx.reference });
        } else if (result?.code && result.code !== "099") {
          // Failed - need to refund
          await query(
            "UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2",
            [TRANSACTION_STATUS.FAILED, tx.id]
          );
          logger.warn("Pending transaction verified as failed", { reference: tx.reference });
          // TODO: Auto-refund logic
        }
      } catch (err) {
        logger.error("Error verifying transaction", {
          reference: tx.reference,
          error: err.message,
        });
      }

      // Rate limiting between API calls
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (error) {
    logger.error("Verify pending transactions job failed", { error: error.message });
  }
}

// Simple interval-based scheduler
export function startTransactionVerificationJob(intervalMs = 300000) {
  logger.info("Transaction verification job started", {
    intervalMs,
  });

  setInterval(verifyPendingTransactions, intervalMs);
}