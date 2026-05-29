import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import authRoutes from "./routes/auth.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import dataRoutes from "./routes/data.routes.js";
import airtimeRoutes from "./routes/airtime.routes.js";
import electricityRoutes from "./routes/electricity.routes.js";
import cableRoutes from "./routes/cable.routes.js";
import bettingRoutes from "./routes/betting.routes.js";
import referralRoutes from "./routes/referral.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";

// Middleware
import { apiLimiter } from "./middleware/rateLimiter.middleware.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";

// Jobs
import { startTransactionVerificationJob } from "./jobs/verifyTransactions.job.js";
import { startPlanSyncJob } from "./jobs/syncPlans.job.js";

// Utils
import logger from "./utils/logger.js";
import pool from "./database/db.js";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────
// Security
// ─────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────
app.use(
  morgan(process.env.NODE_ENV === "production" ? "combined" : "dev")
);

// ─────────────────────────────────────────────
// Body Parsing
// ─────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────
// Rate Limiting
// ─────────────────────────────────────────────
app.use("/api/", apiLimiter);

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/airtime", airtimeRoutes);
app.use("/api/electricity", electricityRoutes);
app.use("/api/cable", cableRoutes);
app.use("/api/betting", bettingRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/webhooks", webhookRoutes);

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      success: true,
      message: "All systems operational",
      database: "connected",
      environment: process.env.NODE_ENV,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// ─────────────────────────────────────────────
// Serve React Frontend
// ─────────────────────────────────────────────
const publicPath = path.join(__dirname, "public");

app.use(express.static(publicPath));

// SPA fallback
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }

  res.sendFile(path.join(publicPath, "index.html"));
});

// ─────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────
app.use(notFoundHandler);

// ─────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────
app.use(errorHandler);

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);

  logger.info(
    `Environment: ${process.env.NODE_ENV || "development"}`
  );

  if (process.env.NODE_ENV !== "test") {
    startTransactionVerificationJob(5 * 60 * 1000);
    startPlanSyncJob(60 * 60 * 1000);
  }
});

// ─────────────────────────────────────────────
// Graceful Shutdown
// ─────────────────────────────────────────────
const shutdown = async () => {
  logger.info("Shutting down server...");

  server.close(async () => {
    await pool.end();

    logger.info("Database pool closed");

    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ─────────────────────────────────────────────
// Process Errors
// ─────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection", {
    reason: reason?.message || reason,
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
  });

  process.exit(1);
});

export default app;