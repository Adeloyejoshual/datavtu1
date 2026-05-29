import { query, withTransaction } from "../database/db.js";
import { creditWallet } from "./wallet.service.js";
import { createTransaction } from "./transaction.service.js";
import { generateReference } from "../utils/generateReference.js";
import {
  REFERRAL_SETTINGS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
} from "../config/constants.js";
import logger from "../utils/logger.js";


// ✅ Pay signup referral bonus
export async function paySignupBonus(referrerId, newUserId) {
  try {
    if (!referrerId) return;

    // Check if already paid
    const existing = await query(
      `SELECT id FROM referral_earnings
       WHERE referrer_id = $1 AND referee_id = $2 AND earning_type = $3`,
      [referrerId, newUserId, "signup_bonus"]
    );

    if (existing.rows.length > 0) return;

    // Check referrer lifetime cap
    const lifetimeEarnings = await query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM referral_earnings
       WHERE referrer_id = $1 AND status = 'paid'`,
      [referrerId]
    );

    const totalEarned = parseFloat(lifetimeEarnings.rows[0].total);

    if (totalEarned >= REFERRAL_SETTINGS.MAX_REFERRAL_EARNINGS) {
      logger.info("Referrer has hit lifetime earnings cap", { referrerId });
      return;
    }

    const bonus = REFERRAL_SETTINGS.SIGNUP_BONUS;

    await withTransaction(async (client) => {
      const walletResult = await creditWallet(referrerId, bonus, client);

      const ref = generateReference("REF");

      await createTransaction({
        user_id: referrerId,
        reference: ref,
        type: TRANSACTION_TYPES.REFERRAL_BONUS,
        amount: bonus,
        fee: 0,
        total_amount: bonus,
        balance_before: walletResult.balance_before,
        balance_after: walletResult.balance_after,
        status: TRANSACTION_STATUS.SUCCESS,
        metadata: { referee_id: newUserId, bonus_type: "signup_bonus" },
        description: "Referral signup bonus",
      }, client);

      await client.query(
        `INSERT INTO referral_earnings
          (referrer_id, referee_id, earning_type, amount, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [referrerId, newUserId, "signup_bonus", bonus, "paid"]
      );
    });

    logger.info("Signup referral bonus paid", {
      referrerId,
      newUserId,
      bonus,
    });

  } catch (error) {
    logger.error("Signup bonus payment failed", {
      referrerId,
      newUserId,
      error: error.message,
    });
  }
}


// ✅ Pay first purchase bonus
export async function payFirstPurchaseBonus(userId, transactionId) {
  try {
    // Get referrer
    const userResult = await query(
      "SELECT referred_by FROM users WHERE id = $1",
      [userId]
    );

    if (!userResult.rows[0]?.referred_by) return;

    const referrerId = userResult.rows[0].referred_by;

    // Check if already paid
    const existing = await query(
      `SELECT id FROM referral_earnings
       WHERE referrer_id = $1 AND referee_id = $2
       AND earning_type = 'first_purchase_bonus'`,
      [referrerId, userId]
    );

    if (existing.rows.length > 0) return;

    // Check lifetime cap
    const lifetimeEarnings = await query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM referral_earnings
       WHERE referrer_id = $1 AND status = 'paid'`,
      [referrerId]
    );

    const totalEarned = parseFloat(lifetimeEarnings.rows[0].total);

    if (totalEarned >= REFERRAL_SETTINGS.MAX_REFERRAL_EARNINGS) return;

    const bonus = REFERRAL_SETTINGS.FIRST_PURCHASE_BONUS;

    await withTransaction(async (client) => {
      const walletResult = await creditWallet(referrerId, bonus, client);

      const ref = generateReference("REF");

      await createTransaction({
        user_id: referrerId,
        reference: ref,
        type: TRANSACTION_TYPES.REFERRAL_BONUS,
        amount: bonus,
        fee: 0,
        total_amount: bonus,
        balance_before: walletResult.balance_before,
        balance_after: walletResult.balance_after,
        status: TRANSACTION_STATUS.SUCCESS,
        metadata: {
          referee_id: userId,
          transaction_id: transactionId,
          bonus_type: "first_purchase_bonus",
        },
        description: "Referral first purchase bonus",
      }, client);

      await client.query(
        `INSERT INTO referral_earnings
          (referrer_id, referee_id, transaction_id, earning_type, amount, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [referrerId, userId, transactionId, "first_purchase_bonus", bonus, "paid"]
      );
    });

    logger.info("First purchase referral bonus paid", {
      referrerId,
      userId,
      bonus,
    });

  } catch (error) {
    logger.error("First purchase bonus failed", {
      userId,
      error: error.message,
    });
  }
}


// ✅ Get referral stats for user
export async function getReferralStats(userId) {
  const referrals = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email,
            u.created_at as joined_at,
            re.amount as bonus_earned,
            re.earning_type
     FROM users u
     LEFT JOIN referral_earnings re ON re.referee_id = u.id AND re.referrer_id = $1
     WHERE u.referred_by = $1
     ORDER BY u.created_at DESC`,
    [userId]
  );

  const earnings = await query(
    `SELECT
      COALESCE(SUM(amount), 0) as total_earned,
      COUNT(DISTINCT referee_id) as total_referrals,
      COALESCE(SUM(CASE WHEN earning_type = 'signup_bonus'
        THEN amount END), 0) as signup_bonuses,
      COALESCE(SUM(CASE WHEN earning_type = 'first_purchase_bonus'
        THEN amount END), 0) as purchase_bonuses
     FROM referral_earnings
     WHERE referrer_id = $1 AND status = 'paid'`,
    [userId]
  );

  const userResult = await query(
    "SELECT referral_code FROM users WHERE id = $1",
    [userId]
  );

  return {
    referral_code: userResult.rows[0]?.referral_code,
    referral_link: `${process.env.FRONTEND_URL}/register?ref=${userResult.rows[0]?.referral_code}`,
    referrals: referrals.rows,
    earnings: earnings.rows[0],
  };
}