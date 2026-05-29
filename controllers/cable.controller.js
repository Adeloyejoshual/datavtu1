import {
  verifySmartCard,
  getCablePackages,
  buyCableService,
  getCableHistory,
} from "../services/cable.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

export async function verifyCard(req, res) {
  try {
    const { provider, smart_card_number } = req.body;
    const result = await verifySmartCard(provider, smart_card_number);
    return successResponse(res, "Smart card verified.", result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
}

export async function getPackages(req, res) {
  try {
    const { provider } = req.params;
    const packages = await getCablePackages(provider.toLowerCase());
    return successResponse(res, "Packages retrieved.", { provider, packages });
  } catch (error) {
    return errorResponse(res, error.message);
  }
}

export async function buyCable(req, res) {
  try {
    const result = await buyCableService(req.user.id, req.body);
    return successResponse(res, result.message, result.data);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
}

export async function getCableSubscriptionHistory(req, res) {
  try {
    const history = await getCableHistory(req.user.id, {
      page: parseInt(req.query.page || 1),
      limit: parseInt(req.query.limit || 20),
    });
    return successResponse(res, "Cable history retrieved.", history);
  } catch (error) {
    return errorResponse(res, error.message);
  }
}