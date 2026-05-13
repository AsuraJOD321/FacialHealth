// src/pages/admin/AdminDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAdminStats, getAdminUsers, getAdminAnalyses, getAdminFeedback,
  deleteAdminUser, deleteAdminAnalysis, deleteAdminFeedback
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const SKIN_DISPLAY: Record<string, string> = {
  'Acne': 'Acne', 'Blackheads': 'Blackheads', 'Dark-Spots': 'Dark Spots',
  'Dry-Skin': 'Dry Skin', 'Enlarged-Pores': 'Enlarged Pores', 'Eyebags': 'Eyebags',
  'Oily-Skin': 'Oily Skin', 'Skin-Redness': 'Skin Redness', 'Whiteheads': 'Whiteheads',
  'Wrinkles': 'Fine Lines', 'Normal': 'Normal',
};

const getScoreColor = (s: number) =>
  s >= 80 ? '#16a34a' : s >= 60 ? '#ca8a04' : s >= 40 ? '#ea580c' : '#dc2626';

function ConfirmModal({ title, message, onConfirm, onCancel }: any) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 text-center mb-2">{title}</h3>
        <p className="text-slate-500 text-sm text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats,     setStats]     = useState<any>(null);
  const [users,     setUsers]     = useState<any[]>([]);
  const [analyses,  setAnalyses]  = useState<any[]>([]);
  const [feedback,  setFeedback]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState<'users' | 'analyses' | 'feedback'>('users');
  const [search,    setSearch]    = useState('');
  const [confirm,   setConfirm]   = useState<{ type: string; id: number } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, u, a, f] = await Promise.all([
        getAdminStats(), getAdminUsers(), getAdminAnalyses(), getAdminFeedback()
      ]);
      setStats(s.data);
      setUsers(u.data.users || []);
      setAnalyses(a.data.analyses || []);
      setFeedback(f.data.feedback || []);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
      }
      toast({ title: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) { navigate('/admin/login'); return; }
    loadData();
  }, []);

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      if (confirm.type === 'user')     await deleteAdminUser(confirm.id);
      if (confirm.type === 'analysis') await deleteAdminAnalysis(confirm.id);
      if (confirm.type === 'feedback') await deleteAdminFeedback(confirm.id);
      toast({ title: 'Deleted successfully' });
      loadData();
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    } finally {
      setConfirm(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const statCards = [
    { label: 'Total Users',    value: stats?.total_users    ?? 0, icon: '👥', color: 'bg-blue-50   text-blue-600'   },
    { label: 'Total Analyses', value: stats?.total_analyses ?? 0, icon: '🔬', color: 'bg-teal-50   text-teal-600'   },
    { label: 'Avg Health',     value: stats?.average_health_score ? `${Number(stats.average_health_score).toFixed(1)}` : '—', icon: '💚', color: 'bg-green-50  text-green-600'  },
    { label: 'Feedback',       value: stats?.total_feedback ?? 0, icon: '💬', color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {confirm && (
        <ConfirmModal
          title={`Delete ${confirm.type}?`}
          message="This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Top navbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-none">FaceHealth</p>
              <p className="text-xs text-slate-400 mt-0.5">Admin Console</p>
            </div>
          </div>
          <button onClick={() => { localStorage.removeItem('admin_token'); navigate('/admin/login'); }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Monitor users, analyses, and feedback</p>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, i) => (
            <motion.div key={card.label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className={`w-10 h-10 rounded-xl ${card.color.split(' ')[0]} flex items-center justify-center text-xl mb-3`}>
                {card.icon}
              </div>
              <p className={`text-2xl font-black ${card.color.split(' ')[1]}`}>
                {loading ? '—' : card.value}
              </p>
              <p className="text-xs text-slate-500 mt-1">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Avg Rating if has feedback */}
        {stats?.average_rating > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">Average User Rating</p>
              <p className="text-amber-600 text-xs">{Number(stats.average_rating).toFixed(1)} / 5 from {stats.total_feedback} reviews</p>
            </div>
            <span className="ml-auto text-3xl font-black text-amber-500">{Number(stats.average_rating).toFixed(1)}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
            {(['users', 'analyses', 'feedback'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {t}
                <span className={`ml-2 px-1.5 py-0.5 rounded-md text-xs ${
                  tab === t ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {t === 'users' ? users.length : t === 'analyses' ? analyses.length : feedback.length}
                </span>
              </button>
            ))}
          </div>

          {/* Search (users only) */}
          {tab === 'users' && (
            <div className="relative mb-4">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by username or email..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" />
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <>
                {/* Users Table */}
                {tab === 'users' && (
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['User', 'Email', 'Full Name', 'Registered', ''].map(h => (
                          <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">No users found</td></tr>
                      ) : filteredUsers.map((u: any) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                                {(u.username || 'U')[0].toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-800 text-sm">{u.username}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">{u.email}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{u.full_name || '—'}</td>
                          <td className="px-5 py-4 text-sm text-slate-400">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button onClick={() => setConfirm({ type: 'user', id: u.id })}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Analyses Table */}
                {tab === 'analyses' && (
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['User', 'Condition', 'Health Score', 'Date', ''].map(h => (
                          <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {analyses.length === 0 ? (
                        <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">No analyses found</td></tr>
                      ) : analyses.map((a: any) => (
                        <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4">
                            <span className="text-sm font-medium text-slate-800">{a.username || `User #${a.user_id}`}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                              {SKIN_DISPLAY[a.skin_prediction] || a.skin_prediction || '—'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-bold" style={{ color: getScoreColor(a.health_score ?? 0) }}>
                              {a.health_score ?? '—'}/100
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-400">
                            {a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button onClick={() => setConfirm({ type: 'analysis', id: a.id })}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Feedback Table */}
                {tab === 'feedback' && (
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['User', 'Rating', 'Comment', 'Date', ''].map(h => (
                          <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {feedback.length === 0 ? (
                        <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">No feedback yet</td></tr>
                      ) : feedback.map((f: any) => (
                        <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4 text-sm font-medium text-slate-800">
                            {f.username || `User #${f.user_id}`}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(s => (
                                <svg key={s} className={`w-4 h-4 ${s <= f.rating ? 'text-amber-400' : 'text-slate-200'}`}
                                  fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600 max-w-xs truncate">
                            {f.comment || <span className="text-slate-300 italic">No comment</span>}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-400">
                            {f.created_at ? new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button onClick={() => setConfirm({ type: 'feedback', id: f.id })}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
