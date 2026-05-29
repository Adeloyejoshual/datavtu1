import express from "express";
import {
  getDashboardStats,
  getAllUsers,
  getUserDetail,
  getAllTransactions,
  creditUserWallet,
  updateUserRole,
  suspendUser,
  getRevenueAnalytics,
  getServiceStats,
  getUserGrowth,
} from "../controllers/admin.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";

const router = express.Router();

router.use(authenticate, requireAdmin);

// Dashboard
router.get("/dashboard", getDashboardStats);

// Users
router.get("/users", getAllUsers);
router.get("/users/:id", getUserDetail);
router.post("/credit-wallet", creditUserWallet);
router.patch("/users/:id/role", updateUserRole);
router.patch("/users/:id/suspend", suspendUser);

// Transactions
router.get("/transactions", getAllTransactions);

// Analytics
router.get("/analytics/revenue", getRevenueAnalytics);
router.get("/analytics/services", getServiceStats);
router.get("/analytics/users", getUserGrowth);

export default router;