import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { transactionLimiter } from "../middleware/rateLimiter.middleware.js";
import { validateVerifyBettingId, validateFundBetting } from "../validators/betting.validator.js";
import { verifyCustomer, fundBetting, getBettingFundHistory } from "../controllers/betting.controller.js";

const router = express.Router();

router.use(authenticate);

router.post("/verify-customer", validateVerifyBettingId, verifyCustomer);
router.post("/fund", transactionLimiter, validateFundBetting, fundBetting);
router.get("/history", getBettingFundHistory);

export default router;