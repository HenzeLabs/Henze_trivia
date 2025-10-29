# New Architecture Reference

Quick reference for the new Henze Trivia architecture.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    HENZE TRIVIA SYSTEM                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │   iMessage   │      │   OpenAI     │                   │
│  │   Database   │      │   GPT-4o     │                   │
│  └──────┬───────┘      └──────┬───────┘                   │
│         │                     │                            │
│         ▼                     ▼                            │
│  ┌─────────────────────────────────┐                      │
│  │  generate_questions.py          │                      │
│  │  - Extract messages             │                      │
│  │  - Generate Q&A (structured)    │                      │
│  │  - Validate schemas             │                      │
│  └────────────┬────────────────────┘                      │
│               │                                            │
│               ▼                                            │
│  ┌─────────────────────────────────┐                      │
│  │     SQLite Database             │                      │
│  │  data/henze_trivia.db           │                      │
│  │  ┌───────────────────────────┐  │                      │
│  │  │ questions (120 rows)      │  │                      │
│  │  │ games (history)           │  │                      │
│  │  │ game_results (per round)  │  │                      │
│  │  │ player_answers (detailed) │  │                      │
│  │  └───────────────────────────┘  │                      │
│  └────────────┬────────────────────┘                      │
│               │                                            │
│               ▼                                            │
│  ┌─────────────────────────────────┐                      │
│  │   questionMixer.js              │                      │
│  │  - Type mixing (40/60)          │                      │
│  │  - Smart ordering               │                      │
│  │  - Avoid repeats (30 days)      │                      │
│  └────────────┬────────────────────┘                      │
│               │                                            │
│               ▼                                            │
│  ┌─────────────────────────────────┐                      │
│  │   GameRoom (FSM)                │                      │
│  │  ┌───────────────────────────┐  │                      │
│  │  │ LOBBY                     │  │                      │
│  │  │   ↓                       │  │                      │
│  │  │ ASKING ← (next question)  │  │                      │
│  │  │   ↓                       │  │                      │
│  │  │ ANSWERS_LOCKED            │  │                      │
│  │  │   ↓                       │  │                      │
│  │  │ REVEAL (show answer)      │  │                      │
│  │  │   ↓                       │  │                      │
│  │  │ ROUND_END                 │  │                      │
│  │  │   ↓                       │  │                      │
│  │  │ GAME_END                  │  │                      │
│  │  └───────────────────────────┘  │                      │
│  │  Methods:                       │                      │
│  │  - getSanitizedQuestion()       │ ← Hides answer!     │
│  │  - submitAnswer()               │                      │
│  │  - voteQuestionFunny()          │                      │
│  │  - transitionTo()               │ ← Guards + hooks    │
│  └────────────┬────────────────────┘                      │
│               │                                            │
│               ▼                                            │
│  ┌─────────────────────────────────┐                      │
│  │   Socket.IO Server              │                      │
│  │  - /player namespace            │                      │
│  │  - /tv namespace                │                      │
│  │  - Rate limiting                │                      │
│  │  - Host PIN verification        │                      │
│  └────────────┬────────────────────┘                      │
│               │                                            │
│        ┌──────┴──────┐                                    │
│        ▼             ▼                                     │
│  ┌──────────┐  ┌──────────┐                              │
│  │ Players  │  │    TV    │                              │
│  │ (phones) │  │ (AirPlay)│                              │
│  └──────────┘  └──────────┘                              │
│                                                            │
│  After each game:                                         │
│  ┌─────────────────────────────────┐                      │
│  │   Learning Loop                 │                      │
│  │  - Update question stats        │                      │
│  │  - Retire poor performers       │                      │
│  │  - Upweight funny topics        │                      │
│  └─────────────────────────────────┘                      │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Database Layer (`database.js`)

**Purpose**: SQLite interface for questions, games, and learning data

**Key Methods**:
```javascript
const db = getDB();

// Questions
db.insertQuestion(question);
db.getActiveQuestions({ type, limit, excludeDays });
db.markQuestionUsed(questionId);
db.retireQuestion(questionId);

// Games
const gameId = db.createGame(numPlayers, numRounds);
db.completeGame(gameId, winner, score, duration);
db.recordQuestionResult(gameId, questionId, ...);
db.recordPlayerAnswer(gameId, questionId, playerName, ...);

// Learning
db.getQuestionsToRetire(criteria);
db.getTopQuestions(type, limit);
db.getTopTopics(limit);
db.runLearningLoop();
```

**Schema**:
- `questions`: question data + stats (times_used, correct_rate, laugh_score)
- `games`: game metadata
- `game_results`: per-question aggregates
- `player_answers`: individual answer tracking

---

### 2. GameRoom FSM (`GameRoom.js`)

**Purpose**: Finite state machine for game flow with proper guards

**States**:
```javascript
GameState {
  LOBBY,           // Players joining
  ASKING,          // Question displayed, accepting answers
  ANSWERS_LOCKED,  // All answered or timeout, preparing reveal
  REVEAL,          // Showing correct answer
  ROUND_END,       // Scoreboard, laugh voting
  GAME_END         // Final results
}
```

**Key Methods**:
```javascript
const room = new GameRoom(config);

// State management
room.transitionTo(newState);  // Throws if invalid transition
room.canTransition(toState);  // Check without transitioning

// Player management
room.addPlayer(socketId, name, socket);
room.removePlayer(socketId);
room.getAlivePlayers();
room.eliminatePlayer(playerId);

// Question management
room.loadQuestions(typeMix);
room.nextQuestion();
room.getSanitizedQuestion();      // WITHOUT correct answer
room.getQuestionWithAnswer();     // WITH correct answer (reveal only)

// Answer management
room.submitAnswer(playerId, answerIndex);
room.voteQuestionFunny(playerId);

// Game flow
room.startGame();
room.reset();
room.getGameState();  // For broadcasting to clients
```

**State Transition Guards**:
```javascript
VALID_TRANSITIONS = {
  LOBBY: [ASKING],
  ASKING: [ANSWERS_LOCKED],
  ANSWERS_LOCKED: [REVEAL],
  REVEAL: [ROUND_END],
  ROUND_END: [ASKING, GAME_END],
  GAME_END: [LOBBY]  // Reset
}
```

**Security**: `getSanitizedQuestion()` strips `answer_index` before sending to clients!

---

### 3. Question Mixer (`questionMixer.js`)

**Purpose**: Generate balanced question packs with type mixing

**Key Function**:
```javascript
const pack = generateQuestionPack(totalQuestions, typeMix, options);

// Example:
const pack = generateQuestionPack(20, {
  "trivia": 0.60,      // 12 questions
  "who-said-it": 0.15, // 3 questions
  "chaos": 0.10,       // 2 questions
  "roast": 0.15        // 3 questions
}, {
  excludeDays: 30,         // Don't repeat from last 30 days
  prioritizeLaughs: true,  // For chat questions
  balanceDifficulty: false // Even spread of easy/medium/hard
});
```

**Algorithm**:
1. Calculate count per type based on ratios
2. Fetch 2x questions for each type (buffer)
3. Select best based on criteria (laugh score, variety)
4. Shuffle within types
5. Interleave types for variety (trivia → chat → trivia → chat)

---

### 4. Question Generation (`generate_questions.py`)

**Purpose**: Create questions with OpenAI structured outputs

**Key Functions**:
```python
# Extract from iMessage
messages = extract_distinctive_messages(limit=1500)

# Generate questions with strict schemas
trivia = generate_trivia_questions(count=15)
who_said_it = generate_who_said_it_questions(messages, count=5)
roasts = generate_roast_questions(messages, count=5)

# All questions validated with Pydantic schemas
# Automatic retry if schema validation fails
```

**Pydantic Schemas**:
```python
class TriviaQuestion(BaseModel):
    type: Literal["trivia"]
    text: str = Field(min_length=10, max_length=500)
    options: List[str] = Field(min_items=4, max_items=4)
    answer_index: int = Field(ge=0, le=3)
    explanation: str
    category: str
    difficulty: Literal["easy", "medium", "hard"]

# Similar for WhoSaidItQuestion, ChaosQuestion, RoastQuestion
```

---

### 5. Server (`server_new.js`)

**Purpose**: Socket.IO server with GameRoom integration

**Socket Events**:
```javascript
// Player namespace: /player
socket.on("player:join", (payload, cb) => { ... });
socket.on("player:start", (payload, cb) => { ... });
socket.on("player:answer", (payload, cb) => { ... });
socket.on("player:laugh", (payload, cb) => { ... });  // NEW!
socket.on("player:reset", (payload, cb) => { ... });

// TV namespace: /tv
// (just receives broadcasts)
```

**Security Features**:
- Rate limiting (20 actions per 10s per socket)
- HOST_PIN verification (must not be "1234")
- Token validation on all actions
- Sanitized payloads (no correct answers during game)

---

## Data Flow

### Question Loading (Startup)

```
1. Server starts
2. GameRoom.loadQuestions() called
3. questionMixer.generateQuestionPack() called
4. database.getActiveQuestions() for each type
5. Questions selected based on:
   - Not used in last 30 days
   - High laugh scores (for chat questions)
   - Low times_used (fairness)
6. Pack shuffled and ordered strategically
7. GameRoom.questionPool populated
```

### During Game (ASKING → REVEAL)

```
1. GameRoom.nextQuestion()
   - Moves to next question in pool
   - Marks as used in database
   - Clears answers/votes

2. Client requests game state
   - GameRoom.getSanitizedQuestion()
   - Returns question WITHOUT answer_index
   - Clients cannot see correct answer!

3. Players submit answers
   - GameRoom.submitAnswer(playerId, answerIndex)
   - Stored in answers Map
   - When all answered OR timeout:
     - Transition to ANSWERS_LOCKED
     - After 500ms → REVEAL

4. REVEAL state
   - GameRoom.getQuestionWithAnswer()
   - NOW includes correctAnswer field
   - Players see if they were right/wrong
   - Can vote funny

5. ROUND_END
   - GameRoom._recordRoundResults()
   - Writes to database:
     * game_results (aggregate)
     * player_answers (individual)
   - After 3s → next round or GAME_END
```

### After Game (Learning Loop)

```
1. GameRoom._finalizeGame()
   - Records winner in database
   - Triggers learning loop

2. database.runLearningLoop()
   - Updates question stats:
     * avg_answer_time_ms
     * correct_rate
     * laugh_score
   - Identifies poor performers:
     * Too easy (>95% correct)
     * Too hard (<15% correct)
     * Not funny (<0.1 laugh score)
   - Calls retireQuestion() for each

3. Retired questions excluded from future packs
```

---

## File Structure

```
henze-trivia/
├── data/
│   └── henze_trivia.db          # SQLite database
├── scripts/
│   ├── generate_questions.py    # OpenAI question gen
│   └── migrate_csv_to_sqlite.js # CSV import
├── web-app/
│   ├── database.js              # DB layer
│   ├── GameRoom.js              # FSM
│   ├── questionMixer.js         # Type mixing
│   ├── server_new.js            # Socket.IO server
│   ├── validation.js            # Zod schemas (unchanged)
│   └── app/
│       ├── components/
│       │   └── LaughButton.tsx  # Laugh voting UI
│       ├── page.tsx             # Player UI
│       └── tv/page.tsx          # TV display
└── MIGRATION_GUIDE.md           # Setup instructions
```

---

## Common Operations

### Add New Questions

```bash
# Generate with OpenAI
python scripts/generate_questions.py

# Or manually insert
node -e "
const {getDB} = require('./web-app/database');
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
"
```

### View Question Stats

```bash
# Top questions by laugh score
node -e "
const {getDB} = require('./web-app/database');
console.table(getDB().getTopQuestions('roast', 10));
"

# Questions to retire
node -e "
const {getDB} = require('./web-app/database');
console.table(getDB().getQuestionsToRetire());
"
```

### Manually Run Learning Loop

```bash
node -e "
const {getDB} = require('./web-app/database');
const results = getDB().runLearningLoop();
console.log('Updated:', results.questionsUpdated);
console.log('Retired:', results.questionsRetired);
"
```

### Check Database Health

```bash
sqlite3 data/henze_trivia.db "
SELECT
  type,
  COUNT(*) as total,
  AVG(times_used) as avg_uses,
  AVG(correct_rate) as avg_correct,
  AVG(laugh_score) as avg_laughs
FROM questions
WHERE retired_at IS NULL
GROUP BY type;
"
```

---

## Configuration Cheat Sheet

### GameRoom Config

| Option | Default | Description |
|--------|---------|-------------|
| `maxPlayers` | 8 | Max players per game |
| `maxLives` | 3 | Lives before elimination |
| `maxRounds` | 20 | Questions per game |
| `askingTimeoutMs` | 30000 | Time to answer (30s) |
| `revealDelayMs` | 500 | Delay before reveal |
| `roundEndDelayMs` | 3000 | Pause after round |
| `pointsPerCorrect` | 100 | Points per correct answer |

### Question Type Mix

| Type | Default Ratio | Description |
|------|---------------|-------------|
| `trivia` | 60% | General knowledge |
| `who-said-it` | 15% | Chat quote attribution |
| `chaos` | 10% | Message patterns |
| `roast` | 15% | Personality questions |

### Learning Loop Thresholds

| Threshold | Default | Description |
|-----------|---------|-------------|
| `minUses` | 5 | Min plays before retirement |
| `maxCorrectRate` | 0.95 | Retire if too easy |
| `minCorrectRate` | 0.15 | Retire if too hard |
| `minLaughScore` | 0.1 | Retire if not funny |

---

## Comparison: Old vs New

| Feature | Old (CSV) | New (SQLite + FSM) |
|---------|-----------|-------------------|
| Question Storage | CSV files | SQLite database |
| State Management | Global object | GameRoom FSM |
| Answer Security | ⚠️ Sent to clients | ✅ Hidden until reveal |
| Concurrent Games | ❌ Shared state | ✅ Per-instance (ready for multi-room) |
| Learning Loop | ❌ None | ✅ Automatic |
| Question Retirement | ❌ Manual | ✅ Automatic |
| Type Mixing | ❌ Random | ✅ Configurable ratios |
| Race Conditions | ⚠️ Possible | ✅ Guarded transitions |
| Rate Limiting | ⚠️ API only | ✅ Socket.IO included |
| Performance Tracking | ❌ None | ✅ Per-question stats |

---

## Next Steps

1. Run migration: `node scripts/migrate_csv_to_sqlite.js`
2. Update server: `mv web-app/server.js web-app/server_old.js && mv web-app/server_new.js web-app/server.js`
3. Set strong PIN: Add `HOST_PIN=...` to `.env`
4. Start server: `npm run dev`
5. Play test game with laugh voting
6. Generate fresh questions: `python scripts/generate_questions.py`
7. Monitor learning loop output

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed instructions.
