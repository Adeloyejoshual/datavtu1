import { errorResponse } from "../utils/response.js";
import { NETWORKS } from "../config/constants.js";

export function validateBuyData(req, res, next) {
  const { network, phone, plan_code, amount } = req.body;
  const errors = [];

  const validNetworks = Object.values(NETWORKS);
  if (!network || !validNetworks.includes(network.toLowerCase())) {
    errors.push(`Network must be one of: ${validNetworks.join(", ")}`);
  }

  if (!phone || !/^(\+234|0)[789]\d{9}$/.test(phone)) {
    errors.push("Valid Nigerian phone number is required.");
  }

  if (!plan_code || plan_code.trim().length === 0) {
    errors.push("Data plan code is required.");
  }

  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
    errors.push("Valid amount is required.");
  }

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed.", 400, errors);
  }

  req.body.network = network.toLowerCase();
  req.body.phone = phone.trim();
  req.body.plan_code = plan_code.trim();
  req.body.amount = parseFloat(amount);

  next();
}

export function validateBuyAirtime(req, res, next) {
  const { network, phone, amount } = req.body;
  const errors = [];

  const validNetworks = Object.values(NETWORKS);
  if (!network || !validNetworks.includes(network.toLowerCase())) {
    errors.push(`Network must be one of: ${validNetworks.join(", ")}`);
  }

  if (!phone || !/^(\+234|0)[789]\d{9}$/.test(phone)) {
    errors.push("Valid Nigerian phone number is required.");
  }

  if (!amount || isNaN(amount) || parseFloat(amount) < 50) {
    errors.push("Minimum airtime amount is ₦50.");
  }

  if (parseFloat(amount) > 50000) {
    errors.push("Maximum airtime amount is ₦50,000.");
  }

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed.", 400, errors);
  }

  req.body.network = network.toLowerCase();
  req.body.phone = phone.trim();
  req.body.amount = parseFloat(amount);

  next();
}