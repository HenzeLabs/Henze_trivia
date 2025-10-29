#!/bin/bash

# Quick start script for monitored server
# Usage: ./start-monitored.sh

cd "$(dirname "$0")"

echo "🎮 Starting Henze Trivia Server with Monitoring..."
echo ""

# Choose which monitor to use
if command -v node &> /dev/null; then
    echo "Using Node.js monitor (recommended)"
    node monitor.js
else
    echo "Using Bash monitor"
    ./monitor-server.sh
fi
