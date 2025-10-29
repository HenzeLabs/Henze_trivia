# 🎮 TEST YOUR TRIVIA GAME

## ✅ Server is Running!

Your trivia game server is now running with your new savage questions loaded!

---

## 🌐 URLs to Open

### 📱 Player Screen (Your Phone/Computer)
Open this in your browser to play:
```
http://localhost:3000
```

Or on another device on your network:
```
http://10.0.1.66:3000
```

### 📺 TV Display Screen
Open this on a TV/big screen to show questions and scores:
```
http://localhost:3000/tv
```

Or on another device:
```
http://10.0.1.66:3000/tv
```

---

## 🎯 How to Test

### 1. **Open TV Display First**
- Open http://localhost:3000/tv in a browser
- This will show the waiting room, then questions, then scores
- Keep this window visible on your big screen

### 2. **Open Player Screen(s)**
- Open http://localhost:3000 in another browser/tab/device
- You'll see the player join screen
- Enter a name (like "Lauren" or "Benny")
- Click "Join Game"

### 3. **Play Multiple Players** (For Testing)
- Open the player URL in multiple tabs/browsers
- Use different names: Lauren, Benny, Ian, Gina, etc.
- Each tab acts as a different player

### 4. **Start the Game**
- On any player screen, click "Start Game"
- The TV will show the first question
- Players answer on their devices
- Scores appear on the TV after each question

---

## 🎮 Game Flow

```
┌──────────────────┐
│  TV Display      │  ← Shows questions & scores to everyone
│  (localhost/tv)  │
└──────────────────┘
         ↑
         │ Shows what's happening
         │
┌────────┴─────────┐
│  Game Server     │  ← Manages game state
│  (backend)       │
└────────┬─────────┘
         │
         ↓ Players answer here
┌──────────────────┐
│  Player Screens  │  ← Your phone/device
│  (localhost:3000)│
└──────────────────┘
```

---

## 📊 Current Questions Loaded

The server loaded questions from:
- ✅ Sample questions (trivia)
- ✅ Who said it questions
- ✅ Chaos questions
- ✅ Roast mode questions
- ✅ **NEW: Savage pack (36 questions!)**
- ✅ **NEW: General trivia (10 questions!)**

**Total:** 12+ questions loaded and ready!

---

## 🔍 Testing Checklist

- [ ] Open TV display at http://localhost:3000/tv
- [ ] See waiting room on TV
- [ ] Open player screen at http://localhost:3000
- [ ] Join game with your name
- [ ] See your name appear on TV
- [ ] Open 2-3 more player tabs with different names
- [ ] Click "Start Game" on any player screen
- [ ] See first question appear on TV
- [ ] Answer question on player screen
- [ ] See results/scores on TV
- [ ] Continue through multiple questions
- [ ] See final scoreboard

---

## 🐛 Troubleshooting

### "Can't connect to server"
→ Make sure the server is running. Check terminal for errors.

### "No questions showing"
→ Server logs show only 12 questions loaded. Let me check the database...

### "TV not updating"
→ Refresh the TV page. Make sure socket.io is connecting.

### "Players not syncing"
→ All devices must be on same network and able to reach the server.

---

## 🎉 What You Should See

### TV Display Shows:
1. **Waiting Room** - List of players who joined
2. **Questions** - The question text + 4 options
3. **Who Answered** - Real-time updates as players answer
4. **Results** - Correct answer + who got it right
5. **Scoreboard** - Running scores after each question
6. **Final Results** - Winner at the end!

### Player Screen Shows:
1. **Join Screen** - Enter your name
2. **Waiting Room** - Shows other players
3. **Question** - 4 buttons (A, B, C, D) to answer
4. **Waiting** - "Waiting for other players..."
5. **Results** - If you got it right/wrong
6. **Scores** - Your score vs others

---

## 🚀 Ready to Play!

**Open these URLs now:**

1. **TV:** http://localhost:3000/tv
2. **Player 1:** http://localhost:3000
3. **Player 2:** http://localhost:3000 (in new tab)
4. **Player 3:** http://localhost:3000 (in new tab)

Then start playing and see your savage questions in action! 🔥

---

**Need help?** Check the server logs in your terminal for any errors.
**Want more questions?** Run `python3 fetch_general_trivia.py` to get more!
