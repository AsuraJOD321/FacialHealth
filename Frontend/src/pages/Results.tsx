import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Eye, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface Issue {
  type: string;
  condition: string;
  confidence: number;
  severity?: number;
  eye?: string;
}

interface AnalysisResult {
  overall_health_score: number;
  health_status: string;
  detected_issues: Issue[];
  recommendations: string[];
  skin_analysis: any;
  left_eye: any;
  right_eye: any;
}

const Results = () => {
  const { id } = useParams();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id === "latest") {
      const stored = sessionStorage.getItem("analysis_result");
      const storedImg = sessionStorage.getItem("analysis_image");
      if (stored) {
        setResult(JSON.parse(stored));
        setImage(storedImg);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [id]);

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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getConditionIcon = (condition: string) => {
    if (condition === 'acne') return '🔴';
    if (condition === 'dry') return '💧';
    if (condition === 'oily') return '✨';
    if (condition === 'Darkcircle') return '🌙';
    if (condition === 'Conjunctivitis') return '👁️';
    if (condition === 'Normal') return '✅';
    return '⚠️';
  };

  const getConditionDisplay = (condition: string) => {
    if (condition === 'acne') return 'Acne';
    if (condition === 'dry') return 'Dry Skin';
    if (condition === 'oily') return 'Oily Skin';
    if (condition === 'Darkcircle') return 'Dark Circles';
    if (condition === 'Conjunctivitis') return 'Red Eye';
    if (condition === 'Normal') return 'Normal';
    return condition;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-8">Analysis Results</h1>

        {image && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <img src={image} alt="Analyzed" className="rounded-lg w-full max-h-64 object-contain mx-auto" />
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <div className={`text-5xl font-bold mb-2 ${getScoreColor(result.overall_health_score)}`}>
              {result.overall_health_score}/100
            </div>
            <Progress value={result.overall_health_score} className="h-3 mb-2" />
            <p className="text-lg font-medium">{result.health_status}</p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Issues Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.detected_issues.length === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>No issues detected! Your facial health looks good.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {result.detected_issues.map((issue, idx) => (
                  <div key={idx} className="border-l-4 border-orange-500 pl-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getConditionIcon(issue.condition)}</span>
                      <span className="font-semibold capitalize">
                        {issue.type === 'skin' ? 'Skin' : `${issue.eye} Eye`}: {getConditionDisplay(issue.condition)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({Math.round(issue.confidence * 100)}% confidence)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Daily Care Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Link to="/analysis">
            <Button>New Analysis</Button>
          </Link>
          <Link to="/history">
            <Button variant="outline">View History</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Results;