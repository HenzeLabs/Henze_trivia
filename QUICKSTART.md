# Henze Trivia - Quick Start Guide

## What This Is
A Jackbox-style trivia game with personalized questions from your iMessage group chats!

- **TV Display**: Shows questions, answers, and scores (AirPlay to Apple TV)
- **Player Screens**: Each player answers on their phone
- **Personalized Questions**: Generated from your 5 group chats using AI

---

## Setup (First Time Only)

### 1. Install Dependencies

**Python:**
```bash
pip install -r requirements.txt
```

**Node.js:**
```bash
cd web-app
npm install
cd ..
```

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
# OpenAI API Key (for generating questions)
OPENAI_API_KEY=your_openai_api_key_here

# Path to iMessage database (default is fine for most Macs)
CHAT_DB_PATH=~/Library/Messages/chat.db

# Host PIN (protect game start - set whatever you want)
HOST_PIN=1234
```

### 3. Grant Full Disk Access

Your terminal needs permission to read iMessage:

1. Open **System Settings** → **Privacy & Security** → **Full Disk Access**
2. Add your terminal app (Terminal.app or iTerm.app)
3. Restart your terminal

---

## Running the Game

### Simple Method (Recommended)

```bash
./start-game.sh
```

This will:
1. Extract messages from your 5 group chats
2. Generate 30 personalized trivia questions
3. Start the game server

### Manual Method

```bash
# Step 1: Extract messages
python chat_extractor/extract_messages.py

# Step 2: Generate questions
python generate_questions.py --all --num 30

# Step 3: Start server
cd web-app
npm run dev
```

---

## Playing the Game

### On TV (Main Display)
1. Open the URL shown in terminal
2. Add `/tv` to the end: `http://192.168.x.x:3000/tv`
3. AirPlay this to your Apple TV (or just display on a big screen)

### On Phones (Player Screens)
1. Each player opens the URL (without `/tv`)
2. Enter your name and join
3. Wait for everyone to join
4. Host enters PIN and starts game

### Game Flow
1. **Lobby**: Players join
2. **Question**: Everyone answers on their phone
3. **Reveal**: TV shows correct answer
4. **Next**: Automatically moves to next question
5. **Final**: Last survivor wins!

---

## Group Chats Being Used

Your questions are generated from these 5 group chats:
- **1280 Gang Bang**
- **It's Only Gay If You Push Back**
- **Just a Bowl**
- **OG 1280**
- **O.G 1280 crew**

Players mapped:
- Lauren (you)
- Benny Harris
- Gina Ortiz
- Ian O'Malley
- Jackson

---

## Question Types

All 4 question types are included:

1. **Standard Trivia**: General questions about your conversations
2. **Who Said It?**: Guess who said a specific quote
3. **Chaos Questions**: Late-night/weekend message patterns
4. **Roast Mode**: Savage personality analysis

---

## Tips

- **Generate more questions**: Edit `start-game.sh` and change `--num 30` to a higher number
- **Shorter games**: Edit [web-app/gameLogic.js](web-app/gameLogic.js:16) and change `maxRounds: 20` to a lower number
- **Regenerate questions**: Just run `./start-game.sh` again - it will extract fresh messages and generate new questions

---

## Troubleshooting

**"No questions loaded"**
- Run `python generate_questions.py --all` before starting the server

**"Permission denied" for chat.db**
- Make sure Full Disk Access is enabled for your terminal

**"Cannot connect" on phones**
- Make sure all devices are on the same WiFi network
- Use the IP address shown in terminal (not "localhost")

**Questions seem stale**
- Delete `output/chat_export.csv` and run `./start-game.sh` again

---

## Technical Details

**Local Only**: Everything runs on your Mac - no cloud services, no external databases

**Files**:
- `chat_extractor/extract_messages.py` - Reads iMessage database
- `generate_questions.py` - Generates questions using OpenAI
- `web-app/server.js` - Game server with Socket.IO
- `web-app/app/page.tsx` - Player interface
- `web-app/app/tv/page.tsx` - TV display

**Ports**:
- `3000` - Web server (default)

Enjoy the game! 🎮
