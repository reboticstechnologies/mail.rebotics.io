import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../services/db.js';
import { signAccessToken } from '../middleware/auth.js';

const router = express.Router();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

router.post('/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const displayName = String(req.body.displayName || email.split('@')[0]);

    if (!email.endsWith(`@${process.env.MAIL_DOMAIN}`))
      return res.status(400).json({ error: `Use an @${process.env.MAIL_DOMAIN} address` });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must contain at least 8 characters' });

    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rowCount) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users(email,password_hash,display_name) VALUES($1,$2,$3) RETURNING id,email,display_name',
      [email, hash, displayName]
    );
    const user = result.rows[0];
    res.status(201).json({ token: signAccessToken(user), user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const result = await pool.query('SELECT * FROM users WHERE email=$1 AND is_active=TRUE', [email]);
    if (!result.rowCount) return res.status(401).json({ error: 'Invalid email or password' });

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    res.json({
      token: signAccessToken(user),
      user: { id: user.id, email: user.email, displayName: user.display_name }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', async (req, res) => {
  const id = req.user.sub;
  const result = await pool.query(
    'SELECT id,email,display_name,created_at FROM users WHERE id=$1 AND is_active=TRUE',
    [id]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'User not found' });
  res.json({ user: result.rows[0] });
});

export default router;
