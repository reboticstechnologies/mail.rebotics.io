import { Router } from 'express';
import { pool } from '../services/db.js';
const router=Router();
router.post('/',async(req,res)=>{
  try{
    if(!process.env.INBOUND_WEBHOOK_SECRET || req.get('x-inbound-secret')!==process.env.INBOUND_WEBHOOK_SECRET) return res.status(401).json({error:'Unauthorized'});
    const {from,to,subject,text,html,messageId,attachments=[]}=req.body||{};
    const recipients=Array.isArray(to)?to:[to].filter(Boolean);
    if(!recipients.length) return res.status(400).json({error:'Missing recipient'});
    const [users]=await pool.query(`SELECT id,email,display_name FROM users WHERE email IN (${recipients.map(()=>'?').join(',')})`,recipients);
    for(const u of users){
      const [r]=await pool.query(`INSERT INTO messages (user_id,folder,message_uid,from_email,to_json,subject,text_body,html_body,snippet,is_read,received_at) VALUES (?,?,?,?,?,?,?,?,?,0,NOW())`,[u.id,'inbox',messageId||null,String(from||''),JSON.stringify(recipients),String(subject||'').slice(0,998),String(text||''),String(html||''),(String(text||'')||String(subject||'')).slice(0,450)]);
      for(const a of attachments.slice(0,8)){
        const b=Buffer.from(String(a.content||''),'base64'); if(b.length>8*1024*1024) continue;
        await pool.query('INSERT INTO attachments (message_id,filename,content_type,size_bytes,content,content_id) VALUES (?,?,?,?,?,?)',[r.insertId,String(a.filename||'attachment').slice(0,255),String(a.contentType||'application/octet-stream').slice(0,191),b.length,b,a.contentId||null]);
      }
    }
    res.json({ok:true,deliveredTo:users.map(u=>u.email)});
  }catch(e){console.error(e);res.status(500).json({error:'Inbound processing failed'});}
});
export default router;
