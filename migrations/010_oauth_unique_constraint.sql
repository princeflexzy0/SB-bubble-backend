-- Migration: Add unique constraint for OAuth linking
-- Prevents the same external account from being linked to multiple users

-- Add unique constraint on external_provider + external_provider_id
-- This ensures one Google/Apple account can only be linked to one user
ALTER TABLE users 
ADD CONSTRAINT unique_external_provider 
UNIQUE (external_provider, external_provider_id);

-- Add index for faster OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_external_provider 
ON users(external_provider, external_provider_id) 
WHERE external_provider IS NOT NULL;

-- Add columns if they don't exist (safe migration)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'external_provider') THEN
        ALTER TABLE users ADD COLUMN external_provider VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'external_provider_id') THEN
        ALTER TABLE users ADD COLUMN external_provider_id VARCHAR(255);
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON CONSTRAINT unique_external_provider ON users IS 
'Ensures each OAuth account (Google/Apple) can only be linked to one user';
