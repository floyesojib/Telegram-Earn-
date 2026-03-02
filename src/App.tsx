import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Users, 
  PlayCircle, 
  Trophy, 
  Settings, 
  Home, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface User {
  telegram_id: string;
  username: string;
  balance: number;
  referrals_count: number;
  level: string;
  activity_score: number;
  last_login: string;
  created_at: string;
  is_blocked: number;
}

interface Withdrawal {
  id: number;
  user_id: string;
  username?: string;
  amount: number;
  method: string;
  details: string;
  status: string;
  created_at: string;
}

// --- Telegram Mock/Real ---
const tg = (window as any).Telegram?.WebApp;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminStats, setAdminStats] = useState<any>(null);

  useEffect(() => {
    if (tg) {
      tg.expand();
      tg.ready();await fetch(`${API}/register`, {
    }const API = "https://telegram-vwyl.onrender.com";
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const initData = tg?.initData || '';
      const urlParams = new URLSearchParams(window.location.search);
      const referrer_id = urlParams.get('start');

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData
        },
        body: JSON.stringify({ referrer_id })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setUser(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const claimAd = async () => {
    try {
      const response = await fetch('/api/ads/claim', {
        method: 'POST',
        headers: { 'x-telegram-init-data': tg?.initData || '' }
      });
      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert(`Success! You earned ${data.reward} BDT`);
        fetchUser();
      }
    } catch (err) {
      alert('Failed to claim reward');
    }
  };

  const submitWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const payload = {
      amount: Number(formData.get('amount')),
      method: formData.get('method'),
      details: formData.get('details')
    };

    try {
      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-telegram-init-data': tg?.initData || '' 
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.error) alert(data.error);
      else {
        alert('Withdrawal request submitted!');
        fetchUser();
        setActiveTab('home');
      }
    } catch (err) {
      alert('Failed to submit withdrawal');
    }
  };

  const fetchAdminStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: { 'x-admin-password': adminPassword }
      });
      const data = await response.json();
      if (data.error) alert(data.error);
      else setAdminStats(data);
    } catch (err) {
      alert('Admin access failed');
    }
  };

  const handleWithdrawAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      await fetch(`/api/admin/withdraw/${action}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword 
        },
        body: JSON.stringify({ id })
      });
      fetchAdminStats();
    } catch (err) {
      alert('Action failed');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
      <h1 className="text-xl font-bold text-white mb-2">Connection Error</h1>
      <p className="text-zinc-400 mb-6">{error}</p>
      <button onClick={fetchUser} className="px-6 py-2 bg-emerald-500 text-white rounded-lg">Retry</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-24">
      {/* Header */}
      <header className="p-6 bg-zinc-900/50 border-b border-white/5 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">BDT Earning</h1>
              <p className="text-xs text-emerald-500 font-medium mt-1">@{user?.username || 'User'}</p>
            </div>
          </div>
          <button onClick={() => setAdminMode(!adminMode)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <Settings className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        <AnimatePresence mode="wait">
          {adminMode ? (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-zinc-900 p-6 rounded-2xl border border-white/5">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-500" /> Admin Panel
                </h2>
                {!adminStats ? (
                  <div className="space-y-4">
                    <input 
                      type="password" 
                      placeholder="Admin Password" 
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                    />
                    <button 
                      onClick={fetchAdminStats}
                      className="w-full bg-emerald-500 py-3 rounded-xl font-bold"
                    >
                      Login
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-800 p-4 rounded-xl">
                        <p className="text-xs text-zinc-400 uppercase tracking-wider">Total Users</p>
                        <p className="text-2xl font-bold">{adminStats.totalUsers}</p>
                      </div>
                      <div className="bg-zinc-800 p-4 rounded-xl">
                        <p className="text-xs text-zinc-400 uppercase tracking-wider">Total Payouts</p>
                        <p className="text-2xl font-bold">{adminStats.totalPayouts} ৳</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-bold mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-500" /> Pending Withdrawals
                      </h3>
                      <div className="space-y-3">
                        {adminStats.pendingWithdrawals.length === 0 && <p className="text-zinc-500 text-sm">No pending requests</p>}
                        {adminStats.pendingWithdrawals.map((w: Withdrawal) => (
                          <div key={w.id} className="bg-zinc-800 p-4 rounded-xl border border-white/5">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-bold">@{w.username}</p>
                                <p className="text-xs text-zinc-400">{w.method}: {w.details}</p>
                              </div>
                              <p className="text-emerald-500 font-bold">{w.amount} ৳</p>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleWithdrawAction(w.id, 'approve')}
                                className="flex-1 bg-emerald-500/20 text-emerald-500 py-2 rounded-lg text-sm font-bold"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleWithdrawAction(w.id, 'reject')}
                                className="flex-1 bg-red-500/20 text-red-500 py-2 rounded-lg text-sm font-bold"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeTab === 'home' ? (
            <motion.div 
              key="home"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {/* Balance Card */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-3xl shadow-xl shadow-emerald-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Wallet className="w-32 h-32" />
                </div>
                <p className="text-emerald-100/80 text-sm font-medium uppercase tracking-wider">Total Balance</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h2 className="text-4xl font-black text-white">{user?.balance.toFixed(2)}</h2>
                  <span className="text-xl font-bold text-emerald-100">BDT</span>
                </div>
                <div className="mt-6 flex gap-4">
                  <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-3">
                    <p className="text-[10px] text-emerald-100/60 uppercase">Referrals</p>
                    <p className="text-lg font-bold text-white">{user?.referrals_count}</p>
                  </div>
                  <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-3">
                    <p className="text-[10px] text-emerald-100/60 uppercase">Level</p>
                    <p className="text-lg font-bold text-white">{user?.level}</p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900 p-4 rounded-2xl border border-white/5">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3">
                    <Trophy className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-xs text-zinc-400 uppercase">Activity Score</p>
                  <p className="text-xl font-bold">{user?.activity_score}</p>
                </div>
                <div className="bg-zinc-900 p-4 rounded-2xl border border-white/5">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-xs text-zinc-400 uppercase">Joined</p>
                  <p className="text-sm font-bold mt-1">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest px-1">Earning Tasks</h3>
                <button 
                  onClick={() => setActiveTab('ads')}
                  className="w-full bg-zinc-900 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-emerald-500/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <PlayCircle className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold">Watch Ads</p>
                      <p className="text-xs text-zinc-500">Earn 2 BDT per ad</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-500" />
                </button>

                <button 
                  onClick={() => setActiveTab('referrals')}
                  className="w-full bg-zinc-900 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-emerald-500/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold">Refer Friends</p>
                      <p className="text-xs text-zinc-500">Earn 12 BDT per referral</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-blue-500" />
                </button>
              </div>
            </motion.div>
          ) : activeTab === 'ads' ? (
            <motion.div 
              key="ads"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-zinc-900 p-8 rounded-3xl border border-white/5 text-center">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <PlayCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Watch & Earn</h2>
                <p className="text-zinc-400 text-sm mb-8">
                  Watch a short advertisement to earn 2 BDT instantly. 
                  Daily limit: 10 ads (20 BDT).
                </p>
                <button 
                  onClick={claimAd}
                  className="w-full bg-emerald-500 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
                >
                  Watch Ad Now
                </button>
              </div>

              <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Guidelines
                </h3>
                <ul className="space-y-3 text-sm text-zinc-400">
                  <li className="flex gap-3">
                    <span className="text-emerald-500">•</span>
                    Wait for the ad to finish completely.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-emerald-500">•</span>
                    Do not use VPN or proxy.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-emerald-500">•</span>
                    Rewards are credited instantly after verification.
                  </li>
                </ul>
              </div>
            </motion.div>
          ) : activeTab === 'referrals' ? (
            <motion.div 
              key="referrals"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-zinc-900 p-8 rounded-3xl border border-white/5 text-center">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Invite Friends</h2>
                <p className="text-zinc-400 text-sm mb-8">
                  Share your link and earn 12 BDT for every friend who joins and watches 3 ads.
                </p>
                
                <div className="bg-zinc-800 p-4 rounded-xl border border-white/5 flex items-center justify-between mb-4">
                  <code className="text-xs text-zinc-300 truncate mr-2">
                    https://t.me/YourBotName?start={user?.telegram_id}
                  </code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`https://t.me/YourBotName?start=${user?.telegram_id}`);
                      alert('Link copied!');
                    }}
                    className="text-emerald-500 font-bold text-sm"
                  >
                    Copy
                  </button>
                </div>

                <button 
                  onClick={() => {
                    const url = `https://t.me/share/url?url=https://t.me/YourBotName?start=${user?.telegram_id}&text=Join BDT Earning and start earning money today!`;
                    tg?.openTelegramLink(url);
                  }}
                  className="w-full bg-blue-500 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
                >
                  Share on Telegram
                </button>
              </div>

              <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                <h3 className="font-bold mb-4">Referral Levels</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Bronze', req: '0-4', color: 'text-zinc-400' },
                    { name: 'Silver', req: '5+', color: 'text-zinc-100' },
                    { name: 'Gold', req: '10+', color: 'text-yellow-500' },
                    { name: 'Platinum', req: '20+', color: 'text-emerald-400' }
                  ].map((l) => (
                    <div key={l.name} className="flex justify-between items-center">
                      <p className={`font-bold ${l.color}`}>{l.name}</p>
                      <p className="text-xs text-zinc-500">{l.req} referrals</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'withdraw' ? (
            <motion.div 
              key="withdraw"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-zinc-900 p-6 rounded-3xl border border-white/5">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <ArrowUpRight className="text-emerald-500" /> Withdraw Funds
                </h2>
                
                <form onSubmit={submitWithdraw} className="space-y-5">
                  <div>
                    <label className="text-xs text-zinc-400 uppercase font-bold mb-2 block">Payment Method</label>
                    <select name="method" className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500">
                      <option value="bKash">bKash</option>
                      <option value="Nagad">Nagad</option>
                      <option value="USDT">USDT (TRC20)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 uppercase font-bold mb-2 block">Amount (BDT)</label>
                    <input 
                      type="number" 
                      name="amount" 
                      placeholder="Min 200 BDT"
                      className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                      required
                      min="200"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 uppercase font-bold mb-2 block">Account Details</label>
                    <input 
                      type="text" 
                      name="details" 
                      placeholder="Number or Wallet Address"
                      className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                    <p className="text-xs text-emerald-500/80 leading-relaxed">
                      Withdrawals are processed within 24-48 hours. Ensure your account details are correct.
                    </p>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-emerald-500 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
                  >
                    Submit Request
                  </button>
                </form>
              </div>

              <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                <h3 className="font-bold mb-4">Unlock Requirements</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Min Balance 200 BDT', met: (user?.balance || 0) >= 200 },
                    { label: 'Min 5 Referrals', met: (user?.referrals_count || 0) >= 5 },
                    { label: 'Activity Score 50+', met: (user?.activity_score || 0) >= 50 }
                  ].map((req, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <p className={req.met ? 'text-zinc-300' : 'text-zinc-500'}>{req.label}</p>
                      {req.met ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-zinc-600" />}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/80 backdrop-blur-xl border-t border-white/5 p-4 pb-8 z-20">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <NavButton 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
            icon={<Home />} 
            label="Home" 
          />
          <NavButton 
            active={activeTab === 'ads'} 
            onClick={() => setActiveTab('ads')} 
            icon={<PlayCircle />} 
            label="Ads" 
          />
          <NavButton 
            active={activeTab === 'referrals'} 
            onClick={() => setActiveTab('referrals')} 
            icon={<Users />} 
            label="Invite" 
          />
          <NavButton 
            active={activeTab === 'withdraw'} 
            onClick={() => setActiveTab('withdraw')} 
            icon={<Wallet />} 
            label="Wallet" 
          />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-emerald-500 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
      {active && <motion.div layoutId="nav-indicator" className="w-1 h-1 bg-emerald-500 rounded-full mt-0.5" />}
    </button>
  );
}
