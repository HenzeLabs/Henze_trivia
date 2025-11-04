#!/bin/bash
# Quick deployment script for Render

set -e

echo "🚀 Preparing for Render deployment..."
echo ""

# Run production tests
echo "1️⃣ Running production readiness tests..."
cd web-app
npm run test:production
cd ..
echo ""

# Check git status
echo "2️⃣ Checking git status..."
if [[ -n $(git status -s) ]]; then
  echo "📝 Uncommitted changes found:"
  git status -s
  echo ""
  read -p "Commit these changes? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter commit message: " commit_msg
    git add .
    git commit -m "$commit_msg"
  fi
else
  echo "✓ No uncommitted changes"
fi
echo ""

# Push to GitHub
echo "3️⃣ Pushing to GitHub..."
git push origin main
echo ""

echo "✅ Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Go to https://render.com"
echo "2. Create a new Web Service"
echo "3. Connect your GitHub repository"
echo "4. Render will auto-detect render.yaml and deploy"
echo ""
echo "Or manually configure:"
echo "  Build Command: cd web-app && npm install && npm run build"
echo "  Start Command: cd web-app && npm start"
echo ""
