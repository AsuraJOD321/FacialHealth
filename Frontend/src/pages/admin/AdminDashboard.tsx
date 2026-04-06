import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAdminStats, getAdminUsers, getAdminAnalyses, getAdminFeedback,
  deleteAdminUser, deleteAdminAnalysis, deleteAdminFeedback
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CardSkeleton, TableSkeleton } from "@/components/LoadingSkeleton";
import { Users, BarChart3, MessageSquare, Activity, Trash2, Search, LogOut, Eye, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#22c55e", "#3b82f6", "#f97316", "#ef4444", "#a855f7"];

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  created_at: string;
}

interface Analysis {
  id: number;
  user_id: number;
  username?: string;
  skin_prediction: string;
  left_eye_prediction: string;
  right_eye_prediction: string;
  health_score: number;
  created_at: string;
}

interface FeedbackItem {
  id: number;
  user_id: number;
  username?: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Stats {
  total_users: number;
  total_analyses: number;
  average_health_score: number;
  total_feedback: number;
  average_rating: number;
}

const getEyeDisplayName = (prediction: string) => {
  if (prediction === "Darkcircle") return "Dark Circle";
  if (prediction === "Conjunctivitis") return "Red Eye";
  if (prediction === "Normal") return "Normal";
  return prediction || "—";
};

const getEyeIcon = (prediction: string) => {
  if (prediction === "Darkcircle") return "🌙";
  if (prediction === "Conjunctivitis") return "👁️";
  if (prediction === "Normal") return "✅";
  return "—";
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUsers, setSearchUsers] = useState("");
  const [searchAnalyses, setSearchAnalyses] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, analysesRes, feedbackRes] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
        getAdminAnalyses(),
        getAdminFeedback()
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data.users || usersRes.data || []);
      setAnalyses(analysesRes.data.analyses || analysesRes.data || []);
      setFeedback(feedbackRes.data.feedback || feedbackRes.data || []);
    } catch (error) {
      console.error("Failed to load admin data:", error);
      toast({ title: "Error", description: "Failed to load dashboard data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const adminToken = localStorage.getItem("admin_token");
    if (!adminToken) {
      navigate("/admin/login");
      return;
    }
    loadData();
  }, [navigate]);

  const handleDeleteUser = async (id: number) => {
    try {
      await deleteAdminUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast({ title: "User deleted", description: "User has been removed" });
      loadData();
    } catch (error) {
      toast({ title: "Failed", description: "Could not delete user", variant: "destructive" });
    }
  };

  const handleDeleteAnalysis = async (id: number) => {
    try {
      await deleteAdminAnalysis(id);
      setAnalyses(prev => prev.filter(a => a.id !== id));
      toast({ title: "Analysis deleted" });
      loadData();
    } catch (error) {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  const handleDeleteFeedback = async (id: number) => {
    try {
      await deleteAdminFeedback(id);
      setFeedback(prev => prev.filter(f => f.id !== id));
      toast({ title: "Feedback deleted" });
      loadData();
    } catch (error) {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  const filteredUsers = users.filter(u => 
    (u.username || "").toLowerCase().includes(searchUsers.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchUsers.toLowerCase())
  );

  const filteredAnalyses = analyses.filter(a => 
    JSON.stringify(a).toLowerCase().includes(searchAnalyses.toLowerCase())
  );

  const skinDist = analyses.reduce((acc: any, a: any) => {
    const condition = a.skin_prediction || "Unknown";
    acc[condition] = (acc[condition] || 0) + 1;
    return acc;
  }, {});
  const skinChartData = Object.entries(skinDist).map(([name, value]) => ({ name, value }));

  const eyeDist = analyses.reduce((acc: any, a: any) => {
    const left = a.left_eye_prediction || "Unknown";
    const right = a.right_eye_prediction || "Unknown";
    acc[left] = (acc[left] || 0) + 1;
    acc[right] = (acc[right] || 0) + 1;
    return acc;
  }, {});
  const eyeChartData = Object.entries(eyeDist).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
          </div>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-2 font-display font-bold text-lg">
            <Activity className="h-5 w-5 text-primary" /> 
            <span>Admin Panel</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold">{stats?.total_users || users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Analyses</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold">{stats?.total_analyses || analyses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Health Score</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold">
                {stats?.average_health_score ? Number(stats.average_health_score).toFixed(1) : "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Feedback</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold">{stats?.total_feedback || feedback.length}</div>
            </CardContent>
          </Card>
        </div>

        {(skinChartData.length > 0 || eyeChartData.length > 0) && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {skinChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> Skin Condition Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={skinChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {skinChartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            {eyeChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" /> Eye Condition Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={eyeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {eyeChartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="analyses">Analyses</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users..." 
                value={searchUsers} 
                onChange={e => setSearchUsers(e.target.value)} 
                className="pl-10" 
              />
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">No users found</TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.full_name || "—"}</TableCell>
                        <TableCell>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the user and all their analysis data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="analyses">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search analyses..." 
                value={searchAnalyses} 
                onChange={e => setSearchAnalyses(e.target.value)} 
                className="pl-10" 
              />
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Skin</TableHead>
                    <TableHead>Left Eye</TableHead>
                    <TableHead>Right Eye</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnalyses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">No analyses found</TableCell>
                    </TableRow>
                  ) : (
                    filteredAnalyses.map((analysis) => (
                      <TableRow key={analysis.id}>
                        <TableCell>{analysis.username || analysis.user_id || "—"}</TableCell>
                        <TableCell className="capitalize">{analysis.skin_prediction || "—"}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            {getEyeIcon(analysis.left_eye_prediction)} {getEyeDisplayName(analysis.left_eye_prediction)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            {getEyeIcon(analysis.right_eye_prediction)} {getEyeDisplayName(analysis.right_eye_prediction)}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-primary">{analysis.health_score || "—"}</TableCell>
                        <TableCell>{new Date(analysis.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Analysis?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteAnalysis(analysis.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedback.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">No feedback found</TableCell>
                    </TableRow>
                  ) : (
                    feedback.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.username || item.user_id || "Anonymous"}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            {item.rating} ★
                          </span>
                        </TableCell>
                        <TableCell className="max-w-md truncate">{item.comment || "—"}</TableCell>
                        <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Feedback?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteFeedback(item.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;