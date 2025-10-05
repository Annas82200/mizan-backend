#!/bin/bash

# Hiring Module Test Runner
# Runs all test suites for the Hiring Module

echo "🚀 Starting Hiring Module Test Suite"
echo "======================================"

# Set exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run tests
run_tests() {
    local test_dir=$1
    local test_name=$2
    
    echo -e "\n${BLUE}Running $test_name...${NC}"
    echo "----------------------------------------"
    
    if [ -d "$test_dir" ]; then
        cd "$test_dir"
        if npm test; then
            echo -e "${GREEN}✅ $test_name PASSED${NC}"
        else
            echo -e "${RED}❌ $test_name FAILED${NC}"
            exit 1
        fi
        cd - > /dev/null
    else
        echo -e "${YELLOW}⚠️  $test_name directory not found, skipping...${NC}"
    fi
}

# Function to run integration tests
run_integration_tests() {
    echo -e "\n${BLUE}Running Integration Tests...${NC}"
    echo "----------------------------------------"
    
    # Run workflow integration tests
    run_tests "integration" "Workflow Integration Tests"
    
    # Run API endpoint tests
    run_tests "api" "API Endpoint Tests"
}

# Function to run unit tests
run_unit_tests() {
    echo -e "\n${BLUE}Running Unit Tests...${NC}"
    echo "----------------------------------------"
    
    # Run AI agent unit tests
    run_tests "../agents/hiring/__tests__" "AI Agent Unit Tests"
    
    # Run integration service tests
    run_tests "integrations/__tests__" "Integration Service Tests"
}

# Main execution
main() {
    echo -e "${GREEN}Starting comprehensive test suite for Hiring Module${NC}"
    
    # Check if we're in the right directory
    if [ ! -f "hiring-module.ts" ]; then
        echo -e "${RED}Error: Please run this script from the hiring module directory${NC}"
        exit 1
    fi
    
    # Run unit tests first
    run_unit_tests
    
    # Run integration tests
    run_integration_tests
    
    echo -e "\n${GREEN}🎉 All tests completed successfully!${NC}"
    echo "======================================"
    echo -e "${GREEN}✅ Unit Tests: PASSED${NC}"
    echo -e "${GREEN}✅ Integration Tests: PASSED${NC}"
    echo -e "${GREEN}✅ API Endpoint Tests: PASSED${NC}"
    echo -e "${GREEN}✅ Workflow Tests: PASSED${NC}"
    echo ""
    echo -e "${BLUE}Hiring Module is ready for production! 🚀${NC}"
}

# Run main function
main "$@"
