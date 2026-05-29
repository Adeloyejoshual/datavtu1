import { errorResponse } from "../utils/response.js";

export function validateRegister(req, res, next) {
  const { first_name, last_name, email, phone, password } = req.body;
  const errors = [];

  if (!first_name || first_name.trim().length < 2) {
    errors.push("First name must be at least 2 characters.");
  }

  if (!last_name || last_name.trim().length < 2) {
    errors.push("Last name must be at least 2 characters.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Valid email is required.");
  }

  if (!phone || !/^(\+234|0)[789]\d{9}$/.test(phone)) {
    errors.push("Valid Nigerian phone number is required.");
  }

  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters.");
  }

  if (password && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.push("Password must contain uppercase, lowercase, and a number.");
  }

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed.", 400, errors);
  }

  // Sanitize inputs
  req.body.first_name = first_name.trim();
  req.body.last_name = last_name.trim();
  req.body.email = email.trim().toLowerCase();
  req.body.phone = phone.trim();

  next();
}

export function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Valid email is required.");
  }

  if (!password) {
    errors.push("Password is required.");
  }

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed.", 400, errors);
  }

  req.body.email = email.trim().toLowerCase();

  next();
}

export function validateChangePassword(req, res, next) {
  const { current_password, new_password } = req.body;
  const errors = [];

  if (!current_password) {
    errors.push("Current password is required.");
  }

  if (!new_password || new_password.length < 8) {
    errors.push("New password must be at least 8 characters.");
  }

  if (new_password && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(new_password)) {
    errors.push("New password must contain uppercase, lowercase, and a number.");
  }

  if (current_password === new_password) {
    errors.push("New password must be different from current password.");
  }

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed.", 400, errors);
  }

  next();
}