# PM2 Deployment Guide

## Starting the Application

### Development
```bash
# Start all services
pm2 start ecosystem.config.js

# Start specific service
pm2 start ecosystem.config.js --only backend-api
```

### Production
```bash
# Start in production mode
pm2 start ecosystem.config.js --env production
```

## Managing Services

### View Status
```bash
pm2 list
pm2 status
```

### View Logs
```bash
# All services
pm2 logs

# Specific service
pm2 logs backend-api
pm2 logs worker-manager
pm2 logs cron-manager
```

### Restart Services
```bash
# Restart all
pm2 restart all

# Restart specific
pm2 restart backend-api
```

### Stop Services
```bash
# Stop all
pm2 stop all

# Stop specific
pm2 stop worker-manager
```

### Delete Services
```bash
pm2 delete all
```

## Monitoring

### Real-time Monitoring
```bash
pm2 monit
```

### Web Dashboard (Optional)
```bash
pm2 web
# Access at http://localhost:9615
```

## Auto-restart on System Reboot
```bash
# Save current PM2 config
pm2 save

# Setup startup script
pm2 startup

# Follow the instructions shown
```

## Cluster Mode

The backend-api runs in cluster mode for high availability:
- **Development**: 1 instance
- **Production**: Max instances (based on CPU cores)

## Memory Management

Services auto-restart if memory exceeds 500MB:
```javascript
max_memory_restart: '500M'
```

## Log Management

Logs are stored in `/logs` directory:
- `pm2-error.log` - Backend errors
- `pm2-out.log` - Backend output
- `workers-error.log` - Worker errors
- `workers-out.log` - Worker output
- `cron-error.log` - Cron errors
- `cron-out.log` - Cron output

## Troubleshooting

### Service won't start
```bash
# Check logs
pm2 logs backend-api --err

# Check environment
pm2 env backend-api
```

### High memory usage
```bash
# View memory usage
pm2 list

# Restart to free memory
pm2 restart backend-api
```

### Cron not running
```bash
# Check cron manager status
pm2 describe cron-manager

# View cron logs
pm2 logs cron-manager
```
