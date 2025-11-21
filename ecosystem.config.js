cat > ecosystem.config.js << 'EOF'
// ecosystem.config.js - PM2 Configuration
module.exports = {
  apps: [
    {
      name: 'backend-api',
      script: './server.js',
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      watch: false,
      autorestart: true,
    },
    {
      name: 'worker-manager',
      script: './workers/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/workers-error.log',
      out_file: './logs/workers-out.log',
      autorestart: true,
    },
    {
      name: 'cron-manager',
      script: './cron/index.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 0 * * *', // Restart daily at midnight
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/cron-error.log',
      out_file: './logs/cron-out.log',
      autorestart: true,
    },
  ],
};
