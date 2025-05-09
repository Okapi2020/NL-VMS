#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_KEY="vms-dev-api-key-2025" # Default development API key
BASE_URL="http://localhost:5000"

# Function to test an endpoint
test_endpoint() {
  local endpoint=$1
  local method=${2:-GET}
  local expected_status=${3:-200}
  local payload=$4
  
  echo -e "${BLUE}Testing $method $endpoint${NC}"
  
  # Create the curl command
  cmd="curl -s -o response.json -w '%{http_code}' -X $method"
  cmd="$cmd -H 'X-API-Key: $API_KEY'"
  cmd="$cmd -H 'Content-Type: application/json'"
  
  # Add payload if provided
  if [ ! -z "$payload" ]; then
    cmd="$cmd -d '$payload'"
  fi
  
  # Append the URL
  cmd="$cmd $BASE_URL$endpoint"
  
  # Execute and capture the status code
  status_code=$(eval $cmd)
  
  # Check if status code matches expected
  if [ "$status_code" -eq "$expected_status" ]; then
    echo -e "${GREEN}✓ Success ($status_code)${NC}"
    cat response.json | grep -v "password\|secret" | head -30 # Show partial response
    echo "..."
  else
    echo -e "${RED}✗ Failed - Expected $expected_status but got $status_code${NC}"
    cat response.json
  fi
  echo ""
}

echo -e "${BLUE}=== Testing Visitor Management System API ===${NC}"
echo -e "Base URL: $BASE_URL"
echo -e "API Key: $API_KEY"
echo -e "\n${BLUE}=== Core API Endpoints ===${NC}"

# Test all visitors endpoint
test_endpoint "/api/external/visitors?limit=5"

# Test search visitors endpoint
test_endpoint "/api/external/visitors/search?name=John&limit=5"

# Test onsite visitors endpoint
test_endpoint "/api/external/visitors/onsite?limit=5"

# Test visits endpoint
test_endpoint "/api/external/visits?limit=5"

# Test statistics endpoint
test_endpoint "/api/external/statistics"

# Test webhooks endpoint
test_endpoint "/api/external/webhooks"

echo -e "\n${BLUE}=== Summary ===${NC}"
echo -e "${GREEN}All tests completed. Please review each endpoint's response for correctness.${NC}"

# Clean up
rm response.json