// controllers/auth.controller.js

import { query, withTransaction } from "../database/db.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";
import { generateToken } from "../utils/jwt.js";
import { successResponse, errorResponse } from "../utils/response.js";
import logger from "../utils/logger.js";
import { payFirstPurchaseBonus } from "../services/referral.service.js";

/* -------------------------------------------------------------------------- */
/*                            HELPER FUNCTIONS                                 */
/* -------------------------------------------------------------------------- */

// Generate unique referral code
function generateReferralCode(firstName = "USR") {
  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `${firstName.substring(0, 3).toUpperCase()}${random}`;
}

/* -------------------------------------------------------------------------- */
/*                                 REGISTER                                   */
/* -------------------------------------------------------------------------- */

export async function register(req, res) {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      password,
      referral_code,
    } = req.body;

    /* ---------------------------- VALIDATIONS ---------------------------- */

    if (
      !first_name ||
      !last_name ||
      !email ||
      !phone ||
      !password
    ) {
      return errorResponse(
        res,
        "All required fields must be provided.",
        400
      );
    }

    /* ------------------------ CHECK EXISTING USER ------------------------ */

    const existingUser = await query(
      `
        SELECT id
        FROM users
        WHERE email = $1
           OR phone = $2
      `,
      [email.toLowerCase(), phone]
    );

    if (existingUser.rows.length > 0) {
      return errorResponse(
        res,
        "User with this email or phone already exists.",
        409
      );
    }

    /* -------------------------- REFERRAL CHECK --------------------------- */

    let referredBy = null;

    if (referral_code) {
      const referrer = await query(
        `
          SELECT id
          FROM users
          WHERE referral_code = $1
        `,
        [referral_code.toUpperCase()]
      );

      if (referrer.rows.length > 0) {
        referredBy = referrer.rows[0].id;
      }
    }

    /* --------------------------- HASH PASSWORD --------------------------- */

    const password_hash = await hashPassword(password);

    /* ----------------------- GENERATE REFERRAL CODE ---------------------- */

    const userReferralCode = generateReferralCode(first_name);

    /* ------------------- CREATE USER + WALLET TXN ------------------------ */

    const newUser = await withTransaction(async (client) => {
      // Create user
      const userResult = await client.query(
        `
          INSERT INTO users (
            first_name,
            last_name,
            email,
            phone,
            password_hash,
            referral_code,
            referred_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING
            id,
            first_name,
            last_name,
            email,
            phone,
            role,
            is_verified,
            referral_code,
            created_at
        `,
        [
          first_name,
          last_name,
          email.toLowerCase(),
          phone,
          password_hash,
          userReferralCode,
          referredBy,
        ]
      );

      const user = userResult.rows[0];

      // Create wallet
      await client.query(
        `
          INSERT INTO wallets (user_id, balance)
          VALUES ($1, 0.00)
        `,
        [user.id]
      );

      return user;
    });

    /* ----------------------------- JWT TOKEN ----------------------------- */

    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    logger.info("New user registered", {
      userId: newUser.id,
      email: newUser.email,
    });

    return successResponse(
      res,
      "Registration successful.",
      {
        user: newUser,
        token,
      },
      201
    );
  } catch (error) {
    logger.error("Registration failed", {
      error: error.message,
    });

    return errorResponse(
      res,
      error.message || "Registration failed.",
      500
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                   LOGIN                                    */
/* -------------------------------------------------------------------------- */

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    /* ---------------------------- FIND USER ------------------------------ */

    const result = await query(
      `
        SELECT
          id,
          first_name,
          last_name,
          email,
          phone,
          password_hash,
          role,
          is_verified,
          referral_code
        FROM users
        WHERE email = $1
      `,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return errorResponse(
        res,
        "Invalid email or password.",
        401
      );
    }

    const user = result.rows[0];

    /* ------------------------- VERIFY PASSWORD --------------------------- */

    const isValidPassword = await comparePassword(
      password,
      user.password_hash
    );

    if (!isValidPassword) {
      return errorResponse(
        res,
        "Invalid email or password.",
        401
      );
    }

    /* --------------------------- GET WALLET ------------------------------ */

    const walletResult = await query(
      `
        SELECT balance
        FROM wallets
        WHERE user_id = $1
      `,
      [user.id]
    );

    /* ----------------------------- JWT TOKEN ----------------------------- */

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    /* ----------------------- REMOVE PASSWORD HASH ------------------------ */

    delete user.password_hash;

    logger.info("User logged in", {
      userId: user.id,
    });

    return successResponse(res, "Login successful.", {
      user: {
        ...user,
        wallet_balance:
          walletResult.rows[0]?.balance || 0,
      },
      token,
    });
  } catch (error) {
    logger.error("Login failed", {
      error: error.message,
    });

    return errorResponse(
      res,
      error.message || "Login failed.",
      500
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                               GET PROFILE                                  */
/* -------------------------------------------------------------------------- */

export async function getProfile(req, res) {
  try {
    const userId = req.user.id;

    const userResult = await query(
      `
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          u.role,
          u.is_verified,
          u.referral_code,
          u.created_at,
          w.balance AS wallet_balance
        FROM users u
        JOIN wallets w
          ON w.user_id = u.id
        WHERE u.id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return errorResponse(
        res,
        "User not found.",
        404
      );
    }

    /* -------------------------- REFERRAL COUNT --------------------------- */

    const referralCountResult = await query(
      `
        SELECT COUNT(*) AS total
        FROM users
        WHERE referred_by = $1
      `,
      [userId]
    );

    const profile = {
      ...userResult.rows[0],
      total_referrals: parseInt(
        referralCountResult.rows[0].total
      ),
    };

    return successResponse(
      res,
      "Profile retrieved successfully.",
      profile
    );
  } catch (error) {
    logger.error("Get profile failed", {
      error: error.message,
    });

    return errorResponse(
      res,
      error.message || "Failed to fetch profile.",
      500
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                              CHANGE PASSWORD                               */
/* -------------------------------------------------------------------------- */

export async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body;

    const userId = req.user.id;

    /* -------------------------- GET USER HASH ---------------------------- */

    const userResult = await query(
      `
        SELECT password_hash
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return errorResponse(
        res,
        "User not found.",
        404
      );
    }

    /* ------------------------ VERIFY OLD PASSWORD ------------------------ */

    const isValidPassword = await comparePassword(
      current_password,
      userResult.rows[0].password_hash
    );

    if (!isValidPassword) {
      return errorResponse(
        res,
        "Current password is incorrect.",
        400
      );
    }

    /* -------------------------- HASH NEW PASS ---------------------------- */

    const newPasswordHash = await hashPassword(
      new_password
    );

    /* --------------------------- UPDATE PASS ----------------------------- */

    await query(
      `
        UPDATE users
        SET
          password_hash = $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [newPasswordHash, userId]
    );

    logger.info("Password changed", {
      userId,
    });

    return successResponse(
      res,
      "Password changed successfully."
    );
  } catch (error) {
    logger.error("Change password failed", {
      error: error.message,
    });

    return errorResponse(
      res,
      error.message || "Password change failed.",
      500
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                        FIRST PURCHASE REFERRAL BONUS                       */
/* -------------------------------------------------------------------------- */

// Example usage inside:
// buyDataService.js
// buyAirtimeService.js
// buyCableService.js
// electricityService.js

export async function handleFirstPurchaseBonus(
  userId,
  transactionId
) {
  try {
    const purchaseCount = await query(
      `
        SELECT COUNT(*) AS total
        FROM transactions
        WHERE user_id = $1
          AND type IN (
            'data_purchase',
            'airtime_purchase',
            'cable_purchase',
            'electricity_purchase',
            'betting_purchase'
          )
          AND status = 'success'
      `,
      [userId]
    );

    const totalPurchases = parseInt(
      purchaseCount.rows[0].total
    );

    // First successful purchase
    if (totalPurchases === 1) {
      await payFirstPurchaseBonus(
        userId,
        transactionId
      );

      logger.info("First purchase bonus paid", {
        userId,
        transactionId,
      });
    }
  } catch (error) {
    logger.error("First purchase bonus failed", {
      error: error.message,
      userId,
      transactionId,
    });
  }
}