import express from "express";
import {
  buyAirtime,
  getNetworkFromPhone,
  requeryAirtime,
  getHistory,
  getAirtimeStats,
} from "../controllers/airtime.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { transactionLimiter } from "../middleware/rateLimiter.middleware.js";
import { validateBuyAirtime } from "../validators/airtime.validator.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Detect network from phone number
router.get("/detect-network/:phone", getNetworkFromPhone);

// Buy airtime
router.post("/buy", transactionLimiter, validateBuyAirtime, buyAirtime);

// Get airtime purchase history
router.get("/history", getHistory);

// Get airtime stats
router.get("/stats", getAirtimeStats);

// Requery a specific transaction
router.get("/requery/:reference", requeryAirtime);

export default router;