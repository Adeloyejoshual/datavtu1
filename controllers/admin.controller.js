import { query } from "../database/db.js";
import { successResponse, errorResponse, paginatedResponse } from "../utils/response.js";
import { withTransaction } from "../database/db.js";
import { creditWallet } from "../services/wallet.service.js";
import { createTransaction } from "../services/transaction.service.js";
import { generateReference } from "../utils/generateReference.js";
import logger from "../utils/logger.js";

// ✅ Get dashboard stats
export async function getDashboardStats(req, res) {
  try {
    const [
      users,
      transactions,
      revenue,
      walletTotal,
      todayTx,
      serviceBreakdown,
    ] = await Promise.all([
      query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as today,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as this_week,
          COUNT(CASE WHEN role = 'agent' THEN 1 END) as agents
        FROM users
      `),

      query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as today
        FROM transactions
      `),

      query(`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'success' THEN amount END), 0) as total_volume,
          COALESCE(SUM(CASE WHEN status = 'success' AND
            created_at > NOW() - INTERVAL '24 hours' THEN amount END), 0) as today_volume,
          COALESCE(SUM(CASE WHEN status = 'success' AND
            created_at > NOW() - INTERVAL '30 days' THEN amount END), 0) as month_volume
        FROM transactions
        WHERE type != 'wallet_funding'
      `),

      query(`SELECT COALESCE(SUM(balance), 0) as total FROM wallets`),

      query(`
        SELECT DATE_TRUNC('hour', created_at) as hour,
               COUNT(*) as count,
               COALESCE(SUM(amount), 0) as volume
        FROM transactions
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY hour ASC
      `),

      query(`
        SELECT type,
               COUNT(*) as count,
               COALESCE(SUM(CASE WHEN status = 'success' THEN amount END), 0) as volume
        FROM transactions
        WHERE type NOT IN ('wallet_funding', 'reversal', 'referral_bonus', 'commission')
        GROUP BY type
        ORDER BY volume DESC
      `),
    ]);

    return successResponse(res, "Dashboard stats retrieved.", {
      users: users.rows[0],
      transactions: transactions.rows[0],
      revenue: revenue.rows[0],
      total_wallet_balance: walletTotal.rows[0].total,
      today_activity: todayTx.rows,
      service_breakdown: serviceBreakdown.rows,
    });
  } catch (error) {
    logger.error("Admin dashboard error", { error: error.message });
    return errorResponse(res, error.message);
  }
}

// ✅ Get all users
export async function getAllUsers(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      role = "",
      sort = "created_at",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let whereClause = "WHERE 1=1";
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (
        u.email ILIKE $${paramIndex} OR
        u.phone ILIKE $${paramIndex} OR
        u.first_name ILIKE $${paramIndex} OR
        u.last_name ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      whereClause += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    );

    const usersResult = await query(
      `SELECT
        u.id, u.first_name, u.last_name, u.email, u.phone,
        u.role, u.is_verified, u.referral_code, u.created_at,
        w.balance as wallet_balance,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(CASE WHEN t.status = 'success'
          THEN t.amount END), 0) as total_spent
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       LEFT JOIN transactions t ON t.user_id = u.id
       ${whereClause}
       GROUP BY u.id, w.balance
       ORDER BY u.${sort} DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
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

// ✅ Get user detail
export async function getUserDetail(req, res) {
  try {
    const { id } = req.params;

    const [userResult, txResult, referrals] = await Promise.all([
      query(`
        SELECT u.*, w.balance as wallet_balance, w.locked_balance
        FROM users u
        LEFT JOIN wallets w ON w.user_id = u.id
        WHERE u.id = $1
      `, [id]),

      query(`
        SELECT * FROM transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [id]),

      query(
        "SELECT COUNT(*) FROM users WHERE referred_by = $1",
        [id]
      ),
    ]);

    if (userResult.rows.length === 0) {
      return errorResponse(res, "User not found.", 404);
    }

    return successResponse(res, "User retrieved.", {
      user: userResult.rows[0],
      recent_transactions: txResult.rows,
      referral_count: parseInt(referrals.rows[0].count),
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// ✅ Credit wallet
export async function creditUserWallet(req, res) {
  try {
    const { user_id, amount, reason } = req.body;

    if (!user_id || !amount || amount <= 0) {
      return errorResponse(res, "Valid user_id and amount required.", 400);
    }

    const result = await withTransaction(async (client) => {
      const walletResult = await creditWallet(
        user_id,
        parseFloat(amount),
        client
      );

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

    logger.info("Admin credited wallet", {
      adminId: req.user.id,
      userId: user_id,
      amount,
    });

    return successResponse(res, "Wallet credited.", {
      new_balance: result.balance_after,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// ✅ Update user role
export async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "agent", "admin"].includes(role)) {
      return errorResponse(res, "Invalid role.", 400);
    }

    await query(
      "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2",
      [role, id]
    );

    logger.info("User role updated", {
      adminId: req.user.id,
      userId: id,
      role,
    });

    return successResponse(res, "User role updated.");
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// ✅ Suspend user
export async function suspendUser(req, res) {
  try {
    const { id } = req.params;

    const userResult = await query(
      "SELECT is_verified FROM users WHERE id = $1",
      [id]
    );

    if (userResult.rows.length === 0) {
      return errorResponse(res, "User not found.", 404);
    }

    const newStatus = !userResult.rows[0].is_verified;

    await query(
      "UPDATE users SET is_verified = $1, updated_at = NOW() WHERE id = $2",
      [newStatus, id]
    );

    return successResponse(
      res,
      newStatus ? "User activated." : "User suspended."
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// ✅ Get all transactions (admin)
export async function getAllTransactions(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      search,
      from,
      to,
    } = req.query;

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

    if (search) {
      whereClause += ` AND (
        t.reference ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (from) {
      whereClause += ` AND t.created_at >= $${paramIndex}`;
      params.push(from);
      paramIndex++;
    }

    if (to) {
      whereClause += ` AND t.created_at <= $${paramIndex}`;
      params.push(to);
      paramIndex++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM transactions t
       JOIN users u ON u.id = t.user_id
       ${whereClause}`,
      params
    );

    const txResult = await query(
      `SELECT
        t.*,
        u.email as user_email,
        u.first_name,
        u.last_name,
        u.phone
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

// ✅ Revenue analytics
export async function getRevenueAnalytics(req, res) {
  try {
    const { period = "7days" } = req.query;

    const intervals = {
      "7days": { interval: "7 days", trunc: "day" },
      "30days": { interval: "30 days", trunc: "day" },
      "12months": { interval: "12 months", trunc: "month" },
    };

    const { interval, trunc } = intervals[period] || intervals["7days"];

    const result = await query(`
      SELECT
        DATE_TRUNC('${trunc}', created_at) as date,
        COALESCE(SUM(CASE WHEN status = 'success'
          THEN amount END), 0) as volume,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
        COUNT(*) as total
      FROM transactions
      WHERE created_at > NOW() - INTERVAL '${interval}'
        AND type NOT IN ('wallet_funding', 'reversal', 'referral_bonus', 'commission')
      GROUP BY DATE_TRUNC('${trunc}', created_at)
      ORDER BY date ASC
    `);

    return successResponse(res, "Revenue analytics retrieved.", result.rows);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// ✅ Service stats
export async function getServiceStats(req, res) {
  try {
    const result = await query(`
      SELECT
        type,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COALESCE(SUM(CASE WHEN status = 'success'
          THEN amount END), 0) as volume,
        ROUND(
          COUNT(CASE WHEN status = 'success' THEN 1 END)::numeric /
          NULLIF(COUNT(*), 0) * 100, 1
        ) as success_rate
      FROM transactions
      WHERE type NOT IN ('wallet_funding', 'reversal', 'referral_bonus', 'commission')
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY type
      ORDER BY volume DESC
    `);

    return successResponse(res, "Service stats retrieved.", result.rows);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// ✅ User growth
export async function getUserGrowth(req, res) {
  try {
    const result = await query(`
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as new_users,
        COUNT(CASE WHEN role = 'agent' THEN 1 END) as new_agents
      FROM users
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `);

    return successResponse(res, "User growth retrieved.", result.rows);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}