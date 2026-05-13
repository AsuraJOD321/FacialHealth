// src/components/Navbar.tsx
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Activity, User, Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <Activity className="h-6 w-6" /> FaceHealth
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">Dashboard</Link>
          <Link to="/analysis"  className="text-sm font-medium hover:text-primary transition-colors">Analysis</Link>
          <Link to="/history"   className="text-sm font-medium hover:text-primary transition-colors">History</Link>
          <Link to="/feedback"  className="text-sm font-medium hover:text-primary transition-colors">Feedback</Link>
          <Link to="/profile"   className="text-sm font-medium hover:text-primary transition-colors p-1.5 hover:bg-primary/10 rounded-lg">
            <User className="h-4 w-4" />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t px-4 pb-4 space-y-1">
          <Link to="/dashboard" className="block py-2.5 text-sm font-medium" onClick={() => setMobileOpen(false)}>Dashboard</Link>
          <Link to="/analysis"  className="block py-2.5 text-sm font-medium" onClick={() => setMobileOpen(false)}>Analysis</Link>
          <Link to="/history"   className="block py-2.5 text-sm font-medium" onClick={() => setMobileOpen(false)}>History</Link>
          <Link to="/feedback"  className="block py-2.5 text-sm font-medium" onClick={() => setMobileOpen(false)}>Feedback</Link>
          <Link to="/profile"   className="block py-2.5 text-sm font-medium" onClick={() => setMobileOpen(false)}>Profile</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
