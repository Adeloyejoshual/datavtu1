import { query } from "../database/db.js";

// Create transaction record
export async function createTransaction(data, client = null) {
  const queryFn = client ? client.query.bind(client) : query;

  const result = await queryFn(
    `INSERT INTO transactions (
      user_id, reference, type, amount, fee, total_amount,
      balance_before, balance_after, status, provider,
      provider_reference, metadata, description, idempotency_key
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      data.user_id,
      data.reference,
      data.type,
      data.amount,
      data.fee || 0,
      data.total_amount,
      data.balance_before,
      data.balance_after,
      data.status || "pending",
      data.provider || null,
      data.provider_reference || null,
      JSON.stringify(data.metadata || {}),
      data.description || null,
      data.idempotency_key || null,
    ]
  );

  return result.rows[0];
}

// Update transaction status
export async function updateTransactionStatus(reference, status, providerReference = null, client = null) {
  const queryFn = client ? client.query.bind(client) : query;

  const updates = ["status = $1", "updated_at = NOW()"];
  const values = [status, reference];
  let paramIndex = 3;

  if (providerReference) {
    updates.push(`provider_reference = $${paramIndex}`);
    values.push(providerReference);
    paramIndex++;
  }

  const result = await queryFn(
    `UPDATE transactions SET ${updates.join(", ")} WHERE reference = $2 RETURNING *`,
    values
  );

  return result.rows[0];
}

// Get user transactions with pagination
export async function getUserTransactions(userId, options = {}) {
  const { page = 1, limit = 20, type = null, status = null } = options;
  const offset = (page - 1) * limit;

  let whereClause = "WHERE user_id = $1";
  const params = [userId];
  let paramIndex = 2;

  if (type) {
    whereClause += ` AND type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) FROM transactions ${whereClause}`,
    params
  );

  // Get paginated data
  const dataParams = [...params, limit, offset];
  const dataResult = await query(
    `SELECT * FROM transactions ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    dataParams
  );

  return {
    transactions: dataResult.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
  };
}

// Check idempotency
export async function checkIdempotency(idempotencyKey) {
  if (!idempotencyKey) return null;

  const result = await query(
    "SELECT * FROM transactions WHERE idempotency_key = $1",
    [idempotencyKey]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

// Get transaction by reference
export async function getTransactionByReference(reference) {
  const result = await query(
    "SELECT * FROM transactions WHERE reference = $1",
    [reference]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}