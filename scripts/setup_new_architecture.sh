#!/bin/bash

# Setup Script for New Henze Trivia Architecture
# Migrates CSV → SQLite and switches to new server

set -e  # Exit on error

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WEB_APP_DIR="$PROJECT_ROOT/web-app"
DATA_DIR="$PROJECT_ROOT/data"

echo "=========================================="
echo "🎮 Henze Trivia Setup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "$WEB_APP_DIR/package.json" ]; then
    echo "❌ Error: Could not find web-app/package.json"
    echo "   Please run this script from the project root"
    exit 1
fi

# Step 1: Install Node dependencies
echo "📦 Step 1: Installing Node.js dependencies..."
cd "$WEB_APP_DIR"
if ! npm list better-sqlite3 >/dev/null 2>&1; then
    echo "   Installing better-sqlite3..."
    npm install better-sqlite3
else
    echo "   ✅ better-sqlite3 already installed"
fi
echo ""

# Step 2: Check Python dependencies (optional)
echo "🐍 Step 2: Checking Python dependencies (optional for question generation)..."
if command -v python3 >/dev/null 2>&1; then
    if python3 -c "import openai, pydantic" 2>/dev/null; then
        echo "   ✅ Python dependencies installed"
    else
        echo "   ⚠️  Missing: openai and/or pydantic"
        echo "   To generate questions, run: pip install openai pydantic"
    fi
else
    echo "   ⚠️  Python 3 not found (optional)"
fi
echo ""

# Step 3: Create data directory
echo "📁 Step 3: Creating data directory..."
mkdir -p "$DATA_DIR"
echo "   ✅ Created: $DATA_DIR"
echo ""

# Step 4: Run migration
echo "🔄 Step 4: Migrating CSV questions to SQLite..."
if [ -f "$DATA_DIR/henze_trivia.db" ]; then
    echo "   ⚠️  Database already exists: $DATA_DIR/henze_trivia.db"
    read -p "   Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   Skipping migration"
    else
        rm -f "$DATA_DIR/henze_trivia.db"
        node "$SCRIPT_DIR/migrate_csv_to_sqlite.js"
    fi
else
    node "$SCRIPT_DIR/migrate_csv_to_sqlite.js"
fi
echo ""

# Step 5: Check HOST_PIN
echo "🔐 Step 5: Checking HOST_PIN..."
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "   ⚠️  No .env file found"
    echo "   Creating .env with random HOST_PIN..."
    if command -v openssl >/dev/null 2>&1; then
        RANDOM_PIN=$(openssl rand -hex 4)
    else
        RANDOM_PIN=$((RANDOM * RANDOM % 100000000))
    fi
    echo "HOST_PIN=$RANDOM_PIN" >> "$PROJECT_ROOT/.env"
    echo "   ✅ Created .env with HOST_PIN=$RANDOM_PIN"
    echo "   ⚠️  SAVE THIS PIN! You'll need it to start games"
else
    if grep -q "^HOST_PIN=" "$PROJECT_ROOT/.env"; then
        CURRENT_PIN=$(grep "^HOST_PIN=" "$PROJECT_ROOT/.env" | cut -d= -f2)
        if [ "$CURRENT_PIN" = "1234" ]; then
            echo "   ⚠️  HOST_PIN is set to default '1234'"
            read -p "   Generate new secure PIN? (Y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                if command -v openssl >/dev/null 2>&1; then
                    NEW_PIN=$(openssl rand -hex 4)
                else
                    NEW_PIN=$((RANDOM * RANDOM % 100000000))
                fi
                sed -i.bak "s/^HOST_PIN=.*/HOST_PIN=$NEW_PIN/" "$PROJECT_ROOT/.env"
                echo "   ✅ Updated HOST_PIN to: $NEW_PIN"
                echo "   ⚠️  SAVE THIS PIN!"
            fi
        else
            echo "   ✅ HOST_PIN already set (not 1234)"
        fi
    else
        echo "   ⚠️  HOST_PIN not found in .env"
        read -p "   Add secure HOST_PIN? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            if command -v openssl >/dev/null 2>&1; then
                NEW_PIN=$(openssl rand -hex 4)
            else
                NEW_PIN=$((RANDOM * RANDOM % 100000000))
            fi
            echo "HOST_PIN=$NEW_PIN" >> "$PROJECT_ROOT/.env"
            echo "   ✅ Added HOST_PIN=$NEW_PIN"
            echo "   ⚠️  SAVE THIS PIN!"
        fi
    fi
fi
echo ""

# Step 6: Backup old server and switch to new
echo "🔄 Step 6: Switching to new server..."
if [ -f "$WEB_APP_DIR/server.js" ] && [ ! -f "$WEB_APP_DIR/server_old.js" ]; then
    echo "   Backing up old server.js → server_old.js"
    mv "$WEB_APP_DIR/server.js" "$WEB_APP_DIR/server_old.js"
fi

if [ -f "$WEB_APP_DIR/server_new.js" ]; then
    echo "   Activating new server: server_new.js → server.js"
    cp "$WEB_APP_DIR/server_new.js" "$WEB_APP_DIR/server.js"
    echo "   ✅ New server activated"
else
    echo "   ⚠️  server_new.js not found"
fi
echo ""

# Step 7: Summary
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Database: $DATA_DIR/henze_trivia.db"
if [ -f "$DATA_DIR/henze_trivia.db" ]; then
    QUESTION_COUNT=$(sqlite3 "$DATA_DIR/henze_trivia.db" "SELECT COUNT(*) FROM questions WHERE retired_at IS NULL;" 2>/dev/null || echo "?")
    echo "Questions: $QUESTION_COUNT active"
fi
echo ""
echo "Next steps:"
echo ""
echo "1. Start the server:"
echo "   cd $WEB_APP_DIR"
echo "   npm run dev"
echo ""
echo "2. Open in browser:"
echo "   Players: http://localhost:3000"
echo "   TV: http://localhost:3000/tv"
echo ""
echo "3. (Optional) Generate new questions:"
echo "   python $SCRIPT_DIR/generate_questions.py"
echo ""
echo "📖 Documentation:"
echo "   - Setup: MIGRATION_GUIDE.md"
echo "   - Reference: NEW_ARCHITECTURE.md"
echo "   - Summary: IMPLEMENTATION_SUMMARY.md"
echo ""
echo "=========================================="
