import { errorResponse } from "../utils/response.js";
import { BETTING_PLATFORMS } from "../config/constants.js";

export function validateVerifyBettingId(req, res, next) {
  const { platform, customer_id } = req.body;
  const errors = [];

  const validPlatforms = Object.values(BETTING_PLATFORMS);

  if (!platform || !validPlatforms.includes(platform.toLowerCase())) {
    errors.push(
      `Platform must be one of: ${validPlatforms.join(", ")}`
    );
  }

  if (!customer_id || customer_id.trim().length < 3) {
    errors.push("Valid betting customer ID is required.");
  }

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed.", 400, errors);
  }

  req.body.platform = platform.toLowerCase();
  req.body.customer_id = customer_id.trim();

  next();
}

export function validateFundBetting(req, res, next) {
  const { platform, customer_id, amount } = req.body;
  const errors = [];

  const validPlatforms = Object.values(BETTING_PLATFORMS);

  if (!platform || !validPlatforms.includes(platform.toLowerCase())) {
    errors.push(
      `Platform must be one of: ${validPlatforms.join(", ")}`
    );
  }

  if (!customer_id || customer_id.trim().length < 3) {
    errors.push("Valid betting customer ID is required.");
  }

  if (!amount || isNaN(amount) || parseFloat(amount) < 100) {
    errors.push("Minimum betting fund amount is ₦100.");
  }

  if (parseFloat(amount) > 500000) {
    errors.push("Maximum betting fund amount is ₦500,000.");
  }

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed.", 400, errors);
  }

  req.body.platform = platform.toLowerCase();
  req.body.customer_id = customer_id.trim();
  req.body.amount = parseFloat(amount);

  next();
}