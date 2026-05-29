import api from "./axios.js";

export const adminApi = {
  // Dashboard
  getDashboard: () => api.get("/admin/dashboard"),

  // Users
  getUsers: (params) => api.get("/admin/users", { params }),
  getUserDetail: (id) => api.get(`/admin/users/${id}`),
  creditWallet: (data) => api.post("/admin/credit-wallet", data),
  updateUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  suspendUser: (id) => api.patch(`/admin/users/${id}/suspend`),

  // Transactions
  getTransactions: (params) => api.get("/admin/transactions", { params }),
  getTransaction: (id) => api.get(`/admin/transactions/${id}`),
  reverseTransaction: (id) => api.post(`/admin/transactions/${id}/reverse`),

  // Analytics
  getRevenue: (params) => api.get("/admin/analytics/revenue", { params }),
  getServiceStats: () => api.get("/admin/analytics/services"),
  getUserGrowth: () => api.get("/admin/analytics/users"),
};