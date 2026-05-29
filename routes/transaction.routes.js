import express from "express";
import { getTransaction, requeryTransaction } from "../controllers/transaction.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/:reference", authenticate, getTransaction);
router.get("/:reference/requery", authenticate, requeryTransaction);

export default router;