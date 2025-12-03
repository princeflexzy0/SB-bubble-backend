const db = require('../../config/database');

exports.runKycMigration = async (req, res) => {
  try {
    // Security: Check admin key
    if (req.headers['x-admin-key'] !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await db.query(`
      ALTER TABLE kyc_sessions 
      ADD COLUMN IF NOT EXISTS session_hash VARCHAR(64),
      ADD COLUMN IF NOT EXISTS nonce VARCHAR(32),
      ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT NOW()
    `);
    
    await db.query(`CREATE INDEX IF NOT EXISTS idx_kyc_sessions_nonce ON kyc_sessions(nonce)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_kyc_sessions_hash ON kyc_sessions(session_hash)`);
    
    const result = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'kyc_sessions' 
      AND column_name IN ('session_hash', 'nonce', 'last_activity')
    `);
    
    res.json({ success: true, columns: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
