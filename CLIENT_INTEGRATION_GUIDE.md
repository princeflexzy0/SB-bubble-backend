# Client Integration Guide

## 🎯 What You Need To Do

The backend is **100% complete and production-ready**. You just need to add your own API credentials.

### Step 1: Clone the Repository
```bash
git clone https://github.com/princeflexzy0/bubble-backend-api.git
cd bubble-backend-api
npm install
```

### Step 2: Configure Your Credentials

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
# === YOUR CREDENTIALS TO ADD ===

# Supabase (https://supabase.com/dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AWS S3 (https://console.aws.amazon.com/iam/)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket-name

# Stripe (https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# PayPal (https://developer.paypal.com/)
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_CLIENT_SECRET=your-client-secret

# SendGrid (https://app.sendgrid.com/settings/api_keys)
SENDGRID_API_KEY=SG.your-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Twilio - Will be provided by developer
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI (https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your-key

# Security Keys (Generate random 32+ character strings)
JWT_SECRET=your-random-jwt-secret-here
ENCRYPTION_KEY=your-random-encryption-key-here
INTERNAL_API_KEY=your-bubble-to-node-api-key

# CORS (Add your Bubble.io app domain)
ALLOWED_ORIGINS=https://yourbubbleapp.com,https://your-domain.com
```

### Step 3: Setup Database

1. Go to your Supabase SQL Editor
2. Run `database/schema.sql`
3. Run `database/rls_policies.sql`
4. (Optional) Run `database/seed.sql`

### Step 4: Test Everything
```bash
# Run tests
npm test

# All 45 tests should pass
```

### Step 5: Deploy

**Option A: Development**
```bash
npm run dev
```

**Option B: Production (PM2)**
```bash
npm install -g pm2
pm2 start pm2.config.js --env production
pm2 save
```

**Option C: Docker**
```bash
docker-compose up -d
```

### Step 6: Verify
```bash
curl http://localhost:3000/api/v1/health
# Should return: {"status":"healthy"...}
```

### Step 7: Configure Webhooks

**Stripe Webhook:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/v1/pay/webhook/stripe`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET` in `.env`

**PayPal Webhook:**
1. Go to PayPal Developer Dashboard
2. Configure webhook URL: `https://your-domain.com/api/v1/pay/webhook/paypal`

## 📚 Documentation

- **API Documentation**: http://localhost:3000/api/v1/api-docs
- **Postman Collection**: Import `docs/postman_collection.json`
- **Complete README**: See `README.md`

## 🆘 Need Help?

Contact the developer if you encounter any issues during setup.

## ✅ Checklist

- [ ] Cloned repository
- [ ] Installed dependencies (`npm install`)
- [ ] Created `.env` file
- [ ] Added all credentials to `.env`
- [ ] Ran database schema in Supabase
- [ ] Ran tests (`npm test`) - all passing
- [ ] Started server
- [ ] Verified health endpoint
- [ ] Configured webhooks
- [ ] Tested key endpoints with Postman

Once all checkboxes are complete, your backend is fully operational! 🎉
