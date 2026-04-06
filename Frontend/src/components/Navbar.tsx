import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { logoutUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Activity, User, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch { /* ignore */ }
    logout();
    toast({ title: "Logged out successfully" });
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl text-primary">
          <Activity className="h-6 w-6" />
          FaceHealth
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
              <Link to="/analysis" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Analysis</Link>
              <Link to="/history" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">History</Link>
              <Link to="/feedback" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Feedback</Link>
              <Link to="/profile" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <User className="h-4 w-4" />
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
              <Link to="/register"><Button size="sm">Register</Button></Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t px-4 pb-4 space-y-2">
          {user ? (
            <>
              <Link to="/dashboard" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <Link to="/analysis" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>Analysis</Link>
              <Link to="/history" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>History</Link>
              <Link to="/feedback" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>Feedback</Link>
              <Link to="/profile" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>Profile</Link>
              <button className="block py-2 text-sm text-destructive" onClick={() => { handleLogout(); setMobileOpen(false); }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>Login</Link>
              <Link to="/register" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
