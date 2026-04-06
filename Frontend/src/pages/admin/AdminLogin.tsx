// src/pages/admin/AdminLogin.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: "Fill all fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await adminLogin({ username, password });
      // Store admin token separately from user token
      localStorage.setItem("admin_token", res.data.token);
      toast({ title: "Admin login successful" });
      navigate("/admin");
    } catch (err: any) {
      toast({ 
        title: err.response?.data?.error || "Login failed", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-secondary/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="font-display text-2xl">Admin Panel</CardTitle>
          <CardDescription>Sign in with admin credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="admin" 
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;