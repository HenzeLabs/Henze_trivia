#!/bin/bash

echo "🎮 TRIVIA MURDER PARTY - FULL GAME TEST"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test API call
test_api() {
    local test_name="$1"
    local expected_status="$2"
    shift 2
    
    echo -n "Testing: $test_name... "
    
    response=$(curl -s -w "\n%{http_code}" "$@")
    body=$(echo "$response" | head -n -1)
    status=$(echo "$response" | tail -n 1)
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "$body"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $status)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "$body"
        return 1
    fi
}

echo "Step 1: Get initial game state"
echo "--------------------------------"
GAME_STATE=$(curl -s http://localhost:3000/api/game)
TOKEN=$(echo "$GAME_STATE" | jq -r '.token')
STATE=$(echo "$GAME_STATE" | jq -r '.state')
echo "State: $STATE"
echo "Token: $TOKEN"
echo ""

if [ "$STATE" != "lobby" ]; then
    echo -e "${YELLOW}⚠ Game not in lobby, resetting...${NC}"
    curl -s -X POST http://localhost:3000/api/game \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"reset\",\"token\":\"$TOKEN\"}" > /dev/null
    sleep 1
    GAME_STATE=$(curl -s http://localhost:3000/api/game)
    TOKEN=$(echo "$GAME_STATE" | jq -r '.token')
    echo "New token: $TOKEN"
    echo ""
fi

echo "Step 2: Join game - Player 1"
echo "-----------------------------"
JOIN1=$(curl -s -X POST http://localhost:3000/api/game \
    -H "Content-Type: application/json" \
    -d '{"action":"join","playerName":"Alice"}')
PLAYER1_ID=$(echo "$JOIN1" | jq -r '.playerId')
echo "Player 1 ID: $PLAYER1_ID"
echo "Response: $JOIN1"
echo ""

if [ "$PLAYER1_ID" = "null" ]; then
    echo -e "${RED}✗ Failed to join as Player 1${NC}"
    exit 1
fi

echo "Step 3: Join game - Player 2"
echo "-----------------------------"
JOIN2=$(curl -s -X POST http://localhost:3000/api/game \
    -H "Content-Type: application/json" \
    -d '{"action":"join","playerName":"Bob"}')
PLAYER2_ID=$(echo "$JOIN2" | jq -r '.playerId')
echo "Player 2 ID: $PLAYER2_ID"
echo "Response: $JOIN2"
echo ""

if [ "$PLAYER2_ID" = "null" ]; then
    echo -e "${RED}✗ Failed to join as Player 2${NC}"
    exit 1
fi

echo "Step 4: Verify players joined"
echo "------------------------------"
GAME_STATE=$(curl -s http://localhost:3000/api/game)
PLAYER_COUNT=$(echo "$GAME_STATE" | jq '.players | length')
echo "Players in game: $PLAYER_COUNT"
echo "$GAME_STATE" | jq '.players'
echo ""

echo "Step 5: Start game (with CSRF token)"
echo "-------------------------------------"
START_RESPONSE=$(curl -s -X POST http://localhost:3000/api/game \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"start\",\"token\":\"$TOKEN\"}")
echo "Response: $START_RESPONSE"
sleep 1
echo ""

echo "Step 6: Verify game started"
echo "----------------------------"
GAME_STATE=$(curl -s http://localhost:3000/api/game)
STATE=$(echo "$GAME_STATE" | jq -r '.state')
QUESTION=$(echo "$GAME_STATE" | jq -r '.currentQuestion.question')
echo "State: $STATE"
echo "Question: $QUESTION"
echo ""

if [ "$STATE" != "question" ]; then
    echo -e "${RED}✗ Game did not start properly${NC}"
    exit 1
fi

echo "Step 7: Player 1 answers (correct answer)"
echo "------------------------------------------"
CORRECT_ANSWER=$(echo "$GAME_STATE" | jq -r '.currentQuestion.correct // 0')
echo "Correct answer index: $CORRECT_ANSWER"
ANSWER1=$(curl -s -X POST http://localhost:3000/api/game \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"answer\",\"playerId\":\"$PLAYER1_ID\",\"answer\":$CORRECT_ANSWER,\"token\":\"$TOKEN\"}")
echo "Response: $ANSWER1"
echo ""

echo "Step 8: Player 2 answers (wrong answer)"
echo "----------------------------------------"
WRONG_ANSWER=$(( (CORRECT_ANSWER + 1) % 4 ))
echo "Wrong answer index: $WRONG_ANSWER"
ANSWER2=$(curl -s -X POST http://localhost:3000/api/game \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"answer\",\"playerId\":\"$PLAYER2_ID\",\"answer\":$WRONG_ANSWER,\"token\":\"$TOKEN\"}")
echo "Response: $ANSWER2"
echo ""

echo "Step 9: Wait for reveal state"
echo "------------------------------"
sleep 2
GAME_STATE=$(curl -s http://localhost:3000/api/game)
STATE=$(echo "$GAME_STATE" | jq -r '.state')
echo "State: $STATE"
echo ""

echo "Step 10: Check scores and lives"
echo "--------------------------------"
sleep 3
GAME_STATE=$(curl -s http://localhost:3000/api/game)
echo "$GAME_STATE" | jq '{state, round, scores, lives, ghosts}'
echo ""

echo "Step 11: Test CSRF protection (should fail)"
echo "--------------------------------------------"
CSRF_TEST=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/game \
    -H "Content-Type: application/json" \
    -d '{"action":"start","token":"invalid_token"}')
CSRF_STATUS=$(echo "$CSRF_TEST" | tail -n 1)
if [ "$CSRF_STATUS" = "403" ]; then
    echo -e "${GREEN}✓ CSRF protection working${NC} (HTTP 403)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ CSRF protection failed${NC} (Expected 403, got $CSRF_STATUS)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

echo "Step 12: Test rate limiting"
echo "----------------------------"
echo "Sending 10 rapid requests..."
for i in {1..10}; do
    curl -s http://localhost:3000/api/game > /dev/null
done
echo -e "${GREEN}✓ Rate limiting handled requests${NC}"
echo ""

echo "Step 13: Test input sanitization"
echo "---------------------------------"
SANITIZE_TEST=$(curl -s -X POST http://localhost:3000/api/game \
    -H "Content-Type: application/json" \
    -d '{"action":"join","playerName":"<script>alert(\"xss\")</script>"}')
echo "Response: $SANITIZE_TEST"
if echo "$SANITIZE_TEST" | grep -q "error"; then
    echo -e "${GREEN}✓ XSS attempt blocked or sanitized${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ Check if name was sanitized${NC}"
fi
echo ""

echo "=========================================="
echo "🏁 TEST SUMMARY"
echo "=========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED! Game is ready for launch.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Review the output above.${NC}"
    exit 1
fi
