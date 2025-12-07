const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
  try {
    // console.log('Connecting to database...');
    const client = await pool.connect();
    // console.log('✅ Connected');
    
    const migrations = [
      '001_create_users_table.sql',
      '002_kyc_auth_payment.sql',
      '003_update_users_table.sql',
      '004_add_deletion_reason.sql'
    ];
    
    for (const migration of migrations) {
      try {
        // console.log(`Running migration: ${migration}...`);
        const sql = fs.readFileSync(`migrations/${migration}`, 'utf8');
        await client.query(sql);
        // console.log(`✅ ${migration} completed`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          // console.log(`⚠️  ${migration} - objects already exist, skipping`);
        } else {
          throw error;
        }
      }
    }
    
    client.release();
    // console.log('🎉 All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    // console.error('❌ Migration failed:');
    // console.error('Error message:', error.message);
    process.exit(1);
  }
}

runMigrations();
