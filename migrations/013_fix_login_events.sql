-- Allow NULL user_id for failed login attempts (user not found)
ALTER TABLE login_events 
ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN login_events.user_id IS 'User ID (NULL for failed login attempts)';
