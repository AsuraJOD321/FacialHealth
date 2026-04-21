// src/pages/Results.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Sparkles, ArrowLeft, CheckCircle } from "lucide-react";
import { getResult } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        if (id === "latest") {
          const stored = sessionStorage.getItem("analysis_result");
          if (stored) {
            setResult(JSON.parse(stored));
          } else {
            toast({ title: "No result found", variant: "destructive" });
            navigate("/history");
          }
        } else {
          const response = await getResult(parseInt(id as string));
          setResult(response.data.result);
        }
      } catch (error: any) {
        console.error("Failed to fetch result:", error);
        toast({ title: error.response?.data?.error || "Failed to load result", variant: "destructive" });
        navigate("/history");
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="animate-pulse">Loading results...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Result not found.</p>
        <Link to="/analysis"><Button className="mt-4">New Analysis</Button></Link>
      </div>
    );
  }

  const healthScore = result.health_score || result.overall_health_score || 0;
  const healthStatus = result.health_status || 
    (healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Fair" : "Needs Attention");
  
  const skinCondition = result.skin_prediction || result.skin_analysis?.predicted_class || "normal";
  const confidence = result.skin_confidence || result.skin_analysis?.confidence || 0;

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
    return map[condition] || condition;
  };

  const getConditionIcon = (condition: string) => {
    const icons: Record<string, string> = {
      acne: '🔴',
      blackheads: '⚫',
      darkspots: '🌑',
      dry: '💧',
      hyperpigmentation: '🌙',
      normal: '✅',
      oily: '✨'
    };
    return icons[condition] || '⚠️';
  };

  const getRecommendations = (condition: string) => {
    const recs: Record<string, string[]> = {
      acne: ["Use gentle cleanser with salicylic acid", "Avoid touching your face", "Use non-comedogenic moisturizer"],
      blackheads: ["Use salicylic acid cleanser", "Exfoliate 2-3 times per week", "Use clay masks"],
      darkspots: ["Use vitamin C serum", "Apply sunscreen daily", "Consider niacinamide"],
      dry: ["Use hydrating moisturizer", "Drink plenty of water", "Use gentle products"],
      hyperpigmentation: ["Use sunscreen daily", "Consider vitamin C serum", "Use niacinamide"],
      oily: ["Use oil-free products", "Cleanse twice daily", "Use salicylic acid"],
      normal: ["Maintain current routine", "Use sunscreen daily", "Stay hydrated"]
    };
    return recs[condition] || ["Maintain healthy skincare habits", "Use sunscreen daily"];
  };

  const recommendations = result.recommendations || getRecommendations(skinCondition);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/history">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Analysis Results</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6 text-center">
          <div className={`text-5xl font-bold mb-2 ${getScoreColor(healthScore)}`}>
            {healthScore}/100
          </div>
          <Progress value={healthScore} className="h-3 mb-2" />
          <p className="text-lg font-medium">{healthStatus}</p>
          {result.created_at && (
            <p className="text-sm text-muted-foreground mt-2">
              Analyzed on: {new Date(result.created_at).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Skin Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Condition</p>
              <p className="text-xl font-semibold flex items-center gap-2">
                <span className="text-2xl">{getConditionIcon(skinCondition)}</span>
                {getSkinDisplay(skinCondition)}
              </p>
            </div>
            {confidence > 0 && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-lg font-medium">{Math.round(confidence * 100)}%</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {result.detected_issues && result.detected_issues.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Detected Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.detected_issues.map((issue: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg mb-2">
                <span className="flex items-center gap-2">
                  <span className="text-xl">{getConditionIcon(issue.condition)}</span>
                  <span className="font-medium capitalize">{getSkinDisplay(issue.condition)}</span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(issue.confidence * 100)}% confidence
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Link to="/analysis">
          <Button>New Analysis</Button>
        </Link>
        <Link to="/history">
          <Button variant="outline">View History</Button>
        </Link>
      </div>
    </div>
  );
};

export default Results;