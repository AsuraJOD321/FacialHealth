// src/pages/Profile.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { changePassword, getStats } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [changingPw, setChangingPw] = useState(false);
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [stats,      setStats]      = useState<any>(null);

  useEffect(() => {
    getStats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    toast({ title: 'Logged out successfully' });
  };

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw || !newPw) {
      toast({ title: 'Fill both fields', variant: 'destructive' }); return;
    }
    if (newPw.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      await changePassword({ current_password: currentPw, new_password: newPw });
      toast({ title: 'Password updated successfully' });
      setChangingPw(false); setCurrentPw(''); setNewPw('');
    } catch (err: any) {
      toast({ title: err.response?.data?.error || 'Failed to update password', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const initials = (user?.full_name || user?.username || 'U')
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your account and preferences</p>
        </motion.div>

        {/* Avatar + Info Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-100 p-6 mb-5">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg">
              {initials}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">{user?.full_name || user?.username}</h2>
              <p className="text-slate-500 text-sm">@{user?.username}</p>
              <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
              <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
                Active Member
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-sm text-slate-500 mb-1">Total Analyses</p>
            <p className="text-3xl font-black text-slate-900">{stats?.total_analyses ?? '—'}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-sm text-slate-500 mb-1">Avg Health Score</p>
            <p className="text-3xl font-black text-teal-600">
              {stats?.average_health_score ? Number(stats.average_health_score).toFixed(1) : '—'}
            </p>
          </div>
        </motion.div>

        {/* Account Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-100 p-6 mb-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Account Details
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Full Name',  value: user?.full_name || '—' },
              { label: 'Username',   value: user?.username  || '—' },
              { label: 'Email',      value: user?.email     || '—' },
            ].map(field => (
              <div key={field.label} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">{field.label}</span>
                <span className="text-sm font-medium text-slate-900">{field.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Change Password */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-slate-100 p-6 mb-5">
          <button
            onClick={() => setChangingPw(!changingPw)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="font-semibold text-slate-900 text-sm">Change Password</span>
            </div>
            <svg className={`w-4 h-4 text-slate-400 transition-transform ${changingPw ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {changingPw && (
            <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleChangePw} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Current Password</label>
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                  placeholder="••••••••" disabled={saving}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">New Password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder="••••••••" disabled={saving}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
                  {saving ? 'Saving...' : 'Update Password'}
                </button>
                <button type="button" onClick={() => { setChangingPw(false); setCurrentPw(''); setNewPw(''); }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-colors">
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </motion.div>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-red-50 rounded-2xl border border-red-100 p-6">
          <h3 className="font-semibold text-red-800 text-sm mb-3">Account Actions</h3>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            LogOut
          </button>
        </motion.div>

      </div>
    </div>
  );
}
