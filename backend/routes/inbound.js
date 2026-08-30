import express from 'express';
import { pool } from '../services/db.js';

const router = express.Router();

router.post('/', async (req, res) => {
  if (req.headers['x-inbound-secret'] !== process.env.INBOUND_WEBHOOK_SECRET)
    return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { to, from, subject, text, html, messageId } = req.body || {};
    const recipients = Array.isArray(to) ? to : String(to || '').split(',').map(x => x.trim()).filter(Boolean);
    if (!from || !recipients.length) return res.status(400).json({ error: 'from and to are required' });

    for (const address of recipients) {
      const user = await pool.query('SELECT id FROM users WHERE email=$1 AND is_active=TRUE', [address.toLowerCase()]);
      if (!user.rowCount) continue;
      await pool.query(
        `INSERT INTO messages(owner_user_id,folder,message_uid,from_address,to_addresses,subject,text_body,html_body,is_read)
         VALUES($1,'Inbox',$2,$3,$4,$5,$6,$7,FALSE)
         ON CONFLICT(owner_user_id,message_uid) DO NOTHING`,
        [user.rows[0].id, messageId || `${Date.now()}-${Math.random()}`, from, recipients, subject || '', text || '', html || '']
      );
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Inbound processing failed' });
  }
});

export default router;
