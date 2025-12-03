-- Add missing columns to refresh_tokens table
ALTER TABLE refresh_tokens 
ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT FALSE;

ALTER TABLE refresh_tokens 
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked 
ON refresh_tokens(revoked) WHERE revoked = FALSE;

COMMENT ON COLUMN refresh_tokens.revoked IS 'Whether token has been revoked';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'When token was revoked';
