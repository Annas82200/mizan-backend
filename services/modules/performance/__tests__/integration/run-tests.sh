#!/bin/bash

echo "🧪 Running Performance Workflow Integration Tests..."
echo ""

# Navigate to test directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing test dependencies..."
  npm install
  echo ""
fi

# Run tests
echo "🚀 Executing integration tests..."
npm test

echo ""
echo "✅ Performance Workflow integration tests complete!"

