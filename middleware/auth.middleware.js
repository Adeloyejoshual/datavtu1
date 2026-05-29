import { verifyToken } from "../utils/jwt.js";
import { query } from "../database/db.js";
import { errorResponse } from "../utils/response.js";

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, "Access denied. No token provided.", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return errorResponse(res, "Invalid or expired token.", 401);
    }

    // Verify user still exists
    const result = await query(
      "SELECT id, email, phone, first_name, last_name, role, is_verified FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, "User not found.", 401);
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return errorResponse(res, "Authentication failed.", 401);
  }
}