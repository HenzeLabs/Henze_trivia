#!/bin/bash

echo "🎯 PERFECT GAME TEST - Testing Score Tracking"
echo "=============================================="
echo ""

# Reset
TOKEN=$(curl -s http://localhost:3000/api/game | jq -r '.token')
curl -s -X POST http://localhost:3000/api/game -H "Content-Type: application/json" -d "{\"action\":\"reset\",\"token\":\"$TOKEN\"}" > /dev/null
sleep 1

# Get new token
TOKEN=$(curl -s http://localhost:3000/api/game | jq -r '.token')
echo "Token: $TOKEN"

# Join players
P1=$(curl -s -X POST http://localhost:3000/api/game -H "Content-Type: application/json" -d '{"action":"join","playerName":"Winner"}' | jq -r '.playerId')
P2=$(curl -s -X POST http://localhost:3000/api/game -H "Content-Type: application/json" -d '{"action":"join","playerName":"Loser"}' | jq -r '.playerId')
echo "Winner ID: $P1"
echo "Loser ID: $P2"
echo ""

# Start
curl -s -X POST http://localhost:3000/api/game -H "Content-Type: application/json" -d "{\"action\":\"start\",\"token\":\"$TOKEN\"}" > /dev/null
sleep 1

# Round 1 - Winner answers correctly, Loser answers wrong
echo "========== ROUND 1 =========="
GAME=$(curl -s http://localhost:3000/api/game)
echo "Question:" $(echo "$GAME" | jq -r '.currentQuestion.question' | head -c 60)...
echo ""

# Winner answers option 3 (D)
echo "Winner answering option 3 (D)..."
curl -s -X POST http://localhost:3000/api/game -H "Content-Type: application/json" -d "{\"action\":\"answer\",\"playerId\":\"$P1\",\"answer\":3,\"token\":\"$TOKEN\"}" | jq -c .

# Loser answers option 0 (A) 
echo "Loser answering option 0 (A)..."
curl -s -X POST http://localhost:3000/api/game -H "Content-Type: application/json" -d "{\"action\":\"answer\",\"playerId\":\"$P2\",\"answer\":0,\"token\":\"$TOKEN\"}" | jq -c .

sleep 1
GAME=$(curl -s http://localhost:3000/api/game)
echo ""
echo "After Round 1:"
echo "$GAME" | jq '{state, round, scores, lives}'
echo ""

# Wait for next round
sleep 4

# Round 2
echo "========== ROUND 2 =========="
GAME=$(curl -s http://localhost:3000/api/game)
STATE=$(echo "$GAME" | jq -r '.state')
echo "State: $STATE"

if [ "$STATE" = "question" ]; then
  echo "Question:" $(echo "$GAME" | jq -r '.currentQuestion.question' | head -c 60)...
  echo ""
  
  # Winner answers option 2 (C)
  echo "Winner answering option 2 (C)..."
  curl -s -X POST http://localhost:3000/api/game -H "Content-Type: application/json" -d "{\"action\":\"answer\",\"playerId\":\"$P1\",\"answer\":2,\"token\":\"$TOKEN\"}" | jq -c .
  
  # Loser answers option 0 (A)
  echo "Loser answering option 0 (A)..."
  curl -s -X POST http://localhost:3000/api/game -H "Content-Type: application/json" -d "{\"action\":\"answer\",\"playerId\":\"$P2\",\"answer\":0,\"token\":\"$TOKEN\"}" | jq -c .
  
  sleep 1
  GAME=$(curl -s http://localhost:3000/api/game)
  echo ""
  echo "After Round 2:"
  echo "$GAME" | jq '{state, round, scores, lives, ghosts}'
fi

echo ""
echo "========== FINAL SCORES =========="
WINNER_SCORE=$(echo "$GAME" | jq -r ".scores[\"$P1\"]")
LOSER_SCORE=$(echo "$GAME" | jq -r ".scores[\"$P2\"]")
WINNER_LIVES=$(echo "$GAME" | jq -r ".lives[\"$P1\"]")
LOSER_LIVES=$(echo "$GAME" | jq -r ".lives[\"$P2\"]")

echo "Winner: $WINNER_SCORE points, $WINNER_LIVES lives"
echo "Loser: $LOSER_SCORE points, $LOSER_LIVES lives"
echo ""

if [ "$WINNER_SCORE" -gt 0 ]; then
  echo "✅ SUCCESS! Scores are being tracked correctly!"
  echo "✅ Winner has $WINNER_SCORE points (expected 100-200)"
else
  echo "❌ FAIL! Winner should have points but has $WINNER_SCORE"
fi

if [ "$LOSER_LIVES" -lt 3 ]; then
  echo "✅ Lives are being deducted correctly!"
  echo "✅ Loser has $LOSER_LIVES lives (expected 1-2)"
else
  echo "❌ FAIL! Loser should have lost lives"
fi
