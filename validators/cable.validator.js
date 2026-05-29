import { errorResponse } from "../utils/response.js";
import { CABLE_PROVIDERS } from "../config/constants.js";

export function validateVerifySmartCard(req, res, next) {
  const { provider, smart_card_number } = req.body;
  const errors = [];

  const validProviders = Object.values(CABLE_PROVIDERS);

  if (!provider || !validProviders.includes(provider.toLowerCase())) {
    errors.push(
      `Provider must be one of: ${validProviders.join(", ")}`
    );
  }

  if (!smart_card_number || smart_card_number.trim().length < 5) {
    errors.push("Valid smart card number is required.");
  }

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed.", 400, errors);
  }

  req.body.provider = provider.toLowerCase();
  req.body.smart_card_number = smart_card_number.trim();

  next();
}

export function validateBuyCable(req, res, next) {
  const { provider, smart_card_number, package_code, amount } = req.body;
  const errors = [];

  const validProviders = Object.values(CABLE_PROVIDERS);

  if (!provider || !validProviders.includes(provider.toLowerCase())) {
    errors.push(
      `Provider must be one of: ${validProviders.join(", ")}`
    );
  }

  if (!smart_card_number || smart_card_number.trim().length < 5) {
    errors.push("Valid smart card number is required.");
  }

  if (!package_code || package_code.trim().length === 0) {
    errors.push("Package code is required.");
  }

  if (!amount || isNaN(amount) || parseFloat(amount) < 100) {
    errors.push("Valid amount is required. Minimum is ₦100.");
  }

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed.", 400, errors);
  }

  req.body.provider = provider.toLowerCase();
  req.body.smart_card_number = smart_card_number.trim();
  req.body.package_code = package_code.trim();
  req.body.amount = parseFloat(amount);

  next();
}