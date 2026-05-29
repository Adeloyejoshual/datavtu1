import api from "./axios.js";

export const authApi = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getProfile: () => api.get("/auth/profile"),
  changePassword: (data) => api.put("/auth/change-password", data),
};