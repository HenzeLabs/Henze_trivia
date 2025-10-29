#!/bin/bash

# Henze Trivia - Simple Startup Script
# This script extracts messages, generates questions, and starts the game server

set -e  # Exit on error

echo "🎮 HENZE TRIVIA - STARTING UP"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "generate_questions.py" ]; then
    echo "❌ Error: Please run this script from the henze-trivia directory"
    exit 1
fi

# Step 1: Extract messages from iMessage
echo "📱 Step 1: Extracting messages from iMessage..."
python chat_extractor/extract_messages.py
echo ""

# Step 2: Generate all question types
echo "🤖 Step 2: Generating trivia questions..."
python generate_questions.py --all --num 30
echo ""

# Step 3: Start the web server
echo "🚀 Step 3: Starting game server..."
echo ""
echo "======================================"
echo "📺 TV SCREEN: Open this URL on your Apple TV browser"
echo "   (or AirPlay from your Mac)"
echo ""
echo "📱 PLAYERS: Open this URL on your phones"
echo ""
echo "======================================"
echo ""

cd web-app
npm run dev
