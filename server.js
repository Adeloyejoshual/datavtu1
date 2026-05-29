import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import dataRoutes from "./routes/data.routes.js";
import airtimeRoutes from "./routes/airtime.routes.js";          // ← Add
import transactionRoutes from "./routes/transaction.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";

import { apiLimiter } from "./middleware/rateLimiter.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { startTransactionVerificationJob } from "./jobs/verifyTransactions.job.js";
import { startPlanSyncJob } from "./jobs/syncPlans.job.js";
import logger from "./utils/logger.js";
import pool from "./database/db.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api/", apiLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/airtime", airtimeRoutes);                          // ← Add
app.use("/api/transactions", transactionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/webhooks", webhookRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "VTU Platform API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      success: true,
      message: "All systems operational",
      database: "connected",
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);

  if (process.env.NODE_ENV !== "test") {
    startTransactionVerificationJob(5 * 60 * 1000);
    startPlanSyncJob(60 * 60 * 1000);
  }
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", { reason: reason?.message || reason });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", { error: error.message });
  process.exit(1);
});

export default app;