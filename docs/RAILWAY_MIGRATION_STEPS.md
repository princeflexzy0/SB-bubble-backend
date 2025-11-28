# How to Apply RLS Migration in Railway

## Step-by-Step Instructions:

### Method 1: Data Tab (if Query tab not visible)
1. Go to https://railway.app
2. Click on your project
3. Click on **PostgreSQL** (the database service)
4. Look for tabs at the top - you should see:
   - Variables
   - Metrics
   - Data ← Click this one
   - Settings

5. In the Data tab, you'll see a SQL query box at the top
6. Copy and paste the SQL (see below)
7. Click "Execute" or "Run"

### Method 2: Connect via External Tool
Alternatively, use Railway's public connection:
- Host: `postgres.railway.app`
- Port: Check your Railway project
- Database: `railway`
- User: `postgres`
- Password: `kzEzVRONSvGfKgrRoJJwkAyJRuknWmdA`

### SQL to Run:
```sql
CREATE OR REPLACE FUNCTION set_user_context(
  p_user_id UUID,
  p_user_role TEXT DEFAULT 'user'
) RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::TEXT, false);
  PERFORM set_config('app.current_user_role', p_user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_context()
RETURNS TABLE(user_id UUID, user_role TEXT) AS $$
BEGIN
  RETURN QUERY SELECT 
    NULLIF(current_setting('app.current_user_id', true), '')::UUID,
    NULLIF(current_setting('app.current_user_role', true), '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION clear_user_context()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', '', false);
  PERFORM set_config('app.current_user_role', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### What to Expect:
You should see a success message like:
- "Command completed successfully"
- "CREATE FUNCTION" (appears 3 times)

