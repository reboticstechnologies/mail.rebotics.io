import 'dotenv/config';
import fs from 'node:fs/promises';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
});

const sql = await fs.readFile(new URL('./schema.sql', import.meta.url), 'utf8');
await pool.query(sql);
console.log('Database initialized.');
await pool.end();
