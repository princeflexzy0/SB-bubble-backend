const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected');
    
    console.log('Running migration 002...');
    const sql = fs.readFileSync('migrations/002_kyc_auth_payment.sql', 'utf8');
    await client.query(sql);
    console.log('✅ Migration 002 completed');
    
    console.log('Running migration 003...');
    const sql2 = fs.readFileSync('migrations/003_update_users_table.sql', 'utf8');
    await client.query(sql2);
    console.log('✅ Migration 003 completed');
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

runMigration();
