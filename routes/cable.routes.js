import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { transactionLimiter } from "../middleware/rateLimiter.middleware.js";
import { validateVerifySmartCard, validateBuyCable } from "../validators/cable.validator.js";
import { verifyCard, getPackages, buyCable, getCableSubscriptionHistory } from "../controllers/cable.controller.js";

const router = express.Router();

router.use(authenticate);

router.post("/verify-card", validateVerifySmartCard, verifyCard);
router.get("/packages/:provider", getPackages);
router.post("/buy", transactionLimiter, validateBuyCable, buyCable);
router.get("/history", getCableSubscriptionHistory);

export default router;