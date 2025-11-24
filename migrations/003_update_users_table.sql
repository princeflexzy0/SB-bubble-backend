-- Add auth-related columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS external_provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS external_provider_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_data JSONB;

-- Create unique index for external provider linkage
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_unique 
ON users(external_provider, external_provider_id) 
WHERE external_provider IS NOT NULL;
