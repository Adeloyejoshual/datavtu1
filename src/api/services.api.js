import api from "./axios.js";

export const servicesApi = {
  // Data
  getDataPlans: (network) => api.get(`/data/plans/${network}`),
  buyData: (data) => api.post("/data/buy", data),

  // Airtime
  detectNetwork: (phone) => api.get(`/airtime/detect-network/${phone}`),
  buyAirtime: (data) => api.post("/airtime/buy", data),
  getAirtimeHistory: (params) => api.get("/airtime/history", { params }),

  // Electricity
  verifyMeter: (data) => api.post("/electricity/verify-meter", data),
  buyElectricity: (data) => api.post("/electricity/buy", data),

  // Cable TV
  verifySmartCard: (data) => api.post("/cable/verify-card", data),
  getCablePackages: (provider) => api.get(`/cable/packages/${provider}`),
  buyCable: (data) => api.post("/cable/buy", data),
  getCableHistory: (params) => api.get("/cable/history", { params }),

  // Betting
  verifyBettingCustomer: (data) => api.post("/betting/verify-customer", data),
  fundBetting: (data) => api.post("/betting/fund", data),
  getBettingHistory: (params) => api.get("/betting/history", { params }),
};