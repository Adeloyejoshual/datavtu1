import api from "./axios.js";

export const walletApi = {
  getBalance: () => api.get("/wallet/balance"),
  fundWallet: (data) => api.post("/wallet/fund", data),
  verifyFunding: (reference) => api.get(`/wallet/verify/${reference}`),
  getTransactions: (params) => api.get("/wallet/transactions", { params }),
  transfer: (data) => api.post("/wallet/transfer", data),
};