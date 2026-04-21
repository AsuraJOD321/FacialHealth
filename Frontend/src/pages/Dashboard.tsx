// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getStats, getHistory } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, History, PlusCircle, TrendingUp, BarChart3, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, historyRes] = await Promise.all([
          getStats(),
          getHistory(5, 0)
        ]);
        setStats(statsRes.data);
        const analyses = historyRes.data.history || [];
        setRecent(analyses.slice(0, 5));
      } catch (error: any) {
        console.error("Dashboard error:", error);
        if (error.response?.status === 401) {
          logout();
          navigate("/login");
        }
        setStats({ total_analyses: 0, average_health_score: 0 });
        setRecent([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, logout, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (!user) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getSkinDisplay = (condition: string) => {
    const map: Record<string, string> = {
      acne: "Acne",
      blackheads: "Blackheads",
      darkspots: "Dark Spots",
      dry: "Dry Skin",
      hyperpigmentation: "Hyperpigmentation",
      normal: "Normal",
      oily: "Oily Skin"
    };
    return map[condition] || condition || "Analysis";
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome, <span className="text-primary">{user?.full_name?.split(" ")[0] || user?.username}</span>
          </h1>
          <p className="text-muted-foreground">Here's your skin health overview.</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </motion.div>

      <div className="flex gap-4 mb-8">
        <Link to="/analysis">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" /> New Analysis
          </Button>
        </Link>
        <Link to="/history">
          <Button variant="outline" className="gap-2">
            <History className="h-4 w-4" /> View History
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card><CardContent className="p-6 h-32 animate-pulse bg-muted" /></Card>
          <Card><CardContent className="p-6 h-32 animate-pulse bg-muted" /></Card>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total_analyses || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Health Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getScoreColor(stats?.average_health_score || 0)}`}>
                {stats?.average_health_score ? Number(stats.average_health_score).toFixed(1) : "—"}
              </div>
              <Progress value={stats?.average_health_score || 0} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5" /> Recent Analyses
      </h2>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Card key={i}><CardContent className="p-4 h-20 animate-pulse bg-muted" /></Card>)}</div>
      ) : recent.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No analyses yet. Start your first analysis!</p>
          <Link to="/analysis"><Button className="mt-4">New Analysis</Button></Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {recent.map((analysis) => (
            <Link key={analysis.id} to={`/results/${analysis.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{getSkinDisplay(analysis.skin_prediction)}</p>
                    <p className="text-sm text-muted-foreground">{new Date(analysis.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xl font-bold ${getScoreColor(analysis.health_score || 0)}`}>
                      {analysis.health_score || "—"}
                    </span>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;