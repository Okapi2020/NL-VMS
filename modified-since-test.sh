#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_KEY="vms-dev-api-key-2025" # Default development API key
BASE_URL="http://localhost:5000"

echo -e "${BLUE}=== Testing Modified Since API Feature ===${NC}"

# Get current timestamp
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 1. First, get all visitors without modified_since filter
echo -e "${BLUE}Getting all visitors (baseline)...${NC}"
ALL_RESPONSE=$(curl -s -X GET "$BASE_URL/api/external/visitors?limit=5" \
  -H "X-API-Key: $API_KEY")

TOTAL_COUNT=$(echo "$ALL_RESPONSE" | grep -o '"total":"[0-9]*"' | grep -o '[0-9]*')

echo -e "${GREEN}Total visitors: $TOTAL_COUNT${NC}"

# 2. Now, query with a modifiedSince filter set to 1 year ago (should return all)
ONE_YEAR_AGO=$(date -u -d "1 year ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v-1y +"%Y-%m-%dT%H:%M:%SZ")
echo -e "\n${BLUE}Getting visitors modified since 1 year ago ($ONE_YEAR_AGO)...${NC}"
YEAR_RESPONSE=$(curl -s -X GET "$BASE_URL/api/external/visitors?limit=5&modifiedSince=$ONE_YEAR_AGO" \
  -H "X-API-Key: $API_KEY")

YEAR_COUNT=$(echo "$YEAR_RESPONSE" | grep -o '"total":"[0-9]*"' | grep -o '[0-9]*')

echo -e "${GREEN}Visitors modified in past year: $YEAR_COUNT${NC}"

# 3. Query with modified since now (should return none)
echo -e "\n${BLUE}Getting visitors modified since now ($NOW)...${NC}"
NOW_RESPONSE=$(curl -s -X GET "$BASE_URL/api/external/visitors?limit=5&modifiedSince=$NOW" \
  -H "X-API-Key: $API_KEY")

NOW_COUNT=$(echo "$NOW_RESPONSE" | grep -o '"total":"[0-9]*"' | grep -o '[0-9]*')

echo -e "${GREEN}Visitors modified since now: $NOW_COUNT${NC}"

if [ "$YEAR_COUNT" -gt "0" ] && [ "$NOW_COUNT" -eq "0" ]; then
  echo -e "${GREEN}✓ Modified Since filter functioning correctly!${NC}"
else
  echo -e "${RED}✗ Modified Since filter test results inconsistent${NC}"
fi

echo -e "\n${BLUE}=== Modified Since Testing Complete ===${NC}"