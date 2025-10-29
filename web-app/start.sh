#!/bin/sh
# Alternative deploy/start script for non-Vercel platforms
# Usage: ./start.sh

set -e

# Install dependencies if needed
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install --production
fi

# Build Next.js (if using static export or custom build step)
# Uncomment if you want to pre-build: npm run build

# Start the custom server
exec node web-app/server.js
