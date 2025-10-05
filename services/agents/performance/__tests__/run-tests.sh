#!/bin/bash

echo "🧪 Running Performance AI Agent Unit Tests..."
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
echo "🚀 Executing tests..."
npm test

echo ""
echo "✅ Performance AI Agent tests complete!"

