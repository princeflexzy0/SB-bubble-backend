-- Add jti (JWT ID) column to refresh_tokens for unique token identification
ALTER TABLE refresh_tokens 
ADD COLUMN IF NOT EXISTS jti UUID DEFAULT gen_random_uuid();

-- Create index for fast jti lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens(jti);

COMMENT ON COLUMN refresh_tokens.jti IS 'Unique JWT identifier for token tracking';
