const { Pool } = require('pg');

async function checkTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Existing tables:');
    result.rows.forEach(row => console.log('  -', row.table_name));
    
    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    client.release();
    await pool.end();
    process.exit(1);
  }
}

checkTables();
