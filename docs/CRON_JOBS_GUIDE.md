# Cron Jobs Guide

## Available Cron Jobs

### 1. Daily Cleanup (`/cron/dailyCleanup.js`)
**Schedule**: Every day at 2:00 AM
**Tasks**:
- Delete logs older than 14 days
- Remove temp files older than 7 days
- Clean up expired sessions (30+ days)

### 2. Weekly Audit (`/cron/weeklyAudit.js`)
**Schedule**: Every Sunday at 3:00 AM
**Tasks**:
- Audit failed login attempts
- Check for suspicious activities
- Analyze API key usage
- Track permission changes

### 3. Retry Stuck Workflows (`/cron/retryStuckWorkflows.js`)
**Schedule**: Every hour
**Tasks**:
- Find stuck jobs (no progress for 30+ min)
- Retry failed jobs (max 3 attempts)
- Report stuck workflows to Sentry

### 4. Refresh Tokens (`/cron/refreshTokens.js`)
**Schedule**: Every 6 hours
**Tasks**:
- Refresh OAuth tokens expiring soon
- Rotate API keys as needed
- Refresh JWT tokens for service auth

## Starting Cron Jobs

### Development
```bash
node cron/index.js
```

### Production with PM2
```bash
pm2 start ecosystem.config.js --only cron-manager
```

## Manually Trigger Cron
```javascript
const { startDailyCleanup } = require('./cron/dailyCleanup');

// This starts the cron scheduler
startDailyCleanup();

// To run immediately (for testing)
const queues = require('./workers/queue/queueManager');
await queues.cleanup.add('manual-cleanup', {
  type: 'logs',
  olderThan: 14 * 24 * 60 * 60 * 1000,
  dryRun: false
});
```

## Customizing Schedules

Edit the `schedule` variable in each cron file:
```javascript
// Cron format: minute hour day month dayOfWeek
const schedule = '0 2 * * *'; // 2 AM daily

// Examples:
// '*/5 * * * *'     - Every 5 minutes
// '0 */6 * * *'     - Every 6 hours
// '0 0 * * 0'       - Every Sunday at midnight
// '30 3 1 * *'      - 3:30 AM on 1st of each month
```

## Monitoring Cron Jobs

### View Logs
```bash
# PM2 logs
pm2 logs cron-manager

# File logs
tail -f logs/cron-*.log
```

### Check Cron Status
```bash
pm2 list
```

## Disabling Cron Jobs

### Temporarily
```bash
pm2 stop cron-manager
```

### Permanently
Set in `.env`:
```
ENABLE_CRON_JOBS=false
```

## Testing Cron Jobs

Run individual cron jobs for testing:
```bash
# Test daily cleanup
node -e "require('./cron/dailyCleanup').startDailyCleanup()"

# Test with dry run
const queues = require('./workers/queue/queueManager');
await queues.cleanup.add('test', { type: 'logs', olderThan: 0, dryRun: true });
```
