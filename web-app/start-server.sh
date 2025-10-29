#!/bin/bash

# Kill any existing server processes on port 3001
echo "🧹 Cleaning up old processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
killall -9 node npm 2>/dev/null || true

# Wait for cleanup
sleep 2

# Start the server
echo "🚀 Starting Henze Trivia Server on port 3001..."
cd /Users/laurenadmin/Projects/henze-trivia/web-app
PORT=3001 npm run dev
