import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { pool } from './services/db.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';
import inboundRoutes from './routes/inbound.js';
import { verifyMailer } from './services/mailer.js';

const app = express();
const PORT = Number(process.env.PORT || 8080);

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN,
  methods: ['GET','POST','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Inbound-Secret']
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('combined'));

app.get('/health', async (_req,res) => {
  try { await pool.query('SELECT 1'); res.json({ ok:true, service:'rebotics-mail-api' }); }
  catch { res.status(503).json({ ok:false }); }
});

app.use('/api/auth', authRoutes);
app.use('/api/inbound', inboundRoutes);
app.use('/api/messages', requireAuth, messageRoutes);

app.use((err,_req,res,_next) => {
  console.error(err);
  res.status(500).json({ error:'Internal server error' });
});

app.listen(PORT, async () => {
  console.log(`Rebotics Mail API listening on :${PORT}`);
  try { if (await verifyMailer()) console.log('SMTP connection verified.'); }
  catch (e) { console.warn('SMTP verification failed:', e.message); }
});
