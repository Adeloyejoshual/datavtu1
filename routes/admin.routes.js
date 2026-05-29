import express from "express";
import { getDashboardStats, getAllUsers, getAllTransactions, creditUserWallet } from "../controllers/admin.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get("/dashboard", getDashboardStats);
router.get("/users", getAllUsers);
router.get("/transactions", getAllTransactions);
router.post("/credit-wallet", creditUserWallet);

export default router;