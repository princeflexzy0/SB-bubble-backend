# Workers Guide

## Available Workers

### 1. AI Orchestrator (`/workers/private/ai-orchestrator.js`)
Handles AI-related tasks:
- Data analysis
- Content generation
- Input classification

**Usage:**
```javascript
const queues = require('./workers/queue/queueManager');

await queues.aiOrchestrator.add('analyze-task', {
  action: 'analyze',
  payload: { data: 'your data here' }
});
```

### 2. Comparison Engine (`/workers/private/comparison-engine.js`)
Performs data comparisons:
- Deep comparison
- Structural comparison
- Semantic comparison

**Usage:**
```javascript
await queues.comparisonEngine.add('compare-task', {
  type: 'deep',
  dataA: { /* data */ },
  dataB: { /* data */ },
  options: { threshold: 0.8 }
});
```

### 3. Long Action Runner (`/workers/private/long-action-runner.js`)
Executes long-running tasks with progress tracking.

**Usage:**
```javascript
await queues.longAction.add('long-task', {
  action: 'process-batch',
  params: { batchSize: 1000 },
  timeoutMs: 30000
});
```

### 4. External Interaction (`/workers/private/external-interaction.js`)
Handles external API calls:
- Payment processing
- Notifications
- Storage operations
- Analytics tracking

**Usage:**
```javascript
await queues.externalInteraction.add('payment-task', {
  service: 'payment',
  action: 'process',
  payload: { amount: 100, currency: 'USD' }
});
```

### 5. Cleanup Worker (`/workers/private/cleanup.js`)
System maintenance tasks:
- Log cleanup
- Temp file removal
- Session cleanup
- Failed job cleanup

**Usage:**
```javascript
await queues.cleanup.add('cleanup-task', {
  type: 'logs',
  olderThan: 14 * 24 * 60 * 60 * 1000, // 14 days
  dryRun: false
});
```

## Starting Workers

### Development
```bash
node workers/index.js
```

### Production with PM2
```bash
pm2 start ecosystem.config.js
```

## Monitoring Workers

### View Queue Status
```javascript
const queues = require('./workers/queue/queueManager');

// Get waiting jobs
const waiting = await queues.aiOrchestrator.getWaiting();

// Get active jobs
const active = await queues.aiOrchestrator.getActive();

// Get failed jobs
const failed = await queues.aiOrchestrator.getFailed();
```

### Bull Board (Optional)
Install Bull Board for visual monitoring:
```bash
npm install bull-board
```

## Error Handling

All workers automatically:
- Log errors to Sentry
- Retry failed jobs (up to 3 times)
- Track execution time
- Report progress

## Performance Tuning

Configure concurrency in `queueManager.js`:
```javascript
queues.aiOrchestrator.process(5, async (job) => {
  // Process up to 5 jobs concurrently
});
```
