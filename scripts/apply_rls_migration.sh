#!/bin/bash

echo "🗄️ Applying RLS Migration to Database"
echo "======================================"
echo ""

# Apply migration using Railway CLI
echo "Applying migration 009_add_rls_context.sql..."

railway run psql $DATABASE_URL < migrations/009_add_rls_context.sql

if [ $? -eq 0 ]; then
  echo "✅ Migration applied successfully"
else
  echo "❌ Migration failed"
  echo ""
  echo "Manual steps:"
  echo "1. Go to Railway dashboard"
  echo "2. Open PostgreSQL service"
  echo "3. Click 'Data' tab"
  echo "4. Run the SQL from migrations/009_add_rls_context.sql"
fi
