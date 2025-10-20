#!/bin/bash

# Verification Script for Production Error Fixes
# Date: October 20, 2025
# Purpose: Verify all critical fixes are working correctly
# Compliant with AGENT_CONTEXT_ULTIMATE.md - Production-ready verification

set -e

echo "🔍 Mizan Platform - Fix Verification Script"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-https://mizan-api.railway.app}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Warning: AUTH_TOKEN not set. Some tests will be skipped.${NC}"
    echo "   Set it with: export AUTH_TOKEN='your-token-here'"
    echo ""
fi

# Test counter
PASSED=0
FAILED=0
SKIPPED=0

# Test 1: Database Migration - Notes Column
echo "Test 1: Checking notes column in demo_requests table..."
if [ ! -z "$DATABASE_URL" ]; then
    COLUMN_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demo_requests' AND column_name = 'notes');" 2>&1)
    
    if echo "$COLUMN_EXISTS" | grep -q "t"; then
        echo -e "${GREEN}✅ PASS: notes column exists${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL: notes column does not exist${NC}"
        echo "   Run: psql \$DATABASE_URL -f backend/db/migrations/add_notes_to_demo_requests.sql"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⏭️  SKIP: DATABASE_URL not set${NC}"
    ((SKIPPED++))
fi
echo ""

# Test 2: Demo Requests API Endpoint
echo "Test 2: Testing demo requests API endpoint..."
if [ ! -z "$AUTH_TOKEN" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/demo/requests" \
        -H "Authorization: Bearer $AUTH_TOKEN" 2>&1 || echo "500")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ PASS: Demo requests API returns 200${NC}"
        ((PASSED++))
    elif [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "401" ]; then
        echo -e "${YELLOW}⚠️  SKIP: Authentication issue (${HTTP_CODE})${NC}"
        echo "   Verify AUTH_TOKEN is valid and has superadmin role"
        ((SKIPPED++))
    else
        echo -e "${RED}❌ FAIL: Demo requests API returned ${HTTP_CODE}${NC}"
        echo "$RESPONSE" | head -n-1
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⏭️  SKIP: AUTH_TOKEN not set${NC}"
    ((SKIPPED++))
fi
echo ""

# Test 3: API Stats Validation
echo "Test 3: Testing API stats endpoint response structure..."
if [ ! -z "$AUTH_TOKEN" ]; then
    RESPONSE=$(curl -s -X GET "$API_URL/api/superadmin/analytics/api" \
        -H "Authorization: Bearer $AUTH_TOKEN" 2>&1)
    
    # Check for required fields
    HAS_REQUESTS=$(echo "$RESPONSE" | grep -o '"requests"' | wc -l)
    HAS_AVERAGE_TIME=$(echo "$RESPONSE" | grep -o '"averageTime"' | wc -l)
    HAS_ERROR_COUNT=$(echo "$RESPONSE" | grep -o '"errorCount"' | wc -l)
    
    if [ "$HAS_REQUESTS" -gt 0 ] && [ "$HAS_AVERAGE_TIME" -gt 0 ] && [ "$HAS_ERROR_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ PASS: API stats includes all required fields${NC}"
        echo "   - requests: ✓"
        echo "   - averageTime: ✓"
        echo "   - errorCount: ✓"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL: API stats missing required fields${NC}"
        echo "   - requests: $([ "$HAS_REQUESTS" -gt 0 ] && echo '✓' || echo '✗')"
        echo "   - averageTime: $([ "$HAS_AVERAGE_TIME" -gt 0 ] && echo '✓' || echo '✗')"
        echo "   - errorCount: $([ "$HAS_ERROR_COUNT" -gt 0 ] && echo '✓' || echo '✗')"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⏭️  SKIP: AUTH_TOKEN not set${NC}"
    ((SKIPPED++))
fi
echo ""

# Test 4: CORS Configuration
echo "Test 4: Testing CORS headers configuration..."
CORS_RESPONSE=$(curl -s -I -X OPTIONS "$API_URL/api/demo/requests" \
    -H "Origin: https://www.mizan.work" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: X-Tenant-Id,Authorization" 2>&1)

if echo "$CORS_RESPONSE" | grep -iq "access-control-expose-headers.*X-Tenant-Id"; then
    echo -e "${GREEN}✅ PASS: X-Tenant-Id in exposed headers${NC}"
    ((PASSED++))
elif echo "$CORS_RESPONSE" | grep -iq "access-control-allow-headers"; then
    echo -e "${YELLOW}⚠️  PARTIAL: CORS configured but X-Tenant-Id not in exposed headers${NC}"
    echo "   Check backend/index.ts exposedHeaders configuration"
    ((FAILED++))
else
    echo -e "${RED}❌ FAIL: CORS headers not properly configured${NC}"
    ((FAILED++))
fi
echo ""

# Test 5: Structure Analysis Confidence Threshold
echo "Test 5: Checking structure agent configuration..."
THRESHOLD=$(grep -A 5 "consensusThreshold" backend/src/services/agents/structure-agent.ts | grep "consensusThreshold" | grep -o "0\.[0-9]*")

if [ "$THRESHOLD" = "0.75" ]; then
    echo -e "${GREEN}✅ PASS: Consensus threshold set to 0.75${NC}"
    ((PASSED++))
elif [ "$THRESHOLD" = "0.8" ]; then
    echo -e "${RED}❌ FAIL: Consensus threshold still at 0.8${NC}"
    echo "   Expected: 0.75"
    ((FAILED++))
else
    echo -e "${YELLOW}⚠️  WARNING: Unexpected threshold value: ${THRESHOLD}${NC}"
    ((FAILED++))
fi
echo ""

# Test 6: Social Media Endpoints
echo "Test 6: Testing social media endpoints existence..."
if [ ! -z "$AUTH_TOKEN" ]; then
    POSTS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/api/social-media/posts" \
        -H "Authorization: Bearer $AUTH_TOKEN" 2>&1)
    
    STRATEGY_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/api/social-media/strategy" \
        -H "Authorization: Bearer $AUTH_TOKEN" 2>&1)
    
    if [ "$POSTS_CODE" = "200" ] && [ "$STRATEGY_CODE" = "200" ]; then
        echo -e "${GREEN}✅ PASS: Social media endpoints responding${NC}"
        echo "   - /api/social-media/posts: 200"
        echo "   - /api/social-media/strategy: 200"
        ((PASSED++))
    elif [ "$POSTS_CODE" = "401" ] || [ "$STRATEGY_CODE" = "401" ]; then
        echo -e "${YELLOW}⚠️  SKIP: Authentication required${NC}"
        ((SKIPPED++))
    else
        echo -e "${RED}❌ FAIL: Social media endpoints not responding correctly${NC}"
        echo "   - /api/social-media/posts: $POSTS_CODE"
        echo "   - /api/social-media/strategy: $STRATEGY_CODE"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⏭️  SKIP: AUTH_TOKEN not set${NC}"
    ((SKIPPED++))
fi
echo ""

# Test 7: Agent Stats Success Rate Format
echo "Test 7: Testing agent stats success rate format..."
if [ ! -z "$AUTH_TOKEN" ]; then
    RESPONSE=$(curl -s -X GET "$API_URL/api/superadmin/analytics/agents" \
        -H "Authorization: Bearer $AUTH_TOKEN" 2>&1)
    
    SUCCESS_RATE=$(echo "$RESPONSE" | grep -o '"successRate":[0-9.]*' | grep -o '[0-9.]*$')
    
    if [ ! -z "$SUCCESS_RATE" ]; then
        # Check if it's a decimal (0-1) not a percentage (0-100)
        if (( $(echo "$SUCCESS_RATE < 2" | bc -l) )); then
            echo -e "${GREEN}✅ PASS: Success rate is decimal format (${SUCCESS_RATE})${NC}"
            ((PASSED++))
        else
            echo -e "${RED}❌ FAIL: Success rate appears to be percentage (${SUCCESS_RATE})${NC}"
            echo "   Expected: 0.0-1.0, Got: ${SUCCESS_RATE}"
            ((FAILED++))
        fi
    else
        echo -e "${YELLOW}⚠️  WARNING: Could not extract success rate from response${NC}"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⏭️  SKIP: AUTH_TOKEN not set${NC}"
    ((SKIPPED++))
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed:  ${PASSED}${NC}"
echo -e "${RED}Failed:  ${FAILED}${NC}"
echo -e "${YELLOW}Skipped: ${SKIPPED}${NC}"
echo ""

TOTAL=$((PASSED + FAILED + SKIPPED))
SUCCESS_RATE=$((PASSED * 100 / (PASSED + FAILED)))

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! (${SUCCESS_RATE}% success rate)${NC}"
    exit 0
elif [ $PASSED -gt $FAILED ]; then
    echo -e "${YELLOW}⚠️  Some tests failed (${SUCCESS_RATE}% success rate)${NC}"
    echo "   Review failed tests above and apply necessary fixes"
    exit 1
else
    echo -e "${RED}❌ Most tests failed (${SUCCESS_RATE}% success rate)${NC}"
    echo "   Critical issues detected. Review all failed tests"
    exit 2
fi

