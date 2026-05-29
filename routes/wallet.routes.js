import express from "express";
import { getBalance, fundWallet, verifyFunding, getTransactions, transferFunds } from "../controllers/wallet.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { transactionLimiter, fundingLimiter } from "../middleware/rateLimiter.middleware.js";
import { validateFundWallet, validateTransfer } from "../validators/wallet.validator.js";

const router = express.Router();

router.get("/balance", authenticate, getBalance);
router.post("/fund", authenticate, fundingLimiter, validateFundWallet, fundWallet);
router.get("/verify/:reference", authenticate, verifyFunding);
router.get("/transactions", authenticate, getTransactions);
router.post("/transfer", authenticate, transactionLimiter, validateTransfer, transferFunds);

export default router;