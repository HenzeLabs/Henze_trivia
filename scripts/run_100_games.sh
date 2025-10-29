#!/bin/bash
# Run 100-game simulation

set -e

echo "🧹 Cleaning up any existing processes..."
ps aux | grep -E "(node|npm)" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

echo "🚀 Starting server..."
cd /Users/laurenadmin/Projects/henze-trivia/web-app
npm run dev > /tmp/server_100.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > /tmp/server_100_pid.txt
echo "Server PID: $SERVER_PID"

echo "⏳ Waiting for server to be ready..."
sleep 8

echo "🎮 Launching 100-game simulation..."
cd /Users/laurenadmin/Projects/henze-trivia
NUM_GAMES=100 node scripts/simulate_games.js 2>&1 | tee /tmp/simulation_100.log

echo ""
echo "✅ Simulation complete!"
echo "📊 Results saved to: logs/simulations.csv"
echo "📝 Server logs: /tmp/server_100.log"
echo "📝 Simulation logs: /tmp/simulation_100.log"

# Keep server running
echo ""
echo "Server is still running (PID: $SERVER_PID)"
echo "To stop: kill $SERVER_PID"
