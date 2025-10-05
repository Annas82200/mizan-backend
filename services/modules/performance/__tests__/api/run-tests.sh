#!/bin/bash

echo "🧪 Running Performance API Endpoint Tests..."
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
echo "🚀 Executing API tests..."
npm test

echo ""
echo "✅ Performance API endpoint tests complete!"

