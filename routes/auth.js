import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: String(process.env.COOKIE_SECURE || 'true') === 'true',
  maxAge: 1000 * 60 * 60 * 24 * 7,
  path: '/'
});

function makeToken(user) {
  return jwt.sign({ id: user.id, email: user.email, displayName: user.display_name }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    if (String(process.env.ALLOW_PUBLIC_REGISTRATION || 'true') !== 'true') return res.status(403).json({ error: 'Registration is disabled' });
    const { email, password, displayName } = req.body || {};
    const domain = String(process.env.MAIL_DOMAIN || 'rebotics.in').toLowerCase();
    const normalized = String(email || '').trim().toLowerCase();
    if (!/^\S+@\S+$/.test(normalized) || !normalized.endsWith(`@${domain}`)) return res.status(400).json({ error: `Use an @${domain} address` });
    if (String(password || '').length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const [exists] = await pool.query('SELECT id FROM users WHERE email=?', [normalized]);
    if (exists.length) return res.status(409).json({ error: 'Email address already exists' });
    const hash = await bcrypt.hash(password, 12);
    const name = String(displayName || normalized.split('@')[0]).trim().slice(0, 120) || normalized.split('@')[0];
    const [result] = await pool.query('INSERT INTO users (email,password_hash,display_name) VALUES (?,?,?)', [normalized, hash, name]);
    const user = { id: result.insertId, email: normalized, display_name: name };
    res.cookie('rebotics_session', makeToken(user), cookieOptions());
    res.json({ user: { id: user.id, email: user.email, displayName: user.display_name } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Registration failed' }); }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const [rows] = await pool.query('SELECT * FROM users WHERE email=? LIMIT 1', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid email or password' });
    res.cookie('rebotics_session', makeToken(user), cookieOptions());
    res.json({ user: { id: user.id, email: user.email, displayName: user.display_name } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Login failed' }); }
});

router.post('/logout', (req, res) => { res.clearCookie('rebotics_session', { httpOnly: true, sameSite: 'lax', secure: String(process.env.COOKIE_SECURE || 'true') === 'true', path: '/' }); res.json({ ok: true }); });
router.get('/me', requireAuth, async (req, res) => res.json({ user: { id: req.user.id, email: req.user.email, displayName: req.user.displayName } }));
export default router;
