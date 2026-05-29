import { getReferralStats } from "../services/referral.service.js";
import { getAgentCommissionSummary, getAgentCommissionHistory } from "../services/commission.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

export async function getMyReferrals(req, res) {
  try {
    const stats = await getReferralStats(req.user.id);
    return successResponse(res, "Referral stats retrieved.", stats);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

export async function getMyCommissions(req, res) {
  try {
    if (!["agent", "admin"].includes(req.user.role)) {
      return errorResponse(res, "Only agents can view commissions.", 403);
    }

    const summary = await getAgentCommissionSummary(req.user.id);
    return successResponse(res, "Commission summary retrieved.", summary);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

export async function getMyCommissionHistory(req, res) {
  try {
    if (!["agent", "admin"].includes(req.user.role)) {
      return errorResponse(res, "Only agents can view commissions.", 403);
    }

    const history = await getAgentCommissionHistory(req.user.id, {
      page: parseInt(req.query.page || 1),
      limit: parseInt(req.query.limit || 20),
    });

    return successResponse(res, "Commission history retrieved.", history);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}