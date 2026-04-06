// src/lib/api.ts
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || "";
      if (!url.includes("/login") && !url.includes("/register") && !url.includes("/health")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const registerUser = (data: { username: string; email: string; password: string; full_name?: string }) =>
  api.post("/register", data);

export const loginUser = (data: { username: string; password: string }) =>
  api.post("/login", data);

export const getMe = () => api.get("/me");

export const logoutUser = () => api.post("/logout");

// Analysis
export const analyzeImage = (imageBase64: string) =>
  api.post("/analyze", { image: imageBase64 });

// NEW: Live analysis with face mapping
export const analyzeLive = (imageBase64: string) =>
  api.post("/analyze-live", { image: imageBase64 });

export const getHistory = (limit?: number, offset?: number) =>
  api.get("/history", { params: { limit, offset } });

export const getStats = () => api.get("/stats");

// Feedback
export const submitFeedback = (data: { rating: number; comment?: string }) =>
  api.post("/feedback", data);

// Admin
export const adminLogin = (data: { username: string; password: string }) =>
  api.post("/admin/login", data);

export const getAdminStats = () => api.get("/admin/stats");

export const getAdminUsers = () => api.get("/admin/users");

export const getAdminAnalyses = () => api.get("/admin/analyses");

export const getAdminFeedback = () => api.get("/admin/feedback");

export const deleteAdminUser = (id: number) => api.delete(`/admin/users/${id}`);

export const deleteAdminAnalysis = (id: number) => api.delete(`/admin/analyses/${id}`);

export const deleteAdminFeedback = (id: number) => api.delete(`/admin/feedback/${id}`);

export default api;