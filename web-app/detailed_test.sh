#!/bin/bash
echo "🔍 Detailed Score Test"
echo "======================"

# Reset game first
TOKEN=$(curl -s http://localhost:3000/api/game | jq -r '.token')
curl -s -X POST http://localhost:3000/api/game -H "Content-Type: application/json" -d "{\"action\":\"reset\",\"token\":\"$TOKEN\"}" > /dev/null
sleep 1

# Get new token
TOKEN=$(curl -s http://localhost:3000/api/game | jq -r '.token')

# Join players
P1=$(curl -s -X POST http://localhost:3000/api/game -H "Content-Type: application/json" -d '{"action":"join","playerName":"TestPlayer1"}' | jq -r '.playerId')
P2=$(curl -s -X POST http://localhost:3000/api/game -H "Content-Type: application/json" -d '{"action":"join","playerName":"TestPlayer2"}' | jq -r '.playerId')

echo "Player 1: $P1"
echo "Player 2: $P2"
echo ""

# Start game
curl -s -X POST http://localhost:3000/api/game -H "Content-Type: application/json" -d "{\"action\":\"start\",\"token\":\"$TOKEN\"}" > /dev/null
sleep 1

# Get question
GAME=$(curl -s http://localhost:3000/api/game)
CORRECT=$(echo "$GAME" | jq -r '.currentQuestion.correct')
echo "Correct answer: $CORRECT"
echo ""

# Player 1 answers correctly
echo "Player 1 answering correctly..."
curl -s -X POST http://localhost:3000/api/game -H "Content-Type: application/json" -d "{\"action\":\"answer\",\"playerId\":\"$P1\",\"answer\":$CORRECT,\"token\":\"$TOKEN\"}" | jq
echo ""

# Check scores immediately
echo "Scores immediately after P1 answer:"
curl -s http://localhost:3000/api/game | jq '{scores, lives}'
echo ""

# Player 2 answers wrong
WRONG=$(( (CORRECT + 1) % 4 ))
echo "Player 2 answering wrong ($WRONG)..."
curl -s -X POST http://localhost:3000/api/game -H "Content-Type: application/json" -d "{\"action\":\"answer\",\"playerId\":\"$P2\",\"answer\":$WRONG,\"token\":\"$TOKEN\"}" | jq
echo ""

# Check scores immediately after both answered
echo "Scores immediately after both answered:"
curl -s http://localhost:3000/api/game | jq '{state, scores, lives}'
echo ""

# Wait for reveal
sleep 2
echo "After 2 seconds (should be in reveal):"
curl -s http://localhost:3000/api/game | jq '{state, round, scores, lives}'
echo ""

# Wait for next question
sleep 3
echo "After 5 seconds total (should be next question):"
curl -s http://localhost:3000/api/game | jq '{state, round, scores, lives}'
