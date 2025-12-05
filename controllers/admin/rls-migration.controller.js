const { pool } = require('../../config/database');

exports.runRlsMigration = async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const action = req.body?.action || 'rls';

    if (action === 'clear_tokens') {
      console.log('Clearing all refresh tokens...');
      await pool.query('DELETE FROM refresh_tokens');
      return res.json({ success: true, message: 'All refresh tokens cleared' });
    }

    console.log('Running RLS migration...');

    // Drop with exact signatures
    await pool.query('DROP FUNCTION IF EXISTS set_user_context(uuid, boolean);');
    await pool.query('DROP FUNCTION IF EXISTS set_user_context(uuid, text);');
    await pool.query('DROP FUNCTION IF EXISTS set_user_context(uuid);');
    await pool.query('DROP FUNCTION IF EXISTS set_user_context(text);');
    await pool.query('DROP FUNCTION IF EXISTS set_user_context(varchar);');

    // Create the simple one
    await pool.query(`
      CREATE FUNCTION set_user_context(p_user_id uuid)
      RETURNS void AS $$ BEGIN PERFORM set_config('app.current_user_id', p_user_id::text, false); END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    await pool.query('GRANT EXECUTE ON FUNCTION set_user_context(uuid) TO PUBLIC;');

    const result = await pool.query(`
      SELECT proname, pg_get_function_arguments(oid) 
      FROM pg_proc WHERE proname = 'set_user_context'
    `);

    res.json({
      success: true,
      message: 'RLS function ready',
      functions: result.rows
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
