import {
  verifyBettingCustomer,
  fundBettingService,
  getBettingHistory,
} from "../services/betting.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

export async function verifyCustomer(req, res) {
  try {
    const { platform, customer_id } = req.body;
    const result = await verifyBettingCustomer(platform, customer_id);
    return successResponse(res, "Betting account verified.", result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
}

export async function fundBetting(req, res) {
  try {
    const result = await fundBettingService(req.user.id, req.body);
    return successResponse(res, result.message, result.data);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
}

export async function getBettingFundHistory(req, res) {
  try {
    const history = await getBettingHistory(req.user.id, {
      page: parseInt(req.query.page || 1),
      limit: parseInt(req.query.limit || 20),
    });
    return successResponse(res, "Betting history retrieved.", history);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}