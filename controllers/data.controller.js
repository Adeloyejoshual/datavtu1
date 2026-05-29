import { buyDataService, getDataPlans } from "../services/vtpass.service.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { VTPASS_SERVICE_IDS } from "../config/constants.js";
import { generateIdempotencyKey } from "../utils/generateReference.js";
import logger from "../utils/logger.js";

// Buy data
export async function buyData(req, res) {
  try {
    const userId = req.user.id;
    const { network, phone, plan_code, amount } = req.body;

    // Generate idempotency key
    const idempotency_key = generateIdempotencyKey(userId, "data", {
      network,
      phone,
      plan_code,
    });

    const result = await buyDataService(userId, {
      network,
      phone,
      plan_code,
      amount,
      idempotency_key,
    });

    return successResponse(res, result.message, result.data);
  } catch (error) {
    logger.error("Buy data failed", { error: error.message, userId: req.user.id });
    return errorResponse(res, error.message, 400);
  }
}

// Get available data plans
export async function getPlans(req, res) {
  try {
    const { network } = req.params;

    const serviceMap = {
      mtn: VTPASS_SERVICE_IDS.MTN_DATA,
      glo: VTPASS_SERVICE_IDS.GLO_DATA,
      airtel: VTPASS_SERVICE_IDS.AIRTEL_DATA,
      etisalat: VTPASS_SERVICE_IDS.ETISALAT_DATA,
    };

    const serviceID = serviceMap[network.toLowerCase()];

    if (!serviceID) {
      return errorResponse(res, "Invalid network. Use: mtn, glo, airtel, etisalat", 400);
    }

    const plans = await getDataPlans(serviceID);

    return successResponse(res, "Data plans retrieved.", {
      network: network.toUpperCase(),
      plans,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}