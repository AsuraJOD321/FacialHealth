// src/pages/Results.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Sparkles, ArrowLeft, CheckCircle } from "lucide-react";
import { getResult } from "@/lib/api";
import { toast } from "@/hooks/use-toast";


const SKIN_DISPLAY: Record<string, string> = {
  'Acne':           'Acne',
  'Blackheads':     'Blackheads',
  'Dark-Spots':     'Dark Spots',
  'Dry-Skin':       'Dry Skin',
  'Enlarged-Pores': 'Enlarged Pores',
  'Eyebags':        'Eyebags',
  'Oily-Skin':      'Oily Skin',
  'Skin-Redness':   'Skin Redness',
  'Whiteheads':     'Whiteheads',
  'Wrinkles':       'Fine Lines & Wrinkles',
  'Normal':         'Normal Skin',
};

const SKIN_ICON: Record<string, string> = {
  'Acne':           '🔴',
  'Blackheads':     '⚫',
  'Dark-Spots':     '🌑',
  'Dry-Skin':       '💧',
  'Enlarged-Pores': '🔬',
  'Eyebags':        '😴',
  'Oily-Skin':      '✨',
  'Skin-Redness':   '🌹',
  'Whiteheads':     '⚪',
  'Wrinkles':       '📐',
  'Normal':         '✅',
};

const SKIN_COLOR: Record<string, string> = {
  'Acne':           '#dc0000',
  'Blackheads':     '#444444',
  'Dark-Spots':     '#8c2878',
  'Dry-Skin':       '#c87832',
  'Enlarged-Pores': '#32b4c8',
  'Eyebags':        '#c850b4',
  'Oily-Skin':      '#c8c800',
  'Skin-Redness':   '#dc3200',
  'Whiteheads':     '#aaaaaa',
  'Wrinkles':       '#b46432',
  'Normal':         '#22c55e',
};

// Frontend grouped recommendations (mirrors backend)
const CONDITION_TIPS: Record<string, string[]> = {
  'Acne':           ['Use a gentle salicylic acid cleanser', 'Avoid touching your face', 'Use non-comedogenic moisturizer'],
  'Blackheads':     ['Exfoliate 2-3 times per week', 'Use clay masks weekly', 'Use a pore-cleansing strip once a week'],
  'Dark-Spots':     ['Apply vitamin C serum daily', 'Use broad-spectrum SPF 30+ sunscreen', 'Consider niacinamide for brightening'],
  'Dry-Skin':       ['Use a hydrating moisturizer twice daily', 'Drink at least 8 glasses of water per day', 'Avoid hot showers and harsh soaps'],
  'Enlarged-Pores': ['Use a clay mask weekly', 'Apply a niacinamide serum', 'Cleanse thoroughly but gently twice daily'],
  'Eyebags':        ['Get 7-8 hours of sleep per night', 'Apply cold compresses in the morning', 'Reduce salt intake to minimize fluid retention'],
  'Oily-Skin':      ['Use oil-free non-comedogenic products', 'Cleanse your face twice daily', 'Use a light water-based moisturizer'],
  'Skin-Redness':   ['Use fragrance-free gentle products', 'Apply aloe vera gel to soothe irritation', 'Avoid extreme temperatures and spicy food'],
  'Whiteheads':     ['Use a gentle exfoliating cleanser', 'Apply salicylic acid or benzoyl peroxide', 'Avoid squeezing or picking whiteheads'],
  'Wrinkles':       ['Use a retinol cream at night', 'Moisturize daily with hyaluronic acid', 'Wear SPF 30+ sunscreen every day'],
  'Normal':         ['Maintain your current skincare routine', 'Use sunscreen daily', 'Stay hydrated'],
};

const getScoreColor = (s: number) =>
  s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : s >= 40 ? 'text-orange-600' : 'text-red-600';

const Results = () => {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [result,          setResult]         = useState<any>(null);
  const [loading,         setLoading]        = useState(true);
  const [annotatedImage,  setAnnotatedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        if (id === 'latest') {
          const stored = sessionStorage.getItem('analysis_result');
          const image  = sessionStorage.getItem('analysis_image');
          if (stored) {
            const parsed = JSON.parse(stored);
            setResult(parsed);
            if (parsed.annotated_image)      setAnnotatedImage(parsed.annotated_image);
            else if (image)                  setAnnotatedImage(image);
          } else {
            toast({ title: 'No result found', variant: 'destructive' });
            navigate('/history');
          }
        } else {
          const res  = await getResult(parseInt(id as string));
          const item = res.data.result;
          setResult(item);
          // Show saved annotated image from DB when viewing history
          if (item.annotated_image) setAnnotatedImage(item.annotated_image);
        }
      } catch (err: any) {
        toast({ title: err.response?.data?.error || 'Failed to load result', variant: 'destructive' });
        navigate('/history');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [id, navigate]);

  if (loading) return (
    <div className="container mx-auto px-4 py-8 text-center">
      <div className="animate-pulse text-muted-foreground">Loading results...</div>
    </div>
  );

  if (!result) return (
    <div className="container mx-auto px-4 py-16 text-center">
      <p className="text-muted-foreground">Result not found.</p>
      <Link to="/analysis"><Button className="mt-4">New Analysis</Button></Link>
    </div>
  );

  const healthScore   = result.health_score   ?? result.overall_health_score ?? 0;
  const healthStatus  = result.health_status  ??
    (healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs Attention');
  const skinCondition = result.skin_prediction ?? result.skin_analysis?.predicted_class ?? 'Normal';
  const confidence    = result.skin_confidence ?? result.skin_analysis?.confidence ?? 0;
  const detections    = result.detections || result.skin_analysis?.detections || [];

  // Build grouped recommendations from detections
  const groupedRecs: { condition: string; display: string; tips: string[] }[] =
    result.grouped_recommendations ||
    (detections.length > 0
      ? detections.map((d: any) => ({
          condition: d.class,
          display:   SKIN_DISPLAY[d.class] || d.class,
          tips:      CONDITION_TIPS[d.class] || ['Maintain healthy skincare habits'],
        }))
      : [{
          condition: skinCondition,
          display:   SKIN_DISPLAY[skinCondition] || skinCondition,
          tips:      CONDITION_TIPS[skinCondition] || ['Maintain healthy skincare habits'],
        }]
    );

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/history"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Analysis Results</h1>
      </div>

      {/* Annotated image — shows for both fresh analysis AND history */}
      {annotatedImage && (
        <Card className="mb-6 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span>🎯</span> AI Detection Map
              <span className="text-xs text-muted-foreground font-normal">
                — colored boxes show detected conditions
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative">
              <img
                src={annotatedImage}
                alt="Analyzed face with condition markers"
                className="w-full rounded-b-lg"
              />
              {detections.length > 0 && (
                <div className="absolute top-2 right-2 bg-black/70 rounded-lg p-2 space-y-1">
                  {detections.map((det: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-white">
                      <div className="w-3 h-3 rounded-sm shrink-0"
                           style={{ backgroundColor: SKIN_COLOR[det.class] || '#fff' }} />
                      <span>{SKIN_DISPLAY[det.class] || det.class}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Score */}
      <Card className="mb-6">
        <CardContent className="p-6 text-center">
          <div className={`text-5xl font-bold mb-2 ${getScoreColor(healthScore)}`}>{healthScore}/100</div>
          <Progress value={healthScore} className="h-3 mb-2" />
          <p className="text-lg font-medium">{healthStatus}</p>
          {result.created_at && (
            <p className="text-sm text-muted-foreground mt-2">
              Analyzed: {new Date(result.created_at).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Primary Condition */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Skin Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Primary Condition</p>
              <p className="text-xl font-semibold flex items-center gap-2 mt-1">
                <span className="text-2xl">{SKIN_ICON[skinCondition] ?? '⚠️'}</span>
                {SKIN_DISPLAY[skinCondition] ?? skinCondition}
              </p>
            </div>
            {confidence > 0 && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-2xl font-bold" style={{ color: SKIN_COLOR[skinCondition] }}>
                  {Math.round(confidence * 100)}%
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Detected Conditions */}
      {detections.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              All Detected Conditions
              <Badge variant="secondary">{detections.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detections.map((det: any, idx: number) => {
              const color = SKIN_COLOR[det.class] || '#888';
              const conf  = Math.round(det.confidence * 100);
              return (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border"
                  style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{SKIN_ICON[det.class] ?? '⚠️'}</span>
                    <span className="font-medium">{SKIN_DISPLAY[det.class] ?? det.class}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${conf}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">{conf}%</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Grouped Recommendations — one section per condition */}
      {groupedRecs.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" /> Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {groupedRecs.map((group, gIdx) => (
              <div key={gIdx}>
                {/* Condition header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{SKIN_ICON[group.condition] ?? '⚠️'}</span>
                  <span className="font-semibold text-sm"
                        style={{ color: SKIN_COLOR[group.condition] || '#666' }}>
                    For {group.display}:
                  </span>
                </div>
                {/* Tips for this condition */}
                <ul className="space-y-1.5 pl-2">
                  {group.tips.map((tip: string, tIdx: number) => (
                    <li key={tIdx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
                {/* Divider between groups */}
                {gIdx < groupedRecs.length - 1 && <hr className="mt-4 border-border" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Link to="/analysis"><Button>New Analysis</Button></Link>
        <Link to="/history"><Button variant="outline">View History</Button></Link>
      </div>
    </div>
  );
};

export default Results;
