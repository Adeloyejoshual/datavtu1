import { query } from "../database/db.js";
import { successResponse, errorResponse, paginatedResponse } from "../utils/response.js";
import logger from "../utils/logger.js";

// Get dashboard stats
export async function getDashboardStats(req, res) {
  try {
    const [users, transactions, revenue, walletTotal] = await Promise.all([
      query("SELECT COUNT(*) as total, COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as today FROM users"),

      query(`SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM transactions`),

      query(`SELECT
        COALESCE(SUM(CASE WHEN type = 'data_purchase' AND status = 'success' THEN amount END), 0) as data_revenue,
        COALESCE(SUM(CASE WHEN type = 'airtime_purchase' AND status = 'success' THEN amount END), 0) as airtime_revenue,
        COALESCE(SUM(CASE WHEN status = 'success' THEN fee END), 0) as total_fees
      FROM transactions`),

      query("SELECT COALESCE(SUM(balance), 0) as total FROM wallets"),
    ]);

    return successResponse(res, "Dashboard stats retrieved.", {
      users: users.rows[0],
      transactions: transactions.rows[0],
      revenue: revenue.rows[0],
      total_wallet_balance: walletTotal.rows[0].total,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// Get all users (admin)
export async function getAllUsers(req, res) {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = "";
    const params = [];

    if (search) {
      whereClause = "WHERE u.email ILIKE $1 OR u.phone ILIKE $1 OR u.first_name ILIKE $1";
      params.push(`%${search}%`);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    );

    const usersResult = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
              u.role, u.is_verified, u.created_at,
              w.balance as wallet_balance
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );

    return paginatedResponse(res, "Users retrieved.", usersResult.rows, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// Get all transactions (admin)
export async function getAllTransactions(req, res) {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = "WHERE 1=1";
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      whereClause += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM transactions t ${whereClause}`,
      params
    );

    const txResult = await query(
      `SELECT t.*, u.email as user_email, u.first_name, u.last_name
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    return paginatedResponse(res, "Transactions retrieved.", txResult.rows, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// Manual credit user wallet (admin)
export async function creditUserWallet(req, res) {
  try {
    const { user_id, amount, reason } = req.body;

    if (!user_id || !amount || amount <= 0) {
      return errorResponse(res, "Valid user_id and amount required.", 400);
    }

    const { creditWallet } = await import("../services/wallet.service.js");
    const { createTransaction } = await import("../services/transaction.service.js");
    const { generateReference } = await import("../utils/generateReference.js");
    const { withTransaction } = await import("../database/db.js");

    const result = await withTransaction(async (client) => {
      const walletResult = await creditWallet(user_id, parseFloat(amount), client);

      const reference = generateReference("ADM");
      await createTransaction({
        user_id,
        reference,
        type: "wallet_funding",
        amount: parseFloat(amount),
        fee: 0,
        total_amount: parseFloat(amount),
        balance_before: walletResult.balance_before,
        balance_after: walletResult.balance_after,
        status: "success",
        provider: "admin",
        description: reason || `Admin credit by ${req.user.email}`,
        metadata: { admin_id: req.user.id, reason },
      }, client);

      return walletResult;
    });

    logger.info("Admin credited user wallet", {
      adminId: req.user.id,
      userId: user_id,
      amount,
    });

    return successResponse(res, "Wallet credited successfully.", {
      new_balance: result.balance_after,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}