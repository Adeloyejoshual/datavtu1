import express from "express";
import { register, login, getProfile, changePassword } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimiter.middleware.js";
import { validateRegister, validateLogin, validateChangePassword } from "../validators/auth.validator.js";

const router = express.Router();

router.post("/register", authLimiter, validateRegister, register);
router.post("/login", authLimiter, validateLogin, login);
router.get("/profile", authenticate, getProfile);
router.put("/change-password", authenticate, validateChangePassword, changePassword);

export default router;