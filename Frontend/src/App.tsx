// src/App.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { getAdminStats } from "@/lib/api";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

import Landing       from "./pages/Landing";
import Login         from "./pages/Login";
import Register      from "./pages/Register";
import Dashboard     from "./pages/Dashboard";
import Analysis      from "./pages/Analysis";
import Results       from "./pages/Results";
import HistoryPage   from "./pages/HistoryPage";
import Profile       from "./pages/Profile";
import Feedback      from "./pages/Feedback";
import AdminLogin    from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Unauthorized  from "./pages/Unauthorized";
import NotFound      from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const UserLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return null;
  return <><Navbar />{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAdmin,  setIsAdmin]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const token = localStorage.getItem("admin_token");
      if (!token) { setIsAdmin(false); setLoading(false); return; }
      try {
        await getAdminStats();
        setIsAdmin(true);
      } catch {
        localStorage.removeItem("admin_token");
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return isAdmin ? <>{children}</> : <Navigate to="/admin/login" replace />;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/"            element={<Landing />} />
      <Route path="/login"       element={!user ? <Login />    : <Navigate to="/dashboard" replace />} />
      <Route path="/register"    element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="/dashboard" element={<ProtectedRoute><UserLayout><Dashboard /></UserLayout></ProtectedRoute>} />
      <Route path="/analysis"  element={<ProtectedRoute><UserLayout><Analysis /></UserLayout></ProtectedRoute>} />
      <Route path="/results/:id" element={<ProtectedRoute><UserLayout><Results /></UserLayout></ProtectedRoute>} />
      <Route path="/history"   element={<ProtectedRoute><UserLayout><HistoryPage /></UserLayout></ProtectedRoute>} />
      <Route path="/profile"   element={<ProtectedRoute><UserLayout><Profile /></UserLayout></ProtectedRoute>} />
      <Route path="/feedback"  element={<ProtectedRoute><UserLayout><Feedback /></UserLayout></ProtectedRoute>} />

      <Route path="/admin/login"      element={<AdminLogin />} />
      <Route path="/admin"            element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/dashboard"  element={<AdminRoute><AdminDashboard /></AdminRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
