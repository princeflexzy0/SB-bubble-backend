const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    // console.log('�� Existing tables:');
    result.rows.forEach(row => // console.log('  -', row.table_name));
    
    client.release();
    process.exit(0);
  } catch (error) {
    // console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTables();
