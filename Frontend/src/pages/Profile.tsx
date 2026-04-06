import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, LogOut } from "lucide-react";
import { logoutUser } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [changingPassword, setChangingPassword] = useState(false);

  const handleLogout = async () => {
    try { await logoutUser(); } catch {}
    logout();
    toast({ title: "Logged out" });
    navigate("/login");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-8">Profile</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <User className="h-5 w-5 text-primary" /> Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">Full Name</Label>
              <p className="font-medium">{user?.full_name || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Username</Label>
              <p className="font-medium">{user?.username || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="font-medium">{user?.email || "—"}</p>
            </div>
          </CardContent>
        </Card>

        {changingPassword && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="font-display text-lg">Change Password</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="flex gap-2">
                <Button size="sm">Update</Button>
                <Button size="sm" variant="ghost" onClick={() => setChangingPassword(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          {!changingPassword && (
            <Button variant="outline" onClick={() => setChangingPassword(true)}>Change Password</Button>
          )}
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
