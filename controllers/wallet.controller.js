import { getWalletBalance, creditWallet, debitWallet } from "../services/wallet.service.js";
import { createTransaction, getUserTransactions } from "../services/transaction.service.js";
import { initializePayment, verifyPayment } from "../services/paystack.service.js";
import { generateReference } from "../utils/generateReference.js";
import { successResponse, errorResponse, paginatedResponse } from "../utils/response.js";
import { withTransaction, query } from "../database/db.js";
import { TRANSACTION_TYPES, TRANSACTION_STATUS } from "../config/constants.js";
import logger from "../utils/logger.js";

// Get wallet balance
export async function getBalance(req, res) {
  try {
    const wallet = await getWalletBalance(req.user.id);

    return successResponse(res, "Wallet balance retrieved.", {
      balance: parseFloat(wallet.balance),
      locked_balance: parseFloat(wallet.locked_balance),
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// Initialize wallet funding via Paystack
export async function fundWallet(req, res) {
  try {
    const { amount } = req.body;
    const userId = req.user.id;
    const reference = generateReference("FUND");

    // Initialize Paystack payment
    const paymentData = await initializePayment(
      req.user.email,
      amount,
      reference,
      { user_id: userId, type: "wallet_funding" }
    );

    // Create pending transaction
    const wallet = await getWalletBalance(userId);

    await createTransaction({
      user_id: userId,
      reference,
      type: TRANSACTION_TYPES.WALLET_FUNDING,
      amount,
      fee: 0,
      total_amount: amount,
      balance_before: parseFloat(wallet.balance),
      balance_after: parseFloat(wallet.balance), // Will update on verification
      status: TRANSACTION_STATUS.PENDING,
      provider: "paystack",
      description: `Wallet funding of ₦${amount}`,
    });

    logger.info("Wallet funding initialized", { userId, amount, reference });

    return successResponse(res, "Payment initialized.", {
      reference,
      authorization_url: paymentData.authorization_url,
      access_code: paymentData.access_code,
    });
  } catch (error) {
    logger.error("Fund wallet failed", { error: error.message });
    return errorResponse(res, error.message);
  }
}

// Verify wallet funding
export async function verifyFunding(req, res) {
  try {
    const { reference } = req.params;
    const userId = req.user.id;

    // Verify with Paystack
    const paymentData = await verifyPayment(reference);

    if (paymentData.status !== "success") {
      await query(
        "UPDATE transactions SET status = $1, updated_at = NOW() WHERE reference = $2",
        [TRANSACTION_STATUS.FAILED, reference]
      );

      return errorResponse(res, "Payment verification failed.", 400);
    }

    const amount = paymentData.amount / 100; // Convert from kobo

    // Credit wallet in transaction
    const result = await withTransaction(async (client) => {
      const walletResult = await creditWallet(userId, amount, client);

      // Update transaction
      await client.query(
        `UPDATE transactions SET
          status = $1,
          balance_after = $2,
          provider_reference = $3,
          updated_at = NOW()
        WHERE reference = $4`,
        [TRANSACTION_STATUS.SUCCESS, walletResult.balance_after, paymentData.reference, reference]
      );

      return walletResult;
    });

    logger.info("Wallet funded successfully", { userId, amount, reference });

    return successResponse(res, "Wallet funded successfully.", {
      amount,
      balance: result.balance_after,
    });
  } catch (error) {
    logger.error("Verify funding failed", { error: error.message });
    return errorResponse(res, error.message);
  }
}

// Get transaction history
export async function getTransactions(req, res) {
  try {
    const { page = 1, limit = 20, type, status } = req.query;

    const result = await getUserTransactions(req.user.id, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50),
      type,
      status,
    });

    return paginatedResponse(res, "Transactions retrieved.", result.transactions, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// Wallet-to-wallet transfer
export async function transferFunds(req, res) {
  try {
    const { recipient_email, amount, description } = req.body;
    const senderId = req.user.id;

    // Can't transfer to self
    if (recipient_email === req.user.email) {
      return errorResponse(res, "Cannot transfer to yourself.", 400);
    }

    // Find recipient
    const recipientResult = await query(
      "SELECT id, first_name, last_name, email FROM users WHERE email = $1",
      [recipient_email]
    );

    if (recipientResult.rows.length === 0) {
      return errorResponse(res, "Recipient not found.", 404);
    }

    const recipient = recipientResult.rows[0];
    const reference = generateReference("TRF");

    const result = await withTransaction(async (client) => {
      // Debit sender
      const senderWallet = await debitWallet(senderId, amount, client);

      // Credit recipient
      const recipientWallet = await creditWallet(recipient.id, amount, client);

      // Create sender transaction
      await createTransaction({
        user_id: senderId,
        reference,
        type: TRANSACTION_TYPES.TRANSFER,
        amount,
        fee: 0,
        total_amount: amount,
        balance_before: senderWallet.balance_before,
        balance_after: senderWallet.balance_after,
        status: TRANSACTION_STATUS.SUCCESS,
        metadata: { recipient_id: recipient.id, recipient_email },
        description: description || `Transfer to ${recipient.first_name} ${recipient.last_name}`,
      }, client);

      // Create recipient transaction
      const recipientRef = generateReference("TRF");
      await createTransaction({
        user_id: recipient.id,
        reference: recipientRef,
        type: TRANSACTION_TYPES.TRANSFER,
        amount,
        fee: 0,
        total_amount: amount,
        balance_before: recipientWallet.balance_before,
        balance_after: recipientWallet.balance_after,
        status: TRANSACTION_STATUS.SUCCESS,
        metadata: { sender_id: senderId, sender_email: req.user.email },
        description: description || `Transfer from ${req.user.first_name} ${req.user.last_name}`,
      }, client);

      return senderWallet;
    });

    logger.info("Transfer successful", {
      senderId,
      recipientId: recipient.id,
      amount,
      reference,
    });

    return successResponse(res, "Transfer successful.", {
      reference,
      amount,
      recipient: `${recipient.first_name} ${recipient.last_name}`,
      balance: result.balance_after,
    });
  } catch (error) {
    logger.error("Transfer failed", { error: error.message });
    return errorResponse(res, error.message);
  }
}