#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_KEY="vms-dev-api-key-2025" # Default development API key
BASE_URL="http://localhost:5000"

echo -e "${BLUE}=== Testing Webhook Functionality ===${NC}"

# Create a test webhook
echo -e "${BLUE}Creating test webhook...${NC}"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/external/webhooks" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/test-webhook-endpoint",
    "secret": "test-webhook-secret-123",
    "description": "Test webhook for API verification",
    "events": ["visitor.checkin", "visitor.checkout"],
    "active": true
  }')

echo "$CREATE_RESPONSE" | grep -v "secret"

# Try to extract the webhook ID using grep and cut
WEBHOOK_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$WEBHOOK_ID" ]; then
  echo -e "${RED}Failed to create webhook or extract webhook ID${NC}"
  exit 1
fi

echo -e "${GREEN}Successfully created webhook with ID: $WEBHOOK_ID${NC}"

# Update the webhook
echo -e "\n${BLUE}Updating test webhook...${NC}"
UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/external/webhooks/$WEBHOOK_ID" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated test webhook description",
    "events": ["visitor.checkin", "visitor.checkout", "visitor.verified"]
  }')

echo "$UPDATE_RESPONSE" | grep -v "secret"

# Check if the update was successful
if echo "$UPDATE_RESPONSE" | grep -q "Updated test webhook description"; then
  echo -e "${GREEN}Successfully updated webhook${NC}"
else
  echo -e "${RED}Failed to update webhook${NC}"
fi

# Get webhook details
echo -e "\n${BLUE}Retrieving webhook details...${NC}"
GET_RESPONSE=$(curl -s -X GET "$BASE_URL/api/external/webhooks/$WEBHOOK_ID" \
  -H "X-API-Key: $API_KEY")

echo "$GET_RESPONSE" | grep -v "secret"

# Delete the webhook
echo -e "\n${BLUE}Deleting test webhook...${NC}"
DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/external/webhooks/$WEBHOOK_ID" \
  -H "X-API-Key: $API_KEY")

echo "$DELETE_RESPONSE"

# Check if the deletion was successful
if echo "$DELETE_RESPONSE" | grep -q "true"; then
  echo -e "${GREEN}Successfully deleted webhook${NC}"
else
  echo -e "${RED}Failed to delete webhook${NC}"
fi

echo -e "\n${BLUE}=== Webhook Testing Complete ===${NC}"