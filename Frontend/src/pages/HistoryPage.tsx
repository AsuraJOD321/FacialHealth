// src/pages/HistoryPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHistory } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const SKIN_DISPLAY: Record<string, string> = {
  'Acne':           'Acne',
  'Blackheads':     'Blackheads',
  'Dark Spots':     'Dark Spots',
  'Dry Skin':       'Dry Skin',
  'Enlarged Pores': 'Enlarged Pores',
  'Eyebags':        'Eyebags',
  'Oily Skin':      'Oily Skin',
  'Skin Redness':   'Skin Redness',
  'Whiteheads':     'Whiteheads',
  'Wrinkles':       'Fine Lines & Wrinkles',
  'Normal':         'Normal',
};

const SKIN_ICON: Record<string, string> = {
  'Acne':           '🔴',
  'Blackheads':     '⚫',
  'Dark Spots':     '🌑',
  'Dry Skin':       '💧',
  'Enlarged Pores': '🔬',
  'Eyebags':        '😴',
  'Oily Skin':      '✨',
  'Skin Redness':   '🌹',
  'Whiteheads':     '⚪',
  'Wrinkles':       '📐',
  'Normal':         '✅',
};

const getScoreColor = (s: number) =>
  s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : s >= 40 ? 'text-orange-600' : 'text-red-600';

const HistoryPage = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory(50, 0)
      .then(res => { setHistory(res.data.history || []); setTotal(res.data.total || 0); })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/dashboard"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Analysis History</h1>
      </div>
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/dashboard"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-3xl font-bold">Analysis History</h1>
          {total > 0 && (
            <p className="text-sm text-muted-foreground">{total} total {total === 1 ? 'analysis' : 'analyses'}</p>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No analyses found. Start your first analysis!</p>
          <Link to="/analysis"><Button>New Analysis</Button></Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <Link key={item.id} to={`/results/${item.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-lg">{SKIN_ICON[item.skin_prediction] ?? '🔍'}</span>
                        <span className="font-medium truncate">
                          {SKIN_DISPLAY[item.skin_prediction] || item.skin_prediction || 'Normal'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="text-right min-w-[80px] shrink-0">
                      <div className={`text-2xl font-bold ${getScoreColor(item.health_score ?? 0)}`}>
                        {item.health_score ?? '—'}
                      </div>
                      <p className="text-xs text-muted-foreground">Health Score</p>
                    </div>
                  </div>
                  <Progress value={item.health_score ?? 0} className="mt-3 h-1.5" />
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
