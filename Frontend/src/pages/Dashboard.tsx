// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getStats, getHistory } from "@/lib/api";
import { motion } from "framer-motion";

const SKIN_DISPLAY: Record<string, string> = {
  'Acne': 'Acne', 'Blackheads': 'Blackheads', 'Dark-Spots': 'Dark Spots',
  'Dry-Skin': 'Dry Skin', 'Enlarged-Pores': 'Enlarged Pores', 'Eyebags': 'Eyebags',
  'Oily-Skin': 'Oily Skin', 'Skin-Redness': 'Skin Redness', 'Whiteheads': 'Whiteheads',
  'Wrinkles': 'Fine Lines', 'Normal': 'Normal Skin',
};

const SKIN_ICON: Record<string, string> = {
  'Acne': '🔴', 'Blackheads': '⚫', 'Dark-Spots': '🌑', 'Dry-Skin': '💧',
  'Enlarged-Pores': '🔬', 'Eyebags': '😴', 'Oily-Skin': '✨', 'Skin-Redness': '🌹',
  'Whiteheads': '⚪', 'Wrinkles': '📐', 'Normal': '✅',
};

const getScoreColor = (s: number) =>
  s >= 80 ? '#16a34a' : s >= 60 ? '#ca8a04' : s >= 40 ? '#ea580c' : '#dc2626';
const getScoreLabel = (s: number) =>
  s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Fair' : 'Needs Care';
const getScoreGrad  = (s: number) =>
  s >= 80 ? 'from-emerald-500 to-teal-600'
  : s >= 60 ? 'from-amber-400 to-orange-500'
  : s >= 40 ? 'from-orange-500 to-red-500'
  : 'from-red-500 to-rose-600';

const up = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: 'easeOut' },
});

export default function Dashboard() {
  const { user } = useAuth();
  const [stats,   setStats]   = useState<any>(null);
  const [recent,  setRecent]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getStats(), getHistory(5, 0)])
      .then(([s, h]) => {
        setStats(s.data);
        setRecent((h.data.history || []).slice(0, 5));
      })
      .catch(() => {
        setStats({ total_analyses: 0, average_health_score: 0 });
        setRecent([]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const avg       = stats?.average_health_score ?? 0;
  const total     = stats?.total_analyses ?? 0;
  const firstName = user.full_name?.split(' ')[0] || user.username;
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetEmoji = hour < 12 ? '☀️' : hour < 17 ? '👋' : '🌙';

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-7">

        {/* Header */}
        <motion.div {...up(0)} className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-slate-400 text-sm mb-1 flex items-center gap-1">
              {greeting} <span>{greetEmoji}</span>
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Welcome, <span className="text-teal-600">{firstName}</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Here's your skin health overview</p>
          </div>
          <Link to="/analysis">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-2xl font-semibold text-sm shadow-lg shadow-teal-100 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Analysis
            </button>
          </Link>
        </motion.div>

        {/* Score + total */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <motion.div {...up(0.08)} className="sm:col-span-2">
            {loading ? (
              <div className="h-44 rounded-3xl bg-slate-200 animate-pulse" />
            ) : avg > 0 ? (
              <div className={`rounded-3xl bg-gradient-to-br ${getScoreGrad(avg)} p-6 flex items-center justify-between h-44 relative overflow-hidden shadow-md`}>
                <div className="absolute -right-8 -top-8 w-44 h-44 bg-white/10 rounded-full pointer-events-none" />
                <div className="absolute right-4 -bottom-14 w-56 h-56 bg-white/10 rounded-full pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-white/70 text-sm font-medium mb-1">Average Health Score</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-6xl font-black text-white leading-none">{avg.toFixed(0)}</span>
                    <span className="text-white/60 text-xl font-semibold">/100</span>
                  </div>
                  <span className="inline-block mt-3 px-3 py-1 bg-white/20 backdrop-blur text-white rounded-full text-xs font-semibold">
                    {getScoreLabel(avg)}
                  </span>
                </div>
                <div className="relative z-10 w-24 h-24 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="white" strokeWidth="3"
                      strokeDasharray={`${avg * 0.942} ${100}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{avg.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl bg-gradient-to-br from-slate-200 to-slate-300 p-6 h-44 flex flex-col justify-center">
                <p className="text-slate-500 font-semibold mb-1">No data yet</p>
                <p className="text-slate-400 text-sm">Complete your first analysis to see your score</p>
              </div>
            )}
          </motion.div>

          <motion.div {...up(0.12)}>
            <div className="bg-white rounded-3xl border border-slate-100 p-6 h-44 flex flex-col justify-between shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-4xl font-black text-slate-900">{loading ? '—' : total}</p>
                <p className="text-sm text-slate-400 mt-0.5">Total Analyses</p>
                {total > 0 && (
                  <Link to="/history">
                    <p className="text-xs text-teal-600 font-semibold mt-2 hover:underline">View all →</p>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Analyses */}
        <motion.div {...up(0.18)}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Analyses</h2>
            <Link to="/history">
              <span className="text-sm text-teal-600 hover:text-teal-700 font-semibold transition-colors">View all →</span>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[72px] bg-white rounded-2xl border border-slate-100 animate-pulse" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center shadow-sm">
              <div className="text-5xl mb-4">🧴</div>
              <p className="font-semibold text-slate-700 mb-1">No analyses yet</p>
              <p className="text-slate-400 text-sm mb-5">Upload a photo to get your first skin health report</p>
              <Link to="/analysis">
                <button className="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors">
                  Start Analysis
                </button>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm divide-y divide-slate-50">
              {recent.map((a) => (
                <Link key={a.id} to={`/results/${a.id}`}>
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group cursor-pointer">
                    <div className="w-11 h-11 rounded-2xl bg-slate-50 group-hover:bg-teal-50 flex items-center justify-center text-xl shrink-0 transition-colors">
                      {SKIN_ICON[a.skin_prediction] ?? '🔍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">
                        {SKIN_DISPLAY[a.skin_prediction] || a.skin_prediction || 'Analysis'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(a.created_at).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-xl font-black" style={{ color: getScoreColor(a.health_score ?? 0) }}>
                          {a.health_score ?? '—'}
                        </span>
                        <span className="text-slate-300 text-sm">/100</span>
                      </div>
                      <svg className="w-4 h-4 text-slate-200 group-hover:text-teal-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
