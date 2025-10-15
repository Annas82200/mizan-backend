#!/bin/bash

# Railway Deployment Fix Verification Script
# AGENT_CONTEXT_ULTIMATE.md Compliance Check

echo "=================================================="
echo "🔍 Railway Deployment Fix Verification"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Function to check for pattern in file
check_pattern() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✅ PASS${NC}: $description"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $description"
        echo "   Expected pattern: $pattern"
        echo "   File: $file"
        ((FAILED++))
    fi
}

# Check TypeScript source files
echo "📝 Checking TypeScript source files..."
echo ""

check_pattern "index.ts" "0\.0\.0\.0" "Server binds to 0.0.0.0"
check_pattern "index.ts" "const HOST = process\.env\.HOST" "HOST environment variable support"
check_pattern "index.ts" "app\.listen(PORT, HOST" "Server listen with HOST parameter"
check_pattern "index.ts" "Database connection attempt" "Database retry logic present"
check_pattern "index.ts" "maxRetries = 3" "Database has 3 retry attempts"
check_pattern "index.ts" "parseInt(process\.env\.PORT" "PORT parsed as integer"
check_pattern "health-check.ts" "attemptHealthCheck" "Health check retry function"
check_pattern "health-check.ts" "parseInt(process\.env\.PORT" "Health check PORT parsed"

echo ""
echo "🏗️  Checking compiled JavaScript files..."
echo ""

check_pattern "dist/index.js" "0\.0\.0\.0" "Compiled: Server binds to 0.0.0.0"
check_pattern "dist/index.js" "Database connection attempt" "Compiled: Database retry logic"
check_pattern "dist/health-check.js" "attemptHealthCheck" "Compiled: Health check retry"

echo ""
echo "🐳 Checking Docker configuration..."
echo ""

check_pattern "Dockerfile.prod" "start-period=30s" "Docker health check start period"
check_pattern "Dockerfile.prod" "timeout=10s" "Docker health check timeout"
check_pattern "Dockerfile.prod" "EXPOSE 3001" "Docker port exposed"

echo ""
echo "📦 Checking build output..."
echo ""

if [ -f "dist/index.js" ]; then
    echo -e "${GREEN}✅ PASS${NC}: dist/index.js exists"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}: dist/index.js missing - run 'npm run build'"
    ((FAILED++))
fi

if [ -f "dist/health-check.js" ]; then
    echo -e "${GREEN}✅ PASS${NC}: dist/health-check.js exists"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}: dist/health-check.js missing - run 'npm run build'"
    ((FAILED++))
fi

if [ -d "dist/src" ]; then
    echo -e "${GREEN}✅ PASS${NC}: dist/src directory exists"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}: dist/src directory missing"
    ((FAILED++))
fi

echo ""
echo "=================================================="
echo "📊 Verification Results"
echo "=================================================="
echo ""
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed!${NC}"
    echo -e "${GREEN}✅ Ready for Railway deployment${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. git add backend/"
    echo "  2. git commit -m 'fix(backend): Railway deployment fixes'"
    echo "  3. git push origin main"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some checks failed${NC}"
    echo ""
    echo "Please review the failures above and:"
    echo "  1. Ensure all TypeScript files are saved"
    echo "  2. Run: npm run build"
    echo "  3. Run this script again"
    echo ""
    exit 1
fi

