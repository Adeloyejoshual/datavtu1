import axios from "axios";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("vtu_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message || "Something went wrong. Try again.";

    if (error.response?.status === 401) {
      localStorage.removeItem("vtu_token");
      localStorage.removeItem("vtu_user");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (error.response?.status !== 422) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;