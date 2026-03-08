import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('bdt_earning.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id TEXT PRIMARY KEY,
    username TEXT,
    balance REAL DEFAULT 0,
    referrals_count INTEGER DEFAULT 0,
    level TEXT DEFAULT 'Bronze',
    activity_score INTEGER DEFAULT 0,
    last_login TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    is_blocked INTEGER DEFAULT 0,
    referrer_id TEXT
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id TEXT,
    referred_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(referrer_id) REFERENCES users(telegram_id),
    FOREIGN KEY(referred_id) REFERENCES users(telegram_id)
  );

  CREATE TABLE IF NOT EXISTS ads_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    reward REAL,
    FOREIGN KEY(user_id) REFERENCES users(telegram_id)
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    amount REAL,
    method TEXT,
    details TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(telegram_id)
  );

  CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    details TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'dummy_token';

// Helper: Validate Telegram initData
function validateTelegramData(initData: string) {
  if (!initData) return null;
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  const sortedParams = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(sortedParams).digest('hex');

  if (calculatedHash === hash) {
    const user = JSON.parse(urlParams.get('user') || '{}');
    return user;
  }
  return null;
}

// Middleware: Auth
const authMiddleware = (req: any, res: any, next: any) => {
  const initData = req.headers['x-telegram-init-data'];
  const user = validateTelegramData(initData);
  if (!user && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // For development, if no initData, use a mock user if provided or fail
  req.user = user || { id: 'mock_user_id', username: 'mock_user' };
  next();
};

// --- API Endpoints ---

// Register/Login
app.post('/api/auth', authMiddleware, (req: any, res) => {
  const { id, username } = req.user;
  const referrer_id = req.body.referrer_id;

  let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(id) as any;

  if (!user) {
    // New user registration
    db.prepare('INSERT INTO users (telegram_id, username, referrer_id, last_login) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
      .run(id.toString(), username, referrer_id || null);
    
    if (referrer_id) {
      db.prepare('INSERT INTO referrals (referrer_id, referred_id) VALUES (?, ?)')
        .run(referrer_id, id.toString());
    }
    user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(id);
  } else {
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP, activity_score = activity_score + 1 WHERE telegram_id = ?')
      .run(id.toString());
  }

  res.json(user);
});

// Get User Data
app.get('/api/user', authMiddleware, (req: any, res) => {
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(req.user.id.toString());
  res.json(user);
});

// Claim Ad Reward
app.post('/api/ads/claim', authMiddleware, (req: any, res) => {
  const userId = req.user.id.toString();
  
  // Check daily limit (max 10 ads)
  const today = new Date().toISOString().split('T')[0];
  const adCount = db.prepare("SELECT COUNT(*) as count FROM ads_log WHERE user_id = ? AND timestamp >= ?")
    .get(userId, today) as any;

  if (adCount.count >= 10) {
    return res.status(400).json({ error: 'Daily ad limit reached' });
  }

  const reward = 2; // 2 BDT per ad
  db.prepare('INSERT INTO ads_log (user_id, reward) VALUES (?, ?)').run(userId, reward);
  db.prepare('UPDATE users SET balance = balance + ?, activity_score = activity_score + 2 WHERE telegram_id = ?')
    .run(reward, userId);

  // Check if this user was referred and if they've now completed 3 ads
  const referral = db.prepare('SELECT * FROM referrals WHERE referred_id = ? AND status = "pending"').get(userId) as any;
  if (referral) {
    const totalAds = db.prepare('SELECT COUNT(*) as count FROM ads_log WHERE user_id = ?').get(userId) as any;
    if (totalAds.count >= 3) {
      const referralReward = 12; // 12 BDT per referral
      db.prepare('UPDATE users SET balance = balance + ?, referrals_count = referrals_count + 1 WHERE telegram_id = ?')
        .run(referralReward, referral.referrer_id);
      db.prepare('UPDATE referrals SET status = "completed" WHERE id = ?').run(referral.id);
      
      // Update Level
      const referrer = db.prepare('SELECT referrals_count FROM users WHERE telegram_id = ?').get(referral.referrer_id) as any;
      let newLevel = 'Bronze';
      if (referrer.referrals_count >= 20) newLevel = 'Platinum';
      else if (referrer.referrals_count >= 10) newLevel = 'Gold';
      else if (referrer.referrals_count >= 5) newLevel = 'Silver';
      
      db.prepare('UPDATE users SET level = ? WHERE telegram_id = ?').run(newLevel, referral.referrer_id);
    }
  }

  res.json({ success: true, reward });
});

// Submit Withdrawal
app.post('/api/withdraw', authMiddleware, (req: any, res) => {
  const userId = req.user.id.toString();
  const { amount, method, details } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(userId) as any;

  // Conditions
  if (user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
  if (amount < 200) return res.status(400).json({ error: 'Minimum withdrawal is 200 BDT' });
  if (user.referrals_count < 5) return res.status(400).json({ error: 'Minimum 5 referrals required' });
  if (user.activity_score < 50) return res.status(400).json({ error: 'Activity score must be at least 50' });

  const adCount = db.prepare('SELECT COUNT(*) as count FROM ads_log WHERE user_id = ?').get(userId) as any;
  if (adCount.count < 20) return res.status(400).json({ error: 'Minimum 20 ads must be completed' });

  db.prepare('INSERT INTO withdrawals (user_id, amount, method, details) VALUES (?, ?, ?, ?)')
    .run(userId, amount, method, details);
  db.prepare('UPDATE users SET balance = balance - ? WHERE telegram_id = ?').run(amount, userId);

  res.json({ success: true });
});

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const topUsers = db.prepare('SELECT username, balance, referrals_count FROM users ORDER BY balance DESC LIMIT 10').all();
  res.json(topUsers);
});

// --- Admin Endpoints ---
const adminAuth = (req: any, res: any, next: any) => {
  const password = req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized Admin' });
  }
  next();
};

app.get('/api/admin/stats', adminAuth, (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  const totalPayouts = db.prepare('SELECT SUM(amount) as sum FROM withdrawals WHERE status = "approved"').get() as any;
  const pendingWithdrawals = db.prepare('SELECT w.*, u.username FROM withdrawals w JOIN users u ON w.user_id = u.telegram_id WHERE w.status = "pending"').all();
  res.json({ totalUsers: totalUsers.count, totalPayouts: totalPayouts.sum || 0, pendingWithdrawals });
});

app.post('/api/admin/withdraw/approve', adminAuth, (req, res) => {
  const { id } = req.body;
  db.prepare('UPDATE withdrawals SET status = "approved" WHERE id = ?').run(id);
  res.json({ success: true });
});

app.post('/api/admin/withdraw/reject', adminAuth, (req, res) => {
  const { id } = req.body;
  const withdrawal = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(id) as any;
  db.prepare('UPDATE withdrawals SET status = "rejected" WHERE id = ?').run(id);
  db.prepare('UPDATE users SET balance = balance + ? WHERE telegram_id = ?').run(withdrawal.amount, withdrawal.user_id);
  res.json({ success: true });
});

// --- Vite Setup ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
