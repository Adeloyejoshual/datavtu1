import { getTransactionByReference } from "../services/transaction.service.js";
import { verifyVtpassTransaction } from "../services/vtpass.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

// Get single transaction
export async function getTransaction(req, res) {
  try {
    const { reference } = req.params;

    const transaction = await getTransactionByReference(reference);

    if (!transaction) {
      return errorResponse(res, "Transaction not found.", 404);
    }

    // Verify ownership
    if (transaction.user_id !== req.user.id && req.user.role !== "admin") {
      return errorResponse(res, "Access denied.", 403);
    }

    return successResponse(res, "Transaction retrieved.", transaction);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// Requery/verify transaction
export async function requeryTransaction(req, res) {
  try {
    const { reference } = req.params;

    const transaction = await getTransactionByReference(reference);

    if (!transaction) {
      return errorResponse(res, "Transaction not found.", 404);
    }

    if (transaction.user_id !== req.user.id && req.user.role !== "admin") {
      return errorResponse(res, "Access denied.", 403);
    }

    // Only requery pending/processing transactions
    if (!["pending", "processing"].includes(transaction.status)) {
      return successResponse(res, "Transaction already resolved.", transaction);
    }

    // Requery based on provider
    if (transaction.provider === "vtpass") {
      const vtpassResult = await verifyVtpassTransaction(reference);

      return successResponse(res, "Transaction status checked.", {
        transaction,
        provider_status: vtpassResult,
      });
    }

    return successResponse(res, "Transaction status.", transaction);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}