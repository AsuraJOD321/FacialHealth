// src/App.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Analysis from "./pages/Analysis";
import Results from "./pages/Results";
import HistoryPage from "./pages/HistoryPage";
import Profile from "./pages/Profile";
import Feedback from "./pages/Feedback";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Layout with navbar for authenticated pages
const UserLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get("http://localhost:5000/api/admin/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.admin) {
          setIsAdmin(true);
        } else {
          localStorage.removeItem("admin_token");
          setIsAdmin(false);
        }
      } catch (error) {
        localStorage.removeItem("admin_token");
        setIsAdmin(false);
      }
      setLoading(false);
    };
    checkAdmin();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes - Only for non-logged in users */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      {/* Home Page - Shows Landing with features (available to everyone, but with Get Started button) */}
      <Route path="/" element={<Landing />} />
      
      {/* Protected User Routes - Only when logged in */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <UserLayout><Dashboard /></UserLayout>
        </ProtectedRoute>
      } />
      <Route path="/analysis" element={
        <ProtectedRoute>
          <UserLayout><Analysis /></UserLayout>
        </ProtectedRoute>
      } />
      <Route path="/results/:id" element={
        <ProtectedRoute>
          <UserLayout><Results /></UserLayout>
        </ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute>
          <UserLayout><HistoryPage /></UserLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <UserLayout><Profile /></UserLayout>
        </ProtectedRoute>
      } />
      <Route path="/feedback" element={
        <ProtectedRoute>
          <UserLayout><Feedback /></UserLayout>
        </ProtectedRoute>
      } />
      
      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      
      {/* 404 Page */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;