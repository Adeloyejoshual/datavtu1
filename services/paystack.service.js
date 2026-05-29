import axios from "axios";
import config from "../config/env.js";
import logger from "../utils/logger.js";

const paystackApi = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${config.paystack.secretKey}`,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Initialize payment
export async function initializePayment(email, amount, reference, metadata = {}) {
  try {
    const response = await paystackApi.post("/transaction/initialize", {
      email,
      amount: Math.round(amount * 100), // Paystack expects kobo
      reference,
      metadata,
      callback_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/verify`,
    });

    return response.data.data;
  } catch (error) {
    logger.error("Paystack initialization failed", { error: error.message });
    throw new Error("Unable to initialize payment.");
  }
}

// Verify payment
export async function verifyPayment(reference) {
  try {
    const response = await paystackApi.get(`/transaction/verify/${reference}`);
    return response.data.data;
  } catch (error) {
    logger.error("Paystack verification failed", { reference, error: error.message });
    throw new Error("Unable to verify payment.");
  }
}

// Create dedicated virtual account
export async function createVirtualAccount(customerData) {
  try {
    // First create customer
    const customerResponse = await paystackApi.post("/customer", {
      email: customerData.email,
      first_name: customerData.first_name,
      last_name: customerData.last_name,
      phone: customerData.phone,
    });

    const customerCode = customerResponse.data.data.customer_code;

    // Create dedicated virtual account
    const accountResponse = await paystackApi.post("/dedicated_account", {
      customer: customerCode,
      preferred_bank: "wema-bank", // or "test-bank" for sandbox
    });

    return accountResponse.data.data;
  } catch (error) {
    logger.error("Virtual account creation failed", { error: error.message });
    throw new Error("Unable to create virtual account.");
  }
}