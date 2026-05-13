// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
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
  const [user, setUser]       = useState<User | null>(null);
  const [token, setToken]     = useState<string | null>(localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);

  // Run once on mount — restores session from stored token
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) { setIsLoading(false); return; }
    getMe()
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const response = await apiLogin({ username, password });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const register = async (data: { username: string; email: string; password: string; full_name?: string }) => {
    await apiRegister(data);
    await login(data.username, data.password);
  };

  const logout = async () => {
    try { await apiLogout(); } catch {}
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
