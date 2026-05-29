import { errorResponse } from "../utils/response.js";
import { MIN_WALLET_FUND, MAX_WALLET_FUND } from "../config/constants.js";

export function validateFundWallet(req, res, next) {
  const { amount } = req.body;
  const errors = [];

  if (!amount || isNaN(amount) || parseFloat(amount) < MIN_WALLET_FUND) {
    errors.push(`Minimum funding amount is ₦${MIN_WALLET_FUND}.`);
  }

  if (parseFloat(amount) > MAX_WALLET_FUND) {
    errors.push(`Maximum funding amount is ₦${MAX_WALLET_FUND.toLocaleString()}.`);
  }

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed.", 400, errors);
  }

  req.body.amount = parseFloat(amount);

  next();
}

export function validateTransfer(req, res, next) {
  const { recipient_email, amount, pin } = req.body;
  const errors = [];

  if (!recipient_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient_email)) {
    errors.push("Valid recipient email is required.");
  }

  if (!amount || isNaN(amount) || parseFloat(amount) < 50) {
    errors.push("Minimum transfer amount is ₦50.");
  }

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed.", 400, errors);
  }

  req.body.amount = parseFloat(amount);
  req.body.recipient_email = recipient_email.trim().toLowerCase();

  next();
}