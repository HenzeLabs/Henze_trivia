# 🎮 Henze Trivia

A Jackbox-style multiplayer trivia game with AI-generated questions from your iMessage group chats!

## ✨ Features

- **📺 TV Display Mode** - Main screen shows questions, answers, and scores (perfect for AirPlay to Apple TV)
- **📱 Phone Controls** - Each player answers on their own device
- **🤖 AI-Powered Questions** - Personalized trivia generated from your actual group chat history
- **4 Question Types**:
  - **Standard Trivia** - General questions about your conversations
  - **"Who Said It?"** - Quote attribution challenges
  - **Chaos Questions** - Late-night and weekend message patterns
  - **Roast Mode** - Savage personality analysis
- **💀 Trivia Murder Party Style** - 3 lives, lose one per wrong answer, last survivor wins
- **🏆 Scoring System** - 100 points per correct answer
- **100% Local** - Everything runs on your Mac, no cloud services needed

---

## 🚀 Quick Start

### First Time Setup

1. **Install Python Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Install Node Dependencies**
   ```bash
   cd web-app
   npm install
   cd ..
   ```

3. **Configure Environment**

   Create a `.env` file in the project root:
   ```bash
   OPENAI_API_KEY=sk-your-openai-api-key-here
   CHAT_DB_PATH=~/Library/Messages/chat.db
   HOST_PIN=1234
   ```

4. **Grant Full Disk Access**

   Go to **System Settings** → **Privacy & Security** → **Full Disk Access**

   Add your terminal app (Terminal.app or iTerm) and restart it.

### Running the Game

**Simple Method (Recommended):**
```bash
./start-game.sh
```

This automatically:
1. Extracts messages from iMessage
2. Generates 30 personalized questions
3. Starts the game server

**Manual Method:**
```bash
# Extract messages
python chat_extractor/extract_messages.py

# Generate questions
python generate_questions.py --all --num 30

# Start server
cd web-app && npm run dev
```

---

## 🎮 How to Play

### Setup Two Screens

**Main Display (TV):**
- Open `http://192.168.x.x:3000/tv` (use the IP shown in terminal)
- AirPlay this to your Apple TV, or display on a big screen

**Player Devices (Phones):**
- Open `http://192.168.x.x:3000` (same IP, but without `/tv`)
- Each player joins with their name

### Game Flow

1. **Lobby** - Players join and see their names on TV
2. **Host Starts** - Enter your HOST_PIN to begin
3. **Questions** - Players answer on their phones, TV shows the question
4. **Reveal** - TV shows correct answer and who got it right
5. **Elimination** - Players with 0 lives become "ghosts"
6. **Winner** - Last survivor (or highest score) wins!

---

## 📁 Project Structure

```
henze-trivia/
├── chat_extractor/
│   └── extract_messages.py       # Extracts iMessage data
├── openai_agent/
│   ├── trivia_bot.py             # Standard trivia generator
│   ├── who_said_it.py            # Quote attribution generator
│   ├── chaos_questions.py        # Timing pattern generator
│   └── roast_mode.py             # Roast analysis generator
├── web-app/
│   ├── server.js                 # Game server (Socket.IO + Next.js)
│   ├── questionLoader.js         # Loads questions from CSV files
│   ├── gameLogic.js              # Game state management
│   ├── app/page.tsx              # Player interface
│   └── app/tv/page.tsx           # TV display screen
├── output/
│   ├── chat_export.csv           # Extracted messages
│   ├── sample_questions.csv      # Generated trivia
│   ├── who_said_it_questions.csv
│   ├── chaos_questions.csv
│   └── roast_mode_questions.csv
├── utils/
│   └── mapping.py                # Phone number → name mapping
├── generate_questions.py         # Main question generator CLI
├── start-game.sh                 # One-command startup script
├── QUICKSTART.md                 # Detailed getting started guide
└── requirements.txt              # Python dependencies
```

---

## ⚙️ Configuration

### Group Chats

Edit [chat_extractor/extract_messages.py](chat_extractor/extract_messages.py:29-35) to change which group chats are extracted:

```python
TARGET_GROUP_CHATS = [
    'chat217815241574198689',  # Your group chat ID
    # Add more...
]
```

### Player Names

Edit [utils/mapping.py](utils/mapping.py:7-37) to map phone numbers to player names:

```python
CONTACT_MAPPING = {
    "+15551234567": "Player Name",
    # Add more...
}
```

### Game Settings

Edit [web-app/gameLogic.js](web-app/gameLogic.js:16) to change game length:

```javascript
maxRounds: 20,  // Change this number
```

---

## 🔧 Troubleshooting

**"No questions loaded"**
- Run `python generate_questions.py --all` before starting server

**"Permission denied" accessing chat.db**
- Enable Full Disk Access for your terminal
- Restart your terminal after enabling

**Players can't connect on phones**
- Make sure all devices are on the same WiFi network
- Use the IP address shown in terminal (not "localhost")

**Questions seem old/stale**
- Delete `output/chat_export.csv`
- Run `./start-game.sh` again to extract fresh messages

**Server won't start (port 3000 in use)**
```bash
lsof -ti:3000 | xargs kill -9
```

---

## 📝 Technical Details

**Stack:**
- **Backend**: Python 3.13, OpenAI GPT-4o-mini
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Real-time**: Socket.IO
- **Database**: SQLite (iMessage), CSV (questions)

**Architecture:**
- Local-only, no cloud dependencies
- In-memory game state (resets on server restart)
- Questions loaded from CSV files on startup
- Real-time updates via WebSocket

**Data Flow:**
```
iMessage DB → Extract → CSV → OpenAI → Questions CSV → Game Server → Players
```

---

## 🎯 Tips

- Generate more questions by changing `--num 30` to a higher number in `start-game.sh`
- Mix up question types by regenerating frequently
- Fresh questions pull from the last 6 months of messages
- Each game randomly selects questions from the full pool

---

## 📄 License

Personal use only. Built for friend group entertainment.

---

## 🙋 Support

See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions.

See [CHANGELOG.md](CHANGELOG.md) for recent changes and simplifications.

Enjoy the game! 🎮
