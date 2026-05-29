import api from "./axios.js";

export const referralApi = {
  getStats: () => api.get("/referrals/stats"),
  getCommissions: () => api.get("/referrals/commissions"),
  getCommissionHistory: (params) =>
    api.get("/referrals/commissions/history", { params }),
};