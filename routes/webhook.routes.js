import express from "express";
import crypto from "crypto";
import { query, withTransaction } from "../database/db.js";
import { creditWallet } from "../services/wallet.service.js";
import { TRANSACTION_STATUS } from "../config/constants.js";
import config from "../config/env.js";
import logger from "../utils/logger.js";

const router = express.Router();

// Paystack webhook
router.post("/paystack", express.json(), async (req, res) => {
  try {
    // Verify webhook signature
    const hash = crypto
      .createHmac("sha512", config.paystack.secretKey)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      logger.warn("Invalid Paystack webhook signature");
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;

    if (event.event === "charge.success") {
      const { reference, amount, customer } = event.data;
      const amountInNaira = amount / 100;

      // Find pending transaction
      const txResult = await query(
        "SELECT * FROM transactions WHERE reference = $1 AND status = $2",
        [reference, TRANSACTION_STATUS.PENDING]
      );

      if (txResult.rows.length === 0) {
        logger.warn("Webhook: Transaction not found or already processed", { reference });
        return res.status(200).send("OK");
      }

      const transaction = txResult.rows[0];

      // Credit wallet
      await withTransaction(async (client) => {
        const walletResult = await creditWallet(transaction.user_id, amountInNaira, client);

        await client.query(
          `UPDATE transactions SET
            status = $1,
            balance_after = $2,
            provider_reference = $3,
            updated_at = NOW()
          WHERE reference = $4`,
          [TRANSACTION_STATUS.SUCCESS, walletResult.balance_after, event.data.id, reference]
        );
      });

      logger.info("Paystack webhook: Wallet funded", {
        reference,
        amount: amountInNaira,
        userId: transaction.user_id,
      });
    }

    return res.status(200).send("OK");
  } catch (error) {
    logger.error("Paystack webhook error", { error: error.message });
    return res.status(200).send("OK"); // Always return 200 to prevent retries
  }
});

// Monnify webhook
router.post("/monnify", express.json(), async (req, res) => {
  try {
    const { eventType, eventData } = req.body;

    // Verify hash
    const transactionHash = crypto
      .createHash("sha512")
      .update(
        `${config.monnify.secretKey}|${eventData.paymentReference}|${eventData.amountPaid}|${eventData.paidOn}|${eventData.transactionReference}`
      )
      .digest("hex");

    if (transactionHash !== eventData.transactionHash) {
      logger.warn("Invalid Monnify webhook hash");
      return res.status(401).send("Invalid hash");
    }

    if (eventType === "SUCCESSFUL_TRANSACTION") {
      const accountReference = eventData.product?.reference;

      if (accountReference && accountReference.startsWith("VTU-")) {
        const userId = accountReference.replace("VTU-", "");
        const amount = parseFloat(eventData.amountPaid);

        await withTransaction(async (client) => {
          const { generateReference } = await import("../utils/generateReference.js");
          const { createTransaction } = await import("../services/transaction.service.js");

          const walletResult = await creditWallet(userId, amount, client);

          const reference = generateReference("MNF");
          await createTransaction({
            user_id: userId,
            reference,
            type: "wallet_funding",
            amount,
            fee: 0,
            total_amount: amount,
            balance_before: walletResult.balance_before,
            balance_after: walletResult.balance_after,
            status: TRANSACTION_STATUS.SUCCESS,
            provider: "monnify",
            provider_reference: eventData.transactionReference,
            description: `Wallet funding via bank transfer`,
          }, client);
        });

        logger.info("Monnify webhook: Wallet funded", { userId, amount: eventData.amountPaid });
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    logger.error("Monnify webhook error", { error: error.message });
    return res.status(200).send("OK");
  }
});

export default router;