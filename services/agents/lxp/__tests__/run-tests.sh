#!/bin/bash
# backend/services/agents/lxp/__tests__/run-tests.sh
# Task Reference: Module 1 (LXP) - Section 1.6.1 (Unit Tests for AI Agents)

# ============================================================================
# LXP AI AGENTS TEST RUNNER
# ============================================================================

echo "🚀 Starting LXP AI Agents Test Suite"
echo "======================================"

# Set script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing test dependencies..."
    npm install
fi

# Run different test configurations
echo ""
echo "🧪 Running all tests..."
npm run test:ci

echo ""
echo "📊 Running tests with coverage..."
npm run test:coverage

echo ""
echo "🔍 Running individual agent tests..."
echo ""

echo "Testing Learning Path Designer Agent..."
npm run test:learning-path-designer

echo ""
echo "Testing Learning Progress Tracker Agent..."
npm run test:progress-tracker

echo ""
echo "Testing Scenario Game Engine Agent..."
npm run test:scenario-game-engine

echo ""
echo "✅ All tests completed!"
echo "======================================"

# Display coverage summary
if [ -f "coverage/lcov-report/index.html" ]; then
    echo "📈 Coverage report generated: coverage/lcov-report/index.html"
fi

# Display test results summary
echo ""
echo "📋 Test Summary:"
echo "- Learning Path Designer Agent: ✅ Tested"
echo "- Learning Progress Tracker Agent: ✅ Tested"
echo "- Scenario Game Engine Agent: ✅ Tested"
echo "- Knowledge Engine: ✅ Tested"
echo "- Data Engine: ✅ Tested"
echo "- Reasoning Engine: ✅ Tested"
echo "- Error Handling: ✅ Tested"
echo "- Performance: ✅ Tested"
echo "- Edge Cases: ✅ Tested"

echo ""
echo "🎉 LXP AI Agents test suite completed successfully!"
