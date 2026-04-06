// src/pages/HistoryPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHistory } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Eye, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

const HistoryPage = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getHistory(50, 0);
        setHistory(res.data.history || []);
      } catch (error) {
        console.error("Failed to fetch history:", error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/dashboard">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="font-display text-3xl font-bold">Analysis History</h1>
      </div>

      {history.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No analyses found. Start your first analysis!</p>
          <Link to="/analysis"><Button className="mt-4">New Analysis</Button></Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <Link key={item.id} to={`/results/${item.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-medium capitalize">Skin: {item.skin_prediction || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><Eye className="h-3 w-3" /> L: {item.left_eye_prediction || "N/A"}</div>
                        <div className="flex items-center gap-1"><Eye className="h-3 w-3" /> R: {item.right_eye_prediction || "N/A"}</div>
                        <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(item.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <div className={`text-2xl font-bold ${getScoreColor(item.health_score || 0)}`}>{item.health_score || "—"}</div>
                      <p className="text-xs text-muted-foreground">Health Score</p>
                    </div>
                  </div>
                  <Progress value={item.health_score || 0} className="mt-3 h-1.5" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;