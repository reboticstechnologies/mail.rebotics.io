import { Router } from 'express';
import multer from 'multer';
import { pool } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';
import { sendMail } from '../services/mail.js';

const router = Router();
const maxMb = Number(process.env.MAX_ATTACHMENT_MB || 8);
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 8, fileSize: maxMb * 1024 * 1024 } });
const allowedFolders = new Set(['inbox','sent','drafts','spam','trash']);
const json = (v) => { try { return v ? JSON.parse(v) : []; } catch { return []; } };
const addrList = (v) => Array.isArray(v) ? v.filter(Boolean).join(', ') : String(v || '');
const cleanHtml = (s) => String(s || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/on\w+\s*=\s*(['"]).*?\1/gi, '');

router.get('/', requireAuth, async (req, res) => {
  try {
    const folder = allowedFolders.has(req.query.folder) ? req.query.folder : 'inbox';
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(10, Number(req.query.limit || 25)));
    const offset = (page - 1) * limit;
    const q = String(req.query.q || '').trim();
    const where = ['user_id=?','folder=?']; const params = [req.user.id, folder];
    if (q) { where.push('(subject LIKE ? OR from_email LIKE ? OR from_name LIKE ? OR text_body LIKE ?)'); const x=`%${q}%`; params.push(x,x,x,x); }
    const [rows] = await pool.query(`SELECT id,from_name,from_email,to_json,subject,snippet,is_read,is_starred,received_at,sent_at FROM messages WHERE ${where.join(' AND ')} ORDER BY COALESCE(sent_at,received_at) DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    const [countRows] = await pool.query(`SELECT COUNT(*) c FROM messages WHERE ${where.join(' AND ')}`, params);
    res.json({ messages: rows.map(r=>({...r,to:json(r.to_json)})), total: countRows[0].c, page, limit });
  } catch (e) { console.error(e); res.status(500).json({ error:'Unable to load messages' }); }
});

router.get('/:id', requireAuth, async (req,res)=>{
  try {
    const [rows] = await pool.query('SELECT * FROM messages WHERE id=? AND user_id=? LIMIT 1',[req.params.id,req.user.id]);
    const m=rows[0]; if(!m) return res.status(404).json({error:'Message not found'});
    await pool.query('UPDATE messages SET is_read=1 WHERE id=? AND user_id=?',[m.id,req.user.id]);
    const [atts]=await pool.query('SELECT id,filename,content_type,size_bytes,content_id FROM attachments WHERE message_id=?',[m.id]);
    res.json({...m,to:json(m.to_json),cc:json(m.cc_json),bcc:json(m.bcc_json),attachments:atts});
  } catch(e){console.error(e);res.status(500).json({error:'Unable to load message'});}
});

router.patch('/:id', requireAuth, async (req,res)=>{
  try {
    const fields=[]; const vals=[];
    if (typeof req.body.isRead !== 'undefined') { fields.push('is_read=?'); vals.push(req.body.isRead?1:0); }
    if (typeof req.body.isStarred !== 'undefined') { fields.push('is_starred=?'); vals.push(req.body.isStarred?1:0); }
    if (req.body.folder && allowedFolders.has(req.body.folder)) { fields.push('folder=?'); vals.push(req.body.folder); }
    if (!fields.length) return res.status(400).json({error:'Nothing to update'});
    vals.push(req.params.id,req.user.id); await pool.query(`UPDATE messages SET ${fields.join(',')} WHERE id=? AND user_id=?`,vals); res.json({ok:true});
  } catch(e){console.error(e);res.status(500).json({error:'Update failed'});}
});

router.delete('/:id', requireAuth, async (req,res)=>{
  try { const [r]=await pool.query('UPDATE messages SET folder=\'trash\' WHERE id=? AND user_id=? AND folder<>\'trash\'',[req.params.id,req.user.id]); if(!r.affectedRows) await pool.query('DELETE FROM messages WHERE id=? AND user_id=?',[req.params.id,req.user.id]); res.json({ok:true}); }
  catch(e){console.error(e);res.status(500).json({error:'Delete failed'});}
});

router.post('/send', requireAuth, upload.array('attachments'), async (req,res)=>{
  try {
    const to = String(req.body.to || '').split(/[;,\n]+/).map(s=>s.trim()).filter(Boolean);
    const cc = String(req.body.cc || '').split(/[;,\n]+/).map(s=>s.trim()).filter(Boolean);
    const bcc = String(req.body.bcc || '').split(/[;,\n]+/).map(s=>s.trim()).filter(Boolean);
    if (!to.length) return res.status(400).json({error:'At least one recipient is required'});
    const subject=String(req.body.subject||'').slice(0,998), text=String(req.body.text||''), html=cleanHtml(req.body.html||'');
    const userEmail=req.user.email;
    const attachmentData=(req.files||[]).map(f=>({filename:f.originalname.slice(0,255),content_type:f.mimetype,size_bytes:f.size,content:f.buffer}));
    const info=await sendMail({from:`${process.env.MAIL_FROM_NAME||'Rebotics Mail'} <${userEmail}>`,to:addrList(to),cc:addrList(cc),bcc:addrList(bcc),subject,text,html,attachments:attachmentData.map(a=>({filename:a.filename,content:a.content,contentType:a.content_type}))});
    const [r]=await pool.query(`INSERT INTO messages (user_id,folder,message_uid,from_name,from_email,to_json,cc_json,bcc_json,subject,text_body,html_body,snippet,is_read,sent_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,NOW())`,[req.user.id,'sent',info.messageId,req.user.displayName,userEmail,JSON.stringify(to),JSON.stringify(cc),JSON.stringify(bcc),subject,text,html,(text||html.replace(/<[^>]+>/g,' ')).slice(0,450)]);
    for(const a of attachmentData) await pool.query('INSERT INTO attachments (message_id,filename,content_type,size_bytes,content) VALUES (?,?,?,?,?)',[r.insertId,a.filename,a.content_type,a.size_bytes,a.content]);
    // Deliver a copy into local Rebotics mailboxes as well as external SMTP.
    const [locals]=await pool.query(`SELECT id,email,display_name FROM users WHERE email IN (${to.map(()=>'?').join(',')})`,to);
    for(const u of locals){
      const [copy]=await pool.query(`INSERT INTO messages (user_id,folder,message_uid,from_name,from_email,to_json,cc_json,subject,text_body,html_body,snippet,sent_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW())`,[u.id,'inbox',info.messageId,req.user.displayName,userEmail,JSON.stringify(to),JSON.stringify(cc),subject,text,html,(text||html.replace(/<[^>]+>/g,' ')).slice(0,450)]);
      for(const a of attachmentData) await pool.query('INSERT INTO attachments (message_id,filename,content_type,size_bytes,content) VALUES (?,?,?,?,?)',[copy.insertId,a.filename,a.content_type,a.size_bytes,a.content]);
    }
    res.json({ok:true,messageId:r.insertId,smtpMessageId:info.messageId});
  } catch(e){console.error(e);res.status(500).json({error:e.message||'Send failed'});}
});

router.post('/draft', requireAuth, upload.array('attachments'), async (req,res)=>{
  try {
    const to=String(req.body.to||'').split(/[;,\n]+/).map(s=>s.trim()).filter(Boolean); const subject=String(req.body.subject||'').slice(0,998); const text=String(req.body.text||''); const html=cleanHtml(req.body.html||'');
    const [r]=await pool.query(`INSERT INTO messages (user_id,folder,from_name,from_email,to_json,subject,text_body,html_body,snippet,is_read) VALUES (?,?,?,?,?,?,?,?,?,1)`,[req.user.id,'drafts',req.user.displayName,req.user.email,JSON.stringify(to),subject,text,html,(text||html.replace(/<[^>]+>/g,' ')).slice(0,450)]);
    for(const f of (req.files||[])) await pool.query('INSERT INTO attachments (message_id,filename,content_type,size_bytes,content) VALUES (?,?,?,?,?)',[r.insertId,f.originalname.slice(0,255),f.mimetype,f.size,f.buffer]);
    res.json({ok:true,id:r.insertId});
  }catch(e){console.error(e);res.status(500).json({error:'Draft save failed'});}
});

export default router;
