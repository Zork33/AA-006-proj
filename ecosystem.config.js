module.exports = {
  apps: [{
    name: 'vsyak-backend',
    script: './packages/backend/src/index.ts',
    interpreter: 'node',
    args: '--import tsx',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '256M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
  }],
};
