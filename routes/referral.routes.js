import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { getMyReferrals, getMyCommissions, getMyCommissionHistory } from "../controllers/referral.controller.js";

const router = express.Router();

router.use(authenticate);

router.get("/stats", getMyReferrals);
router.get("/commissions", getMyCommissions);
router.get("/commissions/history", getMyCommissionHistory);

export default router;