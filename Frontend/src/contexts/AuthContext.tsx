// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getMe, loginUser as apiLogin, registerUser as apiRegister, logoutUser as apiLogout } from "@/lib/api";

interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; full_name?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await getMe();
      setUser(res.data.user);
    } catch (error) {
      console.error("Load user failed:", error);
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (username: string, password: string) => {
    const response = await apiLogin({ username, password });
    const { token, user } = response.data;
    localStorage.setItem("token", token);
    setToken(token);
    setUser(user);
  };

  const register = async (data: { username: string; email: string; password: string; full_name?: string }) => {
    await apiRegister(data);
    await login(data.username, data.password);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error("Logout error:", error);
    }
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};