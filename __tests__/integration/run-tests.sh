#!/bin/bash

# Integration Test Runner
# Runs comprehensive API integration tests

echo "🚀 Starting API Integration Tests..."

# Set environment variables
export NODE_ENV=test
export DATABASE_URL="postgresql://test:test@localhost:5432/mizan_test"
export JWT_SECRET="test-jwt-secret"
export PORT=3001

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Run database migrations
echo "🗄️ Running database migrations..."
npm run migrate:test

# Run integration tests
echo "🧪 Running integration tests..."
npx jest --config=__tests__/integration/jest.config.js --verbose

# Check test results
if [ $? -eq 0 ]; then
  echo "✅ All integration tests passed!"
  exit 0
else
  echo "❌ Some integration tests failed!"
  exit 1
fi
