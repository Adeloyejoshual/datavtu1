import express from "express";
import { buyData, getPlans } from "../controllers/data.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { transactionLimiter } from "../middleware/rateLimiter.middleware.js";
import { validateBuyData } from "../validators/data.validator.js";

const router = express.Router();

router.get("/plans/:network", authenticate, getPlans);
router.post("/buy", authenticate, transactionLimiter, validateBuyData, buyData);

export default router;