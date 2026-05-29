import { errorResponse } from "../utils/response.js";

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return errorResponse(res, "Access denied. Admin privileges required.", 403);
  }
  next();
}

export function requireAgent(req, res, next) {
  if (!req.user || !["admin", "agent"].includes(req.user.role)) {
    return errorResponse(res, "Access denied. Agent privileges required.", 403);
  }
  next();
}