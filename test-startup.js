// Minimal test to verify Node.js execution and logging in Docker
console.log('==== TEST STARTUP SCRIPT ====');
console.log('If you see this, Node.js is executing and logs are being captured');
console.log('Node version:', process.version);
console.log('Working directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV);
console.log('==== TEST COMPLETE ====');

// Keep process alive for 10 seconds to allow health check
setTimeout(() => {
  console.log('Test script exiting after 10 seconds');
  process.exit(0);
}, 10000);

