import { query } from "../database/db.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";
import { generateToken } from "../utils/jwt.js";
import { createWallet } from "../services/wallet.service.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { withTransaction } from "../database/db.js";
import logger from "../utils/logger.js";

// Generate unique referral code
function generateReferralCode(firstName) {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${firstName.substring(0, 3).toUpperCase()}${random}`;
}

// Register
export async function register(req, res) {
  try {
    const { first_name, last_name, email, phone, password, referral_code } = req.body;

    // Check existing user
    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1 OR phone = $2",
      [email, phone]
    );

    if (existingUser.rows.length > 0) {
      return errorResponse(res, "User with this email or phone already exists.", 409);
    }

    // Check referral code if provided
    let referredBy = null;
    if (referral_code) {
      const referrer = await query(
        "SELECT id FROM users WHERE referral_code = $1",
        [referral_code.toUpperCase()]
      );
      if (referrer.rows.length > 0) {
        referredBy = referrer.rows[0].id;
      }
    }

    // Hash password
    const password_hash = await hashPassword(password);
    const userReferralCode = generateReferralCode(first_name);

    // Create user and wallet in transaction
    const result = await withTransaction(async (client) => {
      const userResult = await client.query(
        `INSERT INTO users (first_name, last_name, email, phone, password_hash, referral_code, referred_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, first_name, last_name, email, phone, role, referral_code, created_at`,
        [first_name, last_name, email, phone, password_hash, userReferralCode, referredBy]
      );

      const user = userResult.rows[0];

      // Create wallet
      await client.query(
        "INSERT INTO wallets (user_id, balance) VALUES ($1, 0.00)",
        [user.id]
      );

      return user;
    });

    // Generate JWT
    const token = generateToken({
      userId: result.id,
      email: result.email,
      role: result.role,
    });

    logger.info("New user registered", { userId: result.id, email });

    return successResponse(res, "Registration successful.", {
      user: result,
      token,
    }, 201);

  } catch (error) {
    logger.error("Registration failed", { error: error.message });
    return errorResponse(res, error.message);
  }
}

// Login
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const result = await query(
      `SELECT id, first_name, last_name, email, phone, password_hash, role, is_verified, referral_code
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, "Invalid email or password.", 401);
    }

    const user = result.rows[0];

    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return errorResponse(res, "Invalid email or password.", 401);
    }

    // Get wallet balance
    const walletResult = await query(
      "SELECT balance FROM wallets WHERE user_id = $1",
      [user.id]
    );

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Remove password hash from response
    delete user.password_hash;

    logger.info("User logged in", { userId: user.id });

    return successResponse(res, "Login successful.", {
      user: {
        ...user,
        wallet_balance: walletResult.rows[0]?.balance || 0,
      },
      token,
    });

  } catch (error) {
    logger.error("Login failed", { error: error.message });
    return errorResponse(res, error.message);
  }
}

// Get profile
export async function getProfile(req, res) {
  try {
    const userId = req.user.id;

    const userResult = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role,
              u.is_verified, u.referral_code, u.created_at,
              w.balance as wallet_balance
       FROM users u
       JOIN wallets w ON w.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return errorResponse(res, "User not found.", 404);
    }

    // Count referrals
    const referralCount = await query(
      "SELECT COUNT(*) FROM users WHERE referred_by = $1",
      [userId]
    );

    const userData = {
      ...userResult.rows[0],
      total_referrals: parseInt(referralCount.rows[0].count),
    };

    return successResponse(res, "Profile retrieved.", userData);

  } catch (error) {
    return errorResponse(res, error.message);
  }
}

// Change password
export async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    const userResult = await query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId]
    );

    const isValid = await comparePassword(current_password, userResult.rows[0].password_hash);
    if (!isValid) {
      return errorResponse(res, "Current password is incorrect.", 400);
    }

    const newHash = await hashPassword(new_password);

    await query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [newHash, userId]
    );

    logger.info("Password changed", { userId });

    return successResponse(res, "Password changed successfully.");

  } catch (error) {
    return errorResponse(res, error.message);
  }
}