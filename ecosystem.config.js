module.exports = {
  apps: [{
    name: 'hacker-news-analytics',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      PORT: 5000,
      MONGO_URI: 'mongodb://localhost:27017/hackernews'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 80,
      MONGO_URI: 'mongodb://localhost:27017/hackernews'
    }
  }],

  deploy: {
    production: {
      user: 'root',
      host: 'cf',
      ref: 'origin/master',
      repo: 'https://github.com/christian-fei/hacker-news-analytics.git',
      path: '/root/apps/hacker-news-analytics',
      'pre-deploy': 'mkdir -p /root/apps/hacker-news-analytics',
      'post-deploy': [
        'npm install',
        '(cd client && npm install && npm run build)',
        'pm2 stop ecosystem.config.js',
        'sleep 1',
        'pm2 startOrGracefulReload ecosystem.config.js --env production'
      ].join(' && ')
    }
  }
}
