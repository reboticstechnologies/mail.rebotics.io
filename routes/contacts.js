import { Router } from 'express';
import { pool } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';
const router=Router();
router.get('/',requireAuth,async(req,res)=>{const [r]=await pool.query('SELECT id,name,email,phone,notes FROM contacts WHERE user_id=? ORDER BY name',[req.user.id]);res.json({contacts:r});});
router.post('/',requireAuth,async(req,res)=>{try{const name=String(req.body.name||'').trim().slice(0,120),email=String(req.body.email||'').trim().toLowerCase();if(!name||!/^\S+@\S+$/.test(email))return res.status(400).json({error:'Name and valid email are required'});await pool.query('INSERT INTO contacts (user_id,name,email,phone,notes) VALUES (?,?,?,?,?)',[req.user.id,name,email,String(req.body.phone||'').slice(0,50),String(req.body.notes||'').slice(0,500)]);res.json({ok:true});}catch(e){res.status(409).json({error:'Contact already exists or could not be saved'});}});
router.delete('/:id',requireAuth,async(req,res)=>{await pool.query('DELETE FROM contacts WHERE id=? AND user_id=?',[req.params.id,req.user.id]);res.json({ok:true});});
export default router;
