import { query, withTransaction } from "../database/db.js";
import { creditWallet } from "./wallet.service.js";
import { createTransaction } from "./transaction.service.js";
import { generateReference } from "../utils/generateReference.js";
import {
  COMMISSION_RATES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
} from "../config/constants.js";
import logger from "../utils/logger.js";


// ✅ Process commission for agent
export async function processCommission(
  userId,
  transactionId,
  transactionType,
  transactionAmount
) {
  try {
    // Check if user was referred by an agent
    const userResult = await query(
      `SELECT u.referred_by, r.role as referrer_role, r.id as referrer_id
       FROM users u
       LEFT JOIN users r ON r.id = u.referred_by
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) return;

    const { referred_by, referrer_role, referrer_id } = userResult.rows[0];

    // Only pay commission if referred by an agent or admin
    if (!referred_by || referrer_role === "user") return;

    const rate = COMMISSION_RATES[transactionType] || 0;
    if (rate === 0) return;

    const commissionAmount = parseFloat(
      (transactionAmount * rate).toFixed(2)
    );

    if (commissionAmount < 1) return; // Skip tiny commissions

    await withTransaction(async (client) => {
      // Credit agent wallet
      const walletResult = await creditWallet(
        referrer_id,
        commissionAmount,
        client
      );

      // Record commission
      await client.query(
        `INSERT INTO agent_commissions
          (agent_id, transaction_id, transaction_type, transaction_amount,
           commission_rate, commission_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          referrer_id,
          transactionId,
          transactionType,
          transactionAmount,
          rate,
          commissionAmount,
          "paid",
        ]
      );

      // Create commission transaction
      const commissionRef = generateReference("COM");

      await createTransaction({
        user_id: referrer_id,
        reference: commissionRef,
        type: TRANSACTION_TYPES.COMMISSION,
        amount: commissionAmount,
        fee: 0,
        total_amount: commissionAmount,
        balance_before: walletResult.balance_before,
        balance_after: walletResult.balance_after,
        status: TRANSACTION_STATUS.SUCCESS,
        metadata: {
          source_user_id: userId,
          source_transaction_id: transactionId,
          transaction_type: transactionType,
          rate,
        },
        description: `Commission earned from ${transactionType.replace("_", " ")}`,
      }, client);
    });

    logger.info("Commission paid to agent", {
      agentId: referrer_id,
      userId,
      transactionType,
      commissionAmount,
    });

  } catch (error) {
    // Non-blocking — commission failure should not affect main transaction
    logger.error("Commission processing failed", {
      userId,
      transactionId,
      error: error.message,
    });
  }
}


// ✅ Get agent commission summary
export async function getAgentCommissionSummary(agentId) {
  const result = await query(
    `SELECT
      COUNT(*) as total_transactions,
      COALESCE(SUM(commission_amount), 0) as total_earned,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount END), 0) as total_paid,
      COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '30 days'
        THEN commission_amount END), 0) as this_month,
      transaction_type,
      COUNT(*) as count
    FROM agent_commissions
    WHERE agent_id = $1
    GROUP BY transaction_type`,
    [agentId]
  );

  const totals = await query(
    `SELECT
      COALESCE(SUM(commission_amount), 0) as total_earned,
      COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '30 days'
        THEN commission_amount END), 0) as this_month,
      COUNT(DISTINCT source_user_id::text) as total_customers
    FROM agent_commissions ac
    LEFT JOIN transactions t ON t.id = ac.transaction_id
    WHERE ac.agent_id = $1`,
    [agentId]
  );

  return {
    by_type: result.rows,
    totals: totals.rows[0],
  };
}


// ✅ Get agent commission history
export async function getAgentCommissionHistory(agentId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT ac.*, u.email as customer_email, u.first_name, u.last_name
     FROM agent_commissions ac
     JOIN transactions t ON t.id = ac.transaction_id
     JOIN users u ON u.id = t.user_id
     WHERE ac.agent_id = $1
     ORDER BY ac.created_at DESC
     LIMIT $2 OFFSET $3`,
    [agentId, limit, offset]
  );

  return result.rows;
}