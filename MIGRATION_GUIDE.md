# Migration Guide: CSV → SQLite + GameRoom FSM

This guide walks you through upgrading your Henze Trivia game to use the new architecture with SQLite database, proper state management, and learning loop.

## What's New

### 1. SQLite Database
- Questions stored in `data/henze_trivia.db` (not CSV)
- Tracks game results, player answers, and performance metrics
- Learning loop automatically retires poor-performing questions

### 2. GameRoom FSM (Finite State Machine)
- Proper state transitions: `LOBBY → ASKING → ANSWERS_LOCKED → REVEAL → ROUND_END → (repeat) → GAME_END`
- **Security Fix**: Correct answers no longer sent to clients during game
- Atomic state transitions prevent race conditions
- Built-in timers and guards

### 3. Question Type Mixing
- Configurable ratios (default: 60% trivia, 15% who-said-it, 10% chaos, 15% roast)
- Smart ordering to intersperse question types
- Automatically avoids repeating questions from last 30 days

### 4. Learning Loop
- Tracks laugh votes, correct rates, and answer times
- Auto-retires questions that are too easy (>95% correct), too hard (<15% correct), or unfunny
- Upweights high-performing topics for future generation

### 5. Structured Question Generation
- OpenAI structured outputs with strict JSON schema validation
- Automatic retry if schema fails
- Validates speaker names for "Who Said It?" questions
- Better quality control

---

## Step-by-Step Migration

### Step 1: Install Dependencies

```bash
cd web-app
npm install better-sqlite3
```

For Python question generation:
```bash
pip install openai pydantic
```

### Step 2: Create Database and Migrate Existing Questions

```bash
# Run migration script to import CSV → SQLite
node scripts/migrate_csv_to_sqlite.js
```

This will:
- Create `data/henze_trivia.db`
- Import all questions from CSV files in `output/`
- Set up tables for games, results, and learning loop

Expected output:
```
🚀 Starting CSV → SQLite migration...

📂 Processing: sample_questions.csv
   Found 50 questions
   ✅ Imported 50 questions

📂 Processing: who_said_it_questions.csv
   Found 20 questions
   ✅ Imported 20 questions

...

============================================================
✅ Migration complete!
   Total imported: 120
   Total skipped:  0
============================================================

📊 Database Statistics:
   Total active questions: 120
   By type:
     - trivia: 50
     - who-said-it: 20
     - chaos: 15
     - roast: 35
```

### Step 3: Update Server to Use New Architecture

**Option A: Quick Start (Rename Files)**

```bash
cd web-app

# Backup old server
mv server.js server_old.js

# Use new server
mv server_new.js server.js
```

**Option B: Manual Integration**

If you have custom modifications to `server.js`, integrate the new GameRoom manually:

1. Replace the global `game` object with `new GameRoom()`
2. Update socket event handlers to use GameRoom methods
3. Remove legacy API routes in `pages/api/game.js`

### Step 4: Set a Strong HOST_PIN

**IMPORTANT**: The new server will NOT start with the default `1234` PIN.

```bash
# In your .env file:
HOST_PIN=your_secure_pin_here
```

Generate a random PIN:
```bash
# Option 1: Random number
echo $RANDOM$RANDOM

# Option 2: Random string
openssl rand -hex 4
```

### Step 5: Test the Migration

```bash
# Start the server
npm run dev
```

Expected startup output:
```
🎮 HENZE TRIVIA SERVER
============================================================
📚 Loading questions from database...
✅ Loaded 120 questions
   Types: {"trivia":50,"who-said-it":20,"chaos":15,"roast":35}

> Ready on http://0.0.0.0:3000
> Local: http://localhost:3000

📱 PLAYERS: http://192.168.1.100:3000
📺 TV: http://192.168.1.100:3000/tv
============================================================
```

### Step 6: Generate New Questions with OpenAI

```bash
# Generate fresh questions
python scripts/generate_questions.py
```

This will:
- Extract distinctive messages from iMessage (if available)
- Generate trivia questions (15)
- Generate "Who Said It?" questions (5)
- Generate roast questions (5)
- Validate all questions with strict JSON schema
- Insert into SQLite database

---

## New Features to Test

### 1. Laugh Voting

During the `REVEAL` or `ROUND_END` phase, players can vote if a question was funny.

**Frontend Integration** (add to your player page):

```tsx
import LaughButton from "./components/LaughButton";

// In your component:
const handleLaughVote = () => {
  socket.emit("player:laugh", { token }, (response) => {
    if (response.error) {
      console.error("Laugh vote failed:", response.error);
    }
  });
};

// In your JSX (show during REVEAL or ROUND_END):
{(gameState.state === "REVEAL" || gameState.state === "ROUND_END") && (
  <LaughButton
    onVote={handleLaughVote}
    hasVoted={hasVoted}
    voteCount={gameState.laughVotes || 0}
  />
)}
```

### 2. Learning Loop

After each game, the learning loop runs automatically:

```
🧠 Running learning loop...
✅ Updated stats for 20 questions
🗑️  Retiring question 42: "What is the capital of..." (used 5x, correct rate: 0.98, laughs: 0.00)
🗑️  Retiring question 73: "Who is most likely to..." (used 8x, correct rate: 0.12, laughs: 0.10)
```

Questions are retired if:
- Too easy: >95% correct rate after 5+ uses
- Too hard: <15% correct rate after 5+ uses
- Not funny: <0.1 laugh score for chat-based questions

### 3. View Database Stats

```bash
node -e "const {getDB} = require('./web-app/database'); console.log(getDB().getStats());"
```

---

## Troubleshooting

### Error: "No questions loaded"

**Problem**: Database is empty or not migrated.

**Solution**:
```bash
# Run migration
node scripts/migrate_csv_to_sqlite.js

# Or generate new questions
python scripts/generate_questions.py
```

### Error: "HOST_PIN must be set to a strong value"

**Problem**: Using default PIN or no PIN set.

**Solution**: Set `HOST_PIN` in `.env` to something other than `1234`.

### Error: "Cannot find module 'better-sqlite3'"

**Problem**: Missing dependency.

**Solution**:
```bash
npm install better-sqlite3
```

### Questions repeat in the same game

**Problem**: Not enough questions in database for the configured round count.

**Solution**:
```bash
# Generate more questions
python scripts/generate_questions.py

# Or reduce maxRounds in GameRoom config
```

### iMessage extraction fails

**Problem**: `CHAT_DB_PATH` not set or incorrect.

**Solution**:
```bash
# Set in .env
CHAT_DB_PATH=~/Library/Messages/chat.db

# Or use absolute path
CHAT_DB_PATH=/Users/yourname/Library/Messages/chat.db
```

---

## Architecture Comparison

### Old Architecture (CSV)

```
CSV Files → Parse at startup → Shared global state → Race conditions
                                ↓
                         Send EVERYTHING to clients
                         (including correct answers!)
```

**Problems**:
- Correct answers visible in DevTools
- Multiple concurrent games share state
- No learning or question retirement
- Race conditions in state transitions

### New Architecture (SQLite + FSM)

```
SQLite DB → Question mixer → GameRoom FSM → Sanitized payloads
                ↓                               ↓
         Type mixing (40/60)         Hide correct answers
         Smart ordering               Atomic transitions
         Avoid repeats                Rate limiting
                ↓
         Learning loop
         (retire duds, upweight winners)
```

**Benefits**:
- Correct answers never sent to clients during game
- Proper state machine with guards
- Learning from game results
- Better question quality over time
- Thread-safe state transitions

---

## Configuration Options

### GameRoom Config

In `server_new.js`, you can adjust:

```javascript
const gameRoom = new GameRoom({
  maxPlayers: 8,           // Max players per game
  maxLives: 3,             // Lives before elimination
  maxRounds: 20,           // Questions per game
  askingTimeoutMs: 30000,  // 30s to answer each question
  revealDelayMs: 500,      // Delay before revealing answer
  roundEndDelayMs: 3000,   // Pause after each round
  pointsPerCorrect: 100,   // Points for correct answer
});
```

### Question Type Mix

In `GameRoom.js`, change the default mix:

```javascript
const mix = typeMix || {
  "who-said-it": 0.15,  // 15% chat quotes
  chaos: 0.10,          // 10% message patterns
  roast: 0.15,          // 15% personality roasts
  trivia: 0.60,         // 60% general trivia
};
```

### Learning Loop Thresholds

In `database.js`, adjust retirement criteria:

```javascript
const toRetire = this.getQuestionsToRetire({
  minUses: 5,              // Minimum plays before considering retirement
  maxCorrectRate: 0.95,    // Retire if >95% correct (too easy)
  minCorrectRate: 0.15,    // Retire if <15% correct (too hard)
  minLaughScore: 0.1,      // Retire if <0.1 laughs per use (not funny)
});
```

---

## Rollback Plan

If you need to rollback to the old architecture:

```bash
cd web-app

# Restore old server
mv server.js server_new.js
mv server_old.js server.js

# Restart
npm run dev
```

Your CSV files are unchanged, so the old system will work exactly as before.

---

## Next Steps

1. **Generate Personalized Questions**
   ```bash
   python scripts/generate_questions.py
   ```

2. **Play a Test Game**
   - Join with 2-3 players
   - Vote questions as funny
   - Check learning loop output after game

3. **Monitor Question Quality**
   ```bash
   # View top questions
   node -e "const {getDB} = require('./web-app/database'); console.log(getDB().getTopQuestions('roast', 5));"

   # View top topics
   node -e "const {getDB} = require('./web-app/database'); console.log(getDB().getTopTopics(10));"
   ```

4. **Schedule Regular Generation**
   ```bash
   # Add to crontab (run daily at 2am)
   0 2 * * * cd /path/to/henze-trivia && python scripts/generate_questions.py
   ```

---

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. View server logs for detailed errors
3. Verify database exists: `ls -lh data/henze_trivia.db`
4. Test database connection: `sqlite3 data/henze_trivia.db "SELECT COUNT(*) FROM questions;"`

---

## Summary of Files

**New Files**:
- `web-app/database.js` - SQLite database layer
- `web-app/GameRoom.js` - FSM game state management
- `web-app/questionMixer.js` - Type mixing algorithm
- `web-app/server_new.js` - Updated server with new architecture
- `web-app/app/components/LaughButton.tsx` - Laugh voting UI
- `scripts/migrate_csv_to_sqlite.js` - Migration script
- `scripts/generate_questions.py` - OpenAI question generation

**Modified Behavior**:
- Questions loaded from SQLite (not CSV)
- State machine enforces valid transitions
- Correct answers hidden from clients
- Learning loop runs after each game
- Rate limiting on socket events
- Strong HOST_PIN required

**Unchanged**:
- Frontend player/TV UI (compatible with new backend)
- CSV files (preserved for rollback)
- Environment variables (except HOST_PIN enforcement)
