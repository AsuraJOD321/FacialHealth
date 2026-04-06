import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
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

const UserLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <Navbar />
    {children}
  </>
);

// Protected Admin Route Component
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
          setIsAdmin(false);
          localStorage.removeItem("admin_token");
        }
      } catch (error) {
        console.error("Admin auth error:", error);
        localStorage.removeItem("admin_token");
        setIsAdmin(false);
      }
      setLoading(false);
    };
    checkAdmin();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<UserLayout><Landing /></UserLayout>} />
            <Route path="/login" element={<UserLayout><Login /></UserLayout>} />
            <Route path="/register" element={<UserLayout><Register /></UserLayout>} />
            <Route path="/unauthorized" element={<UserLayout><Unauthorized /></UserLayout>} />

            {/* Protected User Routes */}
            <Route path="/dashboard" element={
              <UserLayout>
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </UserLayout>
            } />
            <Route path="/analysis" element={
              <UserLayout>
                <ProtectedRoute>
                  <Analysis />
                </ProtectedRoute>
              </UserLayout>
            } />
            <Route path="/results/:id" element={
              <UserLayout>
                <ProtectedRoute>
                  <Results />
                </ProtectedRoute>
              </UserLayout>
            } />
            <Route path="/history" element={
              <UserLayout>
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              </UserLayout>
            } />
            <Route path="/profile" element={
              <UserLayout>
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              </UserLayout>
            } />
            <Route path="/feedback" element={
              <UserLayout>
                <ProtectedRoute>
                  <Feedback />
                </ProtectedRoute>
              </UserLayout>
            } />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            <Route path="/admin/dashboard" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />

            {/* 404 Page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;