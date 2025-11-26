# Database Schema

⚠️ **IMPORTANT**: `schema.sql` is deprecated and for reference only.

## Source of Truth
All database changes MUST go through migrations:
- `migrations/001_create_users_table.sql`
- `migrations/002_kyc_auth_payment.sql`
- `migrations/003_update_users_table.sql`
- `migrations/004_add_deletion_reason.sql`
- `migrations/005_add_missing_fields.sql`
- `migrations/006_complete_missing_tables.sql`

## Apply Migrations
```bash
# Production
railway run node database/migrate.js

# Local
npm run migrate
```

**Never edit schema.sql directly!**
