# Monitoring Setup Guide

## Sentry Configuration

### 1. Create Sentry Account
1. Go to https://sentry.io
2. Create a new project
3. Select "Node.js" as platform
4. Copy your DSN

### 2. Add DSN to Environment
```bash
# In Railway dashboard or .env file
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

### 3. Test Sentry Integration
```bash
# Trigger a test error
curl -X POST https://your-app.railway.app/api/test-error
```

## Logtail Configuration (Optional Alternative)

### 1. Create Logtail Account
1. Go to https://logtail.com
2. Create a new source
3. Copy your source token

### 2. Install Logtail Transport
```bash
npm install @logtail/node @logtail/winston
```

### 3. Update monitoring.js
Add Logtail transport to winston configuration.

## Viewing Logs

### Local Development
```bash
# View all logs
tail -f logs/combined-*.log

# View errors only
tail -f logs/error-*.log
```

### Production (Railway)
```bash
# View logs in Railway dashboard
railway logs

# Or use Sentry dashboard
https://sentry.io/organizations/your-org/issues/
```

## Log Rotation

Logs automatically rotate:
- **Error logs**: Keep 14 days
- **Combined logs**: Keep 7 days
- **Max file size**: 20MB per file

Cleanup runs daily at 2 AM via cron job.
