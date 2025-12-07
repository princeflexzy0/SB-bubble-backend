const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    // Find the RLS migration file
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir);
    const rlsMigration = files.find(f => f.includes('rls_function'));
    
    if (!rlsMigration) {
      // console.log('❌ RLS migration file not found');
      process.exit(1);
    }
    
    const sql = fs.readFileSync(path.join(migrationsDir, rlsMigration), 'utf8');
    
    // console.log('Running RLS function migration...');
    await pool.query(sql);
    
    // console.log('✅ RLS function created successfully!');
    
    // Test it
    const testResult = await pool.query(`
      SELECT proname, pg_get_function_arguments(oid) 
      FROM pg_proc 
      WHERE proname = 'set_user_context'
    `);
    
    // console.log('Verified function:', testResult.rows);
    
  } catch (error) {
    // console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();
