import { Router } from 'express';
import { pool } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';
const router=Router();
router.get('/:id',requireAuth,async(req,res)=>{try{const [r]=await pool.query(`SELECT a.* FROM attachments a JOIN messages m ON m.id=a.message_id WHERE a.id=? AND m.user_id=? LIMIT 1`,[req.params.id,req.user.id]);const a=r[0];if(!a)return res.status(404).end();res.setHeader('Content-Type',a.content_type);res.setHeader('Content-Disposition',`attachment; filename="${String(a.filename).replace(/"/g,'')}"`);res.send(a.content);}catch(e){res.status(500).end();}});
export default router;
