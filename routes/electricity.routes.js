import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { transactionLimiter } from "../middleware/rateLimiter.middleware.js";
import { validateElectricity } from "../validators/electricity.validator.js";
import { verifyMeter, buyElectricity } from "../controllers/electricity.controller.js";

const router = express.Router();

router.use(authenticate);

// Validate meter
router.post("/verify-meter", validateElectricity, verifyMeter);

// Buy electricity
router.post("/buy", transactionLimiter, validateElectricity, buyElectricity);

export default router;