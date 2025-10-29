# Scripts Directory

Utility scripts for Henze Trivia setup, migration, and question generation.

## Quick Start

### One-Command Setup

```bash
# Run automated setup (migrates CSV → SQLite, sets up server)
./setup_new_architecture.sh
```

This script will:
1. Install Node.js dependencies (`better-sqlite3`)
2. Create data directory
3. Migrate CSV questions to SQLite
4. Generate secure HOST_PIN if needed
5. Backup old server and activate new one

---

## Individual Scripts

### 1. Setup Script

**File**: `setup_new_architecture.sh`

**Purpose**: Automated one-command setup for new architecture

**Usage**:
```bash
chmod +x setup_new_architecture.sh
./setup_new_architecture.sh
```

**What it does**:
- Installs dependencies
- Creates database
- Migrates questions
- Sets up secure PIN
- Switches to new server

---

### 2. CSV Migration

**File**: `migrate_csv_to_sqlite.js`

**Purpose**: Import existing CSV questions into SQLite database

**Usage**:
```bash
node migrate_csv_to_sqlite.js
```

**Input**: CSV files in `../output/` directory:
- `sample_questions.csv` → trivia
- `who_said_it_questions.csv` → who-said-it
- `chaos_questions.csv` → chaos
- `roast_mode_questions.csv` → roast

**Output**: SQLite database at `../data/henze_trivia.db`

**Example Output**:
```
🚀 Starting CSV → SQLite migration...

📂 Processing: sample_questions.csv
   Found 50 questions
   ✅ Imported 50 questions

📂 Processing: who_said_it_questions.csv
   Found 20 questions
   ✅ Imported 20 questions

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

---

### 3. Question Generation

**File**: `generate_questions.py`

**Purpose**: Generate new questions using OpenAI with structured outputs

**Requirements**:
```bash
pip install openai pydantic
```

**Environment Variables**:
```bash
export OPENAI_API_KEY=sk-...
export CHAT_DB_PATH=~/Library/Messages/chat.db  # Optional
```

**Usage**:
```bash
python generate_questions.py
```

**What it generates**:
- 15 trivia questions (pop culture, sports, history)
- 5 "Who Said It?" questions (from chat messages)
- 5 roast questions (personality analysis)

**Features**:
- ✅ Strict JSON schema validation with Pydantic
- ✅ Automatic retry if schema fails
- ✅ Validates speaker names for chat questions
- ✅ Extracts distinctive messages (filters reactions, deduplicates)
- ✅ Plausible distractors
- ✅ Concise explanations

**Example Output**:
```
🎮 Henze Trivia Question Generator
============================================================

📱 Extracted 1500 distinctive messages from iMessage

📚 Generating trivia questions...
✅ Generated 15 trivia questions

💬 Generating Who Said It questions...
✅ Generated 5 Who Said It questions

🔥 Generating roast questions...
✅ Generated 5 roast questions

============================================================
✅ Generation complete! Added 25 questions to database
   Database: /path/to/data/henze_trivia.db
============================================================
```

**Question Types**:

1. **Trivia** (`type: "trivia"`)
   ```json
   {
     "type": "trivia",
     "text": "Which NBA player has won the most championships?",
     "options": ["Michael Jordan", "Bill Russell", "LeBron James", "Kareem Abdul-Jabbar"],
     "answer_index": 1,
     "explanation": "Bill Russell won 11 championships with the Celtics from 1957-1969",
     "category": "sports",
     "difficulty": "medium"
   }
   ```

2. **Who Said It?** (`type: "who-said-it"`)
   ```json
   {
     "type": "who-said-it",
     "text": "Who said: \"I'm not going to the party, I have to wash my cat\"?",
     "options": ["Alice", "Bob", "Charlie", "Dana"],
     "answer_index": 2,
     "explanation": "Charlie always has creative excuses for not going out",
     "speaker_names": ["Alice", "Bob", "Charlie", "Dana"]
   }
   ```

3. **Roast** (`type: "roast"`)
   ```json
   {
     "type": "roast",
     "text": "Who is most likely to send a text at 3am and expect an immediate response?",
     "options": ["Alice", "Bob", "Charlie", "Dana"],
     "answer_index": 0,
     "explanation": "Alice sent 47 messages between 2-4am last month",
     "roasted_person": "Alice"
   }
   ```

---

## Common Tasks

### Check Database Stats

```bash
# Quick stats
node -e "const {getDB} = require('../web-app/database'); console.log(getDB().getStats());"

# Top roast questions
node -e "const {getDB} = require('../web-app/database'); console.table(getDB().getTopQuestions('roast', 10));"

# Top topics by laugh score
node -e "const {getDB} = require('../web-app/database'); console.table(getDB().getTopTopics(10));"
```

### Manually Insert Question

```bash
node -e "
const {getDB} = require('../web-app/database');
const db = getDB();
db.insertQuestion({
  type: 'trivia',
  text: 'What is the capital of France?',
  options: ['London', 'Berlin', 'Paris', 'Madrid'],
  answer_index: 2,
  explanation: 'Paris has been the capital since 508 AD',
  category: 'geography',
  source: 'curated'
});
console.log('✅ Question added');
"
```

### Run Learning Loop Manually

```bash
node -e "
const {getDB} = require('../web-app/database');
const results = getDB().runLearningLoop();
console.log('Updated:', results.questionsUpdated);
console.log('Retired:', results.questionsRetired);
"
```

### View Questions to Retire

```bash
node -e "
const {getDB} = require('../web-app/database');
console.table(getDB().getQuestionsToRetire());
"
```

### Export Questions to JSON

```bash
sqlite3 ../data/henze_trivia.db <<EOF
.mode json
.output questions_export.json
SELECT * FROM questions WHERE retired_at IS NULL;
.quit
EOF
```

### Backup Database

```bash
# Simple copy
cp ../data/henze_trivia.db ../data/henze_trivia_backup_$(date +%Y%m%d).db

# Or with SQLite backup command
sqlite3 ../data/henze_trivia.db ".backup '../data/backup.db'"
```

---

## Troubleshooting

### "Module not found: better-sqlite3"

```bash
cd ../web-app
npm install better-sqlite3
```

### "No such file or directory: chat.db"

Set the correct path in `.env`:
```bash
CHAT_DB_PATH=~/Library/Messages/chat.db
```

Or full path:
```bash
CHAT_DB_PATH=/Users/yourname/Library/Messages/chat.db
```

### "OPENAI_API_KEY not set"

```bash
export OPENAI_API_KEY=sk-...
# Or add to .env file
echo "OPENAI_API_KEY=sk-..." >> ../.env
```

### "No questions loaded"

```bash
# Run migration first
node migrate_csv_to_sqlite.js

# Or generate new ones
python generate_questions.py
```

### Database locked error

```bash
# Make sure no other process is using the database
lsof ../data/henze_trivia.db

# Or restart server
pkill -f "node.*server.js"
```

---

## Development Workflow

### Typical workflow for adding new questions:

1. **Extract fresh messages** (if chat-based):
   ```bash
   # generate_questions.py automatically extracts
   python generate_questions.py
   ```

2. **Generate questions**:
   ```bash
   python generate_questions.py
   ```

3. **Check quality**:
   ```bash
   node -e "const {getDB} = require('../web-app/database'); console.table(getDB().getActiveQuestions({limit: 10}));"
   ```

4. **Play test game**:
   ```bash
   cd ../web-app
   npm run dev
   ```

5. **Review learning loop results**:
   - Check server logs after game
   - View retired questions
   - Adjust thresholds if needed

6. **Generate next batch**:
   - Learning loop identifies top topics
   - Use those topics for next generation
   - Repeat cycle

---

## Scheduled Generation

### Option 1: Cron Job (Unix/Mac)

```bash
# Edit crontab
crontab -e

# Add line (runs daily at 2am)
0 2 * * * cd /path/to/henze-trivia && python scripts/generate_questions.py >> logs/generation.log 2>&1
```

### Option 2: systemd Timer (Linux)

Create `/etc/systemd/system/henze-trivia-gen.service`:
```ini
[Unit]
Description=Henze Trivia Question Generation

[Service]
Type=oneshot
User=yourusername
WorkingDirectory=/path/to/henze-trivia
ExecStart=/usr/bin/python3 scripts/generate_questions.py
```

Create `/etc/systemd/system/henze-trivia-gen.timer`:
```ini
[Unit]
Description=Daily Henze Trivia Question Generation

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

Enable:
```bash
sudo systemctl enable henze-trivia-gen.timer
sudo systemctl start henze-trivia-gen.timer
```

---

## File Permissions

Make scripts executable:
```bash
chmod +x setup_new_architecture.sh
chmod +x generate_questions.py
```

---

## See Also

- [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md) - Full setup instructions
- [NEW_ARCHITECTURE.md](../NEW_ARCHITECTURE.md) - Technical reference
- [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md) - Overview of changes
