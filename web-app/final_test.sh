#!/bin/bash

echo "🎮 COMPREHENSIVE GAME TEST"
echo "=========================="
echo ""

# Reset game
echo "Resetting game..."
TOKEN=$(curl -s http://localhost:3000/api/game | jq -r '.token')
curl -s -X POST http://localhost:3000/api/game \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"reset\",\"token\":\"$TOKEN\"}" > /dev/null
sleep 1

# Get new token
TOKEN=$(curl -s http://localhost:3000/api/game | jq -r '.token')
echo "✓ Game reset, token: $TOKEN"
echo ""

# Join 2 players
echo "Joining players..."
P1=$(curl -s -X POST http://localhost:3000/api/game \
  -H "Content-Type: application/json" \
  -d '{"action":"join","playerName":"Alice"}' | jq -r '.playerId')
P2=$(curl -s -X POST http://localhost:3000/api/game \
  -H "Content-Type: application/json" \
  -d '{"action":"join","playerName":"Bob"}' | jq -r '.playerId')
echo "✓ Alice: $P1"
echo "✓ Bob: $P2"
echo ""

# Start game
echo "Starting game..."
curl -s -X POST http://localhost:3000/api/game \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"start\",\"token\":\"$TOKEN\"}" > /dev/null
sleep 1
echo "✓ Game started"
echo ""

# Play 3 rounds
for ROUND in 1 2 3; do
  echo "========== ROUND $ROUND =========="
  
  # Get current state
  GAME=$(curl -s http://localhost:3000/api/game)
  STATE=$(echo "$GAME" | jq -r '.state')
  QUESTION=$(echo "$GAME" | jq -r '.currentQuestion.question')
  
  echo "State: $STATE"
  echo "Question: ${QUESTION:0:60}..."
  echo ""
  
  if [ "$STATE" != "question" ]; then
    echo "❌ Not in question state!"
    break
  fi
  
  # Alice answers correctly (option 0)
  echo "Alice answering (option 0)..."
  RESP1=$(curl -s -X POST http://localhost:3000/api/game \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"answer\",\"playerId\":\"$P1\",\"answer\":0,\"token\":\"$TOKEN\"}")
  echo "$RESP1" | jq -c '{success, error}'
  
  # Check state after first answer
  STATE_AFTER_1=$(curl -s http://localhost:3000/api/game | jq -r '.state')
  echo "State after Alice: $STATE_AFTER_1"
  
  # Bob answers (option 1)
  echo "Bob answering (option 1)..."
  RESP2=$(curl -s -X POST http://localhost:3000/api/game \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"answer\",\"playerId\":\"$P2\",\"answer\":1,\"token\":\"$TOKEN\"}")
  echo "$RESP2" | jq -c '{success, error}'
  
  # Check state immediately after both answered
  sleep 0.5
  GAME=$(curl -s http://localhost:3000/api/game)
  STATE=$(echo "$GAME" | jq -r '.state')
  echo "State after both answered: $STATE"
  
  # Show scores and lives
  echo "$GAME" | jq '{round, scores, lives, ghosts}'
  echo ""
  
  # Wait for transition to next question
  if [ "$STATE" = "reveal" ]; then
    echo "✓ In reveal state, waiting for next question..."
    sleep 4.5
  else
    echo "⚠ Not in reveal state, waiting anyway..."
    sleep 2
  fi
  
  echo ""
done

# Final state
echo "========== FINAL STATE =========="
FINAL=$(curl -s http://localhost:3000/api/game)
echo "$FINAL" | jq '{state, round, scores, lives, ghosts, winner}'
echo ""

# Check if scores were tracked
ALICE_SCORE=$(echo "$FINAL" | jq -r ".scores[\"$P1\"]")
BOB_SCORE=$(echo "$FINAL" | jq -r ".scores[\"$P2\"]")

echo "========== RESULTS =========="
echo "Alice score: $ALICE_SCORE"
echo "Bob score: $BOB_SCORE"
echo ""

if [ "$ALICE_SCORE" -gt 0 ] || [ "$BOB_SCORE" -gt 0 ]; then
  echo "✅ Scores are being tracked!"
else
  echo "❌ Scores are not being tracked properly"
fi

# Test error cases
echo ""
echo "========== ERROR HANDLING TESTS =========="

# Test CSRF protection
echo "Testing CSRF protection..."
CSRF=$(curl -s -w "%{http_code}" -X POST http://localhost:3000/api/game \
  -H "Content-Type: application/json" \
  -d '{"action":"start","token":"invalid"}' -o /dev/null)
if [ "$CSRF" = "403" ]; then
  echo "✅ CSRF protection working (403)"
else
  echo "❌ CSRF protection failed (got $CSRF)"
fi

# Test duplicate answer
echo "Testing duplicate answer prevention..."
DUP=$(curl -s -X POST http://localhost:3000/api/game \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"answer\",\"playerId\":\"$P1\",\"answer\":0,\"token\":\"$TOKEN\"}" | jq -r '.error')
if echo "$DUP" | grep -q "Already answered\|Not accepting"; then
  echo "✅ Duplicate answer blocked"
else
  echo "⚠ Duplicate answer response: $DUP"
fi

echo ""
echo "========== TEST COMPLETE =========="
