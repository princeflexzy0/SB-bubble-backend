-- Migration: Add IP and UserAgent binding to magic_links
-- Enhances security by tracking request origin

-- Add IP address column
ALTER TABLE magic_links 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- Add User-Agent column
ALTER TABLE magic_links 
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_magic_links_token_hash 
ON magic_links(token_hash) 
WHERE used_at IS NULL;

-- Add comment
COMMENT ON COLUMN magic_links.ip_address IS 'IP address that requested the magic link';
COMMENT ON COLUMN magic_links.user_agent IS 'User-Agent of the requesting client';
