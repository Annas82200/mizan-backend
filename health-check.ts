// Health check script for Docker/Railway deployment
// AGENT_CONTEXT_ULTIMATE.md compliance - Production-ready patterns

import http from 'http';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HEALTH_CHECK_TIMEOUT = 5000;

// Try both localhost and 127.0.0.1 for compatibility
const hosts = ['127.0.0.1', 'localhost'];
let currentHostIndex = 0;

function attemptHealthCheck(hostname: string): void {
  const options = {
    hostname,
    port: PORT,
    path: '/health',
    method: 'GET',
    timeout: HEALTH_CHECK_TIMEOUT,
  };

  console.log(`Attempting health check on ${hostname}:${PORT}/health`);

  const healthCheck = http.request(options, (res) => {
    console.log(`Health check status: ${res.statusCode}`);
    
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Health check passed:', body);
        process.exit(0);
      } else {
        console.error(`❌ Health check failed with status: ${res.statusCode}`);
        console.error('Response body:', body);
        process.exit(1);
      }
    });
  });

  healthCheck.on('error', (err) => {
    console.error(`❌ Health check failed on ${hostname}:`, err.message);
    
    // Try next host if available
    currentHostIndex++;
    if (currentHostIndex < hosts.length) {
      console.log(`Trying alternative host...`);
      attemptHealthCheck(hosts[currentHostIndex]);
    } else {
      console.error('❌ All health check attempts failed');
      process.exit(1);
    }
  });

  healthCheck.on('timeout', () => {
    console.error(`❌ Health check timeout on ${hostname}`);
    healthCheck.destroy();
    
    // Try next host if available
    currentHostIndex++;
    if (currentHostIndex < hosts.length) {
      console.log(`Trying alternative host...`);
      attemptHealthCheck(hosts[currentHostIndex]);
    } else {
      console.error('❌ All health check attempts timed out');
      process.exit(1);
    }
  });

  healthCheck.end();
}

// Start health check
attemptHealthCheck(hosts[currentHostIndex]);

