import express from 'express';
import { pool } from '../services/db.js';
import { sendMail } from '../services/mailer.js';

const router = express.Router();
const DOMAIN = process.env.MAIL_DOMAIN;

function arr(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : String(value).split(',').map(x => x.trim()).filter(Boolean);
}

function validDomainAddress(address) {
  return /^[^@\s]+@[^@\s]+$/.test(address);
}

router.get('/', async (req, res) => {
  const folder = String(req.query.folder || 'Inbox');
  const q = String(req.query.q || '').trim();
  const allowed = ['Inbox','Sent','Drafts','Starred','Spam','Trash'];
  if (!allowed.includes(folder)) return res.status(400).json({ error: 'Invalid folder' });

  const params = [req.user.sub];
  let sql = `SELECT id,folder,from_address AS "from",to_addresses AS "to",cc_addresses AS "cc",
    subject,text_body AS body,is_read AS unread,is_starred AS starred,created_at AS date
    FROM messages WHERE owner_user_id=$1`;
  if (folder === 'Starred') sql += ` AND is_starred=TRUE`;
  else { params.push(folder); sql += ` AND folder=$2`; }
  if (q) {
    params.push(`%${q}%`);
    sql += ` AND (from_address ILIKE $${params.length} OR subject ILIKE $${params.length} OR text_body ILIKE $${params.length})`;
  }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  const result = await pool.query(sql, params);
  res.json({ messages: result.rows });
});

router.get('/:id', async (req, res) => {
  const result = await pool.query(
    `SELECT id,folder,from_address AS "from",to_addresses AS "to",cc_addresses AS "cc",
      subject,text_body AS body,html_body AS html,is_read AS unread,is_starred AS starred,
      created_at AS date,sent_at FROM messages WHERE id=$1 AND owner_user_id=$2`,
    [req.params.id, req.user.sub]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Message not found' });
  await pool.query('UPDATE messages SET is_read=TRUE WHERE id=$1 AND owner_user_id=$2', [req.params.id, req.user.sub]);
  res.json({ message: result.rows[0] });
});

router.patch('/:id', async (req, res) => {
  const fields = [];
  const values = [];
  const add = (sql, val) => { values.push(val); fields.push(sql.replace('?', `$${values.length}`)); };
  if (typeof req.body.read === 'boolean') add('is_read=?', req.body.read);
  if (typeof req.body.starred === 'boolean') add('is_starred=?', req.body.starred);
  if (req.body.folder) add('folder=?', req.body.folder);
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  values.push(req.params.id, req.user.sub);
  const result = await pool.query(
    `UPDATE messages SET ${fields.join(', ')} WHERE id=$${values.length-1} AND owner_user_id=$${values.length} RETURNING id`,
    values
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Message not found' });
  res.json({ ok: true });
});

router.post('/drafts', async (req, res) => {
  const to = arr(req.body.to);
  const cc = arr(req.body.cc);
  const subject = String(req.body.subject || '');
  const body = String(req.body.body || '');
  const result = await pool.query(
    `INSERT INTO messages(owner_user_id,folder,from_address,to_addresses,cc_addresses,subject,text_body)
     SELECT $1,'Drafts',email,$2,$3,$4,$5 FROM users WHERE id=$1
     RETURNING id`,
    [req.user.sub,to,cc,subject,body]
  );
  res.status(201).json({ id: result.rows[0].id });
});

router.post('/send', async (req, res) => {
  try {
    const to = arr(req.body.to), cc = arr(req.body.cc), bcc = arr(req.body.bcc);
    const subject = String(req.body.subject || '');
    const text = String(req.body.text || req.body.body || '');
    const html = String(req.body.html || `<p>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}</p>`);
    if (!to.length || to.some(x => !validDomainAddress(x))) return res.status(400).json({ error: 'Valid recipient required' });

    const userResult = await pool.query('SELECT email FROM users WHERE id=$1 AND is_active=TRUE', [req.user.sub]);
    if (!userResult.rowCount) return res.status(401).json({ error: 'User not found' });
    const from = userResult.rows[0].email;

    const info = await sendMail({ from, to, cc, bcc, subject, text, html, replyTo: from });

    await pool.query(
      `INSERT INTO messages(owner_user_id,folder,message_uid,from_address,to_addresses,cc_addresses,bcc_addresses,subject,text_body,html_body,is_read,sent_at)
       VALUES($1,'Sent',$2,$3,$4,$5,$6,$7,$8,$9,TRUE,NOW())`,
      [req.user.sub, String(info.messageId || `${Date.now()}-${Math.random()}`), from, to, cc, bcc, subject, text, html]
    );
    res.status(201).json({ ok: true, messageId: info.messageId });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Email delivery failed' });
  }
});

export default router;
