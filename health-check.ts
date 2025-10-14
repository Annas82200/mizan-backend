// Health check script for Docker/Railway deployment
// AGENT_CONTEXT_ULTIMATE.md compliance - Production-ready patterns

import http from 'http';

const PORT = process.env.PORT || 3001;
const HEALTH_CHECK_TIMEOUT = 5000;

const options = {
  hostname: 'localhost',
  port: PORT,
  path: '/health',
  method: 'GET',
  timeout: HEALTH_CHECK_TIMEOUT,
};

const healthCheck = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    console.error(`Health check failed with status: ${res.statusCode}`);
    process.exit(1);
  }
});

healthCheck.on('error', (err) => {
  console.error('Health check failed:', err.message);
  process.exit(1);
});

healthCheck.on('timeout', () => {
  console.error('Health check timeout');
  healthCheck.destroy();
  process.exit(1);
});

healthCheck.end();

