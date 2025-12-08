-- Fix RLS function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION set_user_context(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- This allows function to bypass RLS
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
END;
$$;

-- Grant execute to all users
GRANT EXECUTE ON FUNCTION set_user_context(uuid) TO PUBLIC;
