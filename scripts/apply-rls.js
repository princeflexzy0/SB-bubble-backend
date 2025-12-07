const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function applyRLS() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync('database/rls_policies.sql', 'utf8');
    await client.query(sql);
    // console.log('✅ RLS policies applied successfully');
  } catch (error) {
    // console.error('⚠️  RLS application failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

applyRLS();
