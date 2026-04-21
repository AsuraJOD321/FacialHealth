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
      if (!url.includes("/login") && !url.includes("/register")) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("admin_token");
      window.location.href = "/admin/login";
    }
    return Promise.reject(error);
  }
);

export const registerUser = (data: any) => api.post("/register", data);
export const loginUser = (data: any) => api.post("/login", data);
export const getMe = () => api.get("/me");
export const logoutUser = () => api.post("/logout");
export const analyzeImage = (imageBase64: string) => api.post("/analyze", { image: imageBase64 });
export const getHistory = (limit?: number, offset?: number) => api.get("/history", { params: { limit, offset } });
export const getResult = (id: number) => api.get(`/history/${id}`);
export const getStats = () => api.get("/stats");
export const submitFeedback = (data: any) => api.post("/feedback", data);

export const adminRegister = (data: any) => adminApi.post("/admin/register", data);
export const adminLogin = (data: any) => adminApi.post("/admin/login", data);
export const getAdminStats = () => adminApi.get("/admin/stats");
export const getAdminUsers = () => adminApi.get("/admin/users");
export const getAdminAnalyses = () => adminApi.get("/admin/analyses");
export const getAdminFeedback = () => adminApi.get("/admin/feedback");
export const deleteAdminUser = (id: number) => adminApi.delete(`/admin/users/${id}`);
export const deleteAdminAnalysis = (id: number) => adminApi.delete(`/admin/analyses/${id}`);
export const deleteAdminFeedback = (id: number) => adminApi.delete(`/admin/feedback/${id}`);

export default api;