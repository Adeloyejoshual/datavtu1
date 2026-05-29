import { query, withTransaction } from "../database/db.js";
import logger from "../utils/logger.js";

// Get wallet balance
export async function getWalletBalance(userId) {
  const result = await query(
    "SELECT balance, locked_balance FROM wallets WHERE user_id = $1",
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error("Wallet not found.");
  }

  return result.rows[0];
}

// Create wallet for new user
export async function createWallet(userId, client = null) {
  const queryFn = client ? client.query.bind(client) : query;

  const result = await queryFn(
    "INSERT INTO wallets (user_id, balance) VALUES ($1, 0.00) RETURNING *",
    [userId]
  );

  return result.rows[0];
}

// Debit wallet with locking (prevents double spending)
export async function debitWallet(userId, amount, client) {
  // Lock the wallet row for update (prevents concurrent modifications)
  const walletResult = await client.query(
    "SELECT id, balance, is_locked FROM wallets WHERE user_id = $1 FOR UPDATE",
    [userId]
  );

  if (walletResult.rows.length === 0) {
    throw new Error("Wallet not found.");
  }

  const wallet = walletResult.rows[0];

  if (wallet.is_locked) {
    throw new Error("Wallet is currently locked. Please try again.");
  }

  const currentBalance = parseFloat(wallet.balance);

  if (currentBalance < amount) {
    throw new Error(
      `Insufficient balance. Available: ₦${currentBalance.toFixed(2)}, Required: ₦${amount.toFixed(2)}`
    );
  }

  const newBalance = currentBalance - amount;

  await client.query(
    "UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2",
    [newBalance, userId]
  );

  logger.info("Wallet debited", {
    userId,
    amount,
    previousBalance: currentBalance,
    newBalance,
  });

  return {
    balance_before: currentBalance,
    balance_after: newBalance,
  };
}

// Credit wallet with locking
export async function creditWallet(userId, amount, client) {
  const walletResult = await client.query(
    "SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE",
    [userId]
  );

  if (walletResult.rows.length === 0) {
    throw new Error("Wallet not found.");
  }

  const currentBalance = parseFloat(walletResult.rows[0].balance);
  const newBalance = currentBalance + amount;

  await client.query(
    "UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2",
    [newBalance, userId]
  );

  logger.info("Wallet credited", {
    userId,
    amount,
    previousBalance: currentBalance,
    newBalance,
  });

  return {
    balance_before: currentBalance,
    balance_after: newBalance,
  };
}