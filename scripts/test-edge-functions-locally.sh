#!/bin/bash
# Test Edge Functions locally before deploying to production
# Usage: ./scripts/test-edge-functions-locally.sh

echo "🔍 Testing ChatGPT Plugin OAuth Edge Functions locally..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test function results
TESTS_PASSED=0
TESTS_FAILED=0

# Base URL for local Supabase
BASE_URL="http://127.0.0.1:54321/functions/v1/chatgpt-plugin-auth"

# Helper function to test an endpoint
test_endpoint() {
  local method=$1
  local path=$2
  local data=$3
  local expected_status=$4
  local test_name=$5

  echo -n "Testing $test_name... "

  if [ "$method" = "GET" ]; then
    status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL$path")
  else
    status=$(curl -s -o /dev/null -w '%{http_code}' -X "$method" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$BASE_URL$path")
  fi

  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✓${NC} (HTTP $status)"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗${NC} (Expected $expected_status, got $status)"
    ((TESTS_FAILED++))
  fi
}

echo "────────────────────────────────────────────────"
echo "GET /authorize (OAuth authorization endpoint)"
echo "────────────────────────────────────────────────"
echo ""

test_endpoint "GET" "/authorize" "" "400" "Missing redirect_uri"
test_endpoint "GET" "/authorize?redirect_uri=https://chat.openai.com/callback" "" "302" "Redirect to login when missing credentials"
test_endpoint "GET" "/authorize?redirect_uri=https://chat.openai.com/callback&email=test@example.com&password=invalid" "" "401" "Invalid credentials"

echo ""
echo "────────────────────────────────────────────────"
echo "POST /token (OAuth token endpoint)"
echo "────────────────────────────────────────────────"
echo ""

test_endpoint "POST" "/token" '{"grant_type":"password"}' "400" "Missing email in password grant"
test_endpoint "POST" "/token" '{"grant_type":"password","email":"test@example.com"}' "400" "Missing password"
test_endpoint "POST" "/token" '{"grant_type":"authorization_code"}' "400" "Missing code"
test_endpoint "POST" "/token" '{"grant_type":"refresh_token"}' "400" "Missing refresh_token"
test_endpoint "POST" "/token" '{"grant_type":"unsupported"}' "400" "Unsupported grant_type"

echo ""
echo "────────────────────────────────────────────────"
echo "Test Results"
echo "────────────────────────────────────────────────"
echo ""
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All local tests passed! Edge Functions are ready.${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Fix the errors before deploying.${NC}"
  exit 1
fi
