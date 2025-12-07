const { Pool } = require('pg');
const fs = require('fs');

async function runMigration() {
  // Get DATABASE_URL - modify internal hostname to public if needed
  let DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    // console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  // Replace internal Railway hostname with public one
  DATABASE_URL = DATABASE_URL.replace('postgres.railway.internal', 'postgres.railway.app');
  
  // console.log('🔧 Connecting to database...');
  // console.log('   Host:', DATABASE_URL.split('@')[1]?.split('/')[0] || 'unknown');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    await pool.query('SELECT 1');
    // console.log('✅ Connected to database');
    
    const sql = fs.readFileSync('migrations/009_add_rls_context.sql', 'utf8');
    // console.log('📄 SQL file read successfully');
    
    // Execute each function separately
    const functions = [
      {
        name: 'set_user_context',
        sql: sql.match(/CREATE OR REPLACE FUNCTION set_user_context[\s\S]*?\$\$ LANGUAGE plpgsql SECURITY DEFINER;/)?.[0]
      },
      {
        name: 'get_user_context',
        sql: sql.match(/CREATE OR REPLACE FUNCTION get_user_context[\s\S]*?\$\$ LANGUAGE plpgsql SECURITY DEFINER;/)?.[0]
      },
      {
        name: 'clear_user_context',
        sql: sql.match(/CREATE OR REPLACE FUNCTION clear_user_context[\s\S]*?\$\$ LANGUAGE plpgsql SECURITY DEFINER;/)?.[0]
      }
    ];
    
    // console.log('📝 Creating functions...\n');
    
    for (const func of functions) {
      if (func.sql) {
        // console.log(`  • Creating ${func.name}...`);
        await pool.query(func.sql);
        // console.log(`    ✅ ${func.name} created`);
      }
    }
    
    // console.log('\n✅ All functions created successfully!');
    
    // Verify
    const result = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name IN ('set_user_context', 'get_user_context', 'clear_user_context')
      ORDER BY routine_name
    `);
    
    // console.log(`\n✅ Verified ${result.rows.length}/3 functions:`);
    // Rows logged
    
  } catch (error) {
    // console.error('\n❌ Migration failed:');
    // console.error('   Error:', error.message);
    if (error.code) { /* console.error */ }('   Code:', error.code);
    if (error.detail) { /* console.error */ }('   Detail:', error.detail);
    if (error.hint) // console.error('   Hint:', error.hint);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
