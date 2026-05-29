import logger from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
  logger.error("Unhandled error:", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || "unauthenticated",
  });

  // PostgreSQL unique violation
  if (err.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "Duplicate entry. This record already exists.",
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === "23503") {
    return res.status(400).json({
      success: false,
      message: "Referenced record does not exist.",
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired.",
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === "production"
    ? "Internal server error"
    : err.message;

  return res.status(statusCode).json({
    success: false,
    message,
  });
}

// 404 handler
export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found.`,
  });
}