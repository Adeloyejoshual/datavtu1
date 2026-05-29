import {
  buyAirtimeService,
  requeryAirtimeTransaction,
  getAirtimeHistory,
  detectNetworkFromPhone,
} from "../services/airtime.service.js";
import { generateIdempotencyKey } from "../utils/generateReference.js";
import { successResponse, errorResponse, paginatedResponse } from "../utils/response.js";
import { getTransactionByReference } from "../services/transaction.service.js";
import logger from "../utils/logger.js";

// ========================
// Buy Airtime
// ========================
export async function buyAirtime(req, res) {
  try {
    const userId = req.user.id;
    const { network, phone, amount } = req.body;

    // Generate idempotency key to prevent duplicates
    const idempotency_key = generateIdempotencyKey(
      userId,
      "airtime",
      { network, phone, amount, timestamp: Math.floor(Date.now() / 60000) }
      // Minute-level timestamp — same request within 1 min = duplicate
    );

    const result = await buyAirtimeService(userId, {
      network,
      phone,
      amount,
      idempotency_key,
    });

    // Warn user about phone/network mismatch
    if (req.body.network_mismatch_warning) {
      result.warning =
        "Phone number may not belong to the selected network. Verify before retrying.";
    }

    return successResponse(res, result.message, result.data);
  } catch (error) {
    logger.error("Buy airtime controller error", {
      error: error.message,
      userId: req.user.id,
    });
    return errorResponse(res, error.message, 400);
  }
}

// ========================
// Detect Network from Phone
// ========================
export async function getNetworkFromPhone(req, res) {
  try {
    const { phone } = req.params;

    if (!phone || !/^(\+234|0)[789]\d{9}$/.test(phone)) {
      return errorResponse(res, "Valid Nigerian phone number required.", 400);
    }

    const network = detectNetworkFromPhone(phone);

    if (!network) {
      return errorResponse(
        res,
        "Could not detect network for this number.",
        404
      );
    }

    return successResponse(res, "Network detected.", {
      phone,
      network: network.toUpperCase(),
      network_key: network,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// ========================
// Requery Airtime Status
// ========================
export async function requeryAirtime(req, res) {
  try {
    const { reference } = req.params;
    const userId = req.user.id;

    // Verify transaction belongs to user
    const transaction = await getTransactionByReference(reference);

    if (!transaction) {
      return errorResponse(res, "Transaction not found.", 404);
    }

    if (transaction.user_id !== userId && req.user.role !== "admin") {
      return errorResponse(res, "Access denied.", 403);
    }

    if (transaction.type !== "airtime_purchase") {
      return errorResponse(res, "Not an airtime transaction.", 400);
    }

    // Already resolved
    if (["success", "failed", "reversed"].includes(transaction.status)) {
      return successResponse(res, "Transaction already resolved.", {
        reference,
        status: transaction.status,
        amount: transaction.amount,
        description: transaction.description,
      });
    }

    // Requery from VTpass
    const vtpassResult = await requeryAirtimeTransaction(reference);

    return successResponse(res, "Transaction status checked.", {
      reference,
      local_status: transaction.status,
      provider_response: vtpassResult,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// ========================
// Airtime Purchase History
// ========================
export async function getHistory(req, res) {
  try {
    const { page = 1, limit = 20, network } = req.query;

    const result = await getAirtimeHistory(req.user.id, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50),
      network,
    });

    return paginatedResponse(
      res,
      "Airtime history retrieved.",
      result.transactions,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
      }
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// ========================
// Get Airtime Stats (User)
// ========================
export async function getAirtimeStats(req, res) {
  try {
    const { query } = await import("../database/db.js");
    const userId = req.user.id;

    const result = await query(
      `SELECT
        COUNT(*) as total_purchases,
        COALESCE(SUM(CASE WHEN status = 'success' THEN amount END), 0) as total_spent,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        metadata->>'network' as network
      FROM transactions
      WHERE user_id = $1 AND type = $2
      GROUP BY metadata->>'network'`,
      [userId, "airtime_purchase"]
    );

    const totalResult = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'success' THEN amount END), 0) as total_spent,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as total_successful
      FROM transactions
      WHERE user_id = $1 AND type = $2`,
      [userId, "airtime_purchase"]
    );

    return successResponse(res, "Airtime stats retrieved.", {
      by_network: result.rows,
      overall: totalResult.rows[0],
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}