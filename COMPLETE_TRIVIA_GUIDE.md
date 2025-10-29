# Complete Trivia Game Setup Guide

## 🎯 What You Have Now

### Question Sources

1. **Your Savage Group Chat Questions** (34 questions)
   - Generated from 5,360 actual messages
   - Includes "Who Said It?" with real quotes
   - Savage stats (who curses most, night owl, etc.)
   - Location: `output/all_trivia_questions.csv`

2. **General Trivia Questions** (10 questions from Open Trivia DB)
   - General knowledge, history, science
   - Multiple choice format
   - Location: `output/general_trivia_questions.csv`

3. **Mixed Question Packs** (4 different combinations)
   - Ready-to-use packs with different ratios
   - See details below

---

## 📦 Question Packs Available

### Pack 1: SAVAGE MODE 🔥
**File:** `output/pack_savage_mode.csv`
**Total:** 36 questions
**Mix:** 60% group chat + 40% general trivia
**Best for:** Maximum chaos with your friend group!

### Pack 2: BALANCED ⚖️
**File:** `output/pack_balanced.csv`
**Total:** 27 questions
**Mix:** 40% group chat + 60% general trivia
**Best for:** Mix of roasting friends and actual trivia

### Pack 3: MILD ROAST 😊
**File:** `output/pack_mild_roast.csv`
**Total:** 18 questions
**Mix:** 20% group chat + 80% general trivia
**Best for:** When you want to play it safe

### Pack 4: EVERYTHING 🎲
**File:** `output/pack_everything.csv`
**Total:** 44 questions
**Mix:** All questions shuffled together
**Best for:** Maximum variety

---

## 🛠️ How to Get More Questions

### Option 1: Fetch More General Trivia (Free, No API Key)

Run this anytime to fetch 40+ new questions from Open Trivia DB:

```bash
python3 fetch_general_trivia.py
```

This will fetch questions from:
- General Knowledge
- Film & TV
- Music
- Science & Nature
- Sports
- Geography
- History

**Note:** The API rate limits, so you may get fewer questions. Just run it multiple times with a few minutes between runs.

### Option 2: Generate Pop Culture Questions (Requires OpenAI API Key)

1. **Update your .env file** with a valid OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-key-here
   ```

2. **Run the trivia bot** to generate AI-powered questions:
   ```bash
   cd openai_agent
   python trivia_bot.py --num 20 --difficulty medium
   ```

   This generates questions based on:
   - Your actual chat messages
   - Savage roasts and inside jokes
   - Current pop culture (if prompted)

### Option 3: Generate More Savage Group Chat Questions

Already done! But you can:
- Export more conversations from iMessage
- Run `python3 generate_savage_trivia.py` again with new data
- Adjust the keywords/patterns to find different types of savage quotes

---

## 🎮 Tools & Scripts Reference

### Message Export Tools
- **Location:** `imessage-analyze-and-export/`
- **Main script:** `python3 imessage.py` (1-on-1 chats)
- **Group chat script:** `python3 group_export.py` (group chats)

### Analysis & Generation Scripts
1. **`analyze_messages.py`** - Analyzes messages and generates statistics
2. **`generate_trivia_csv.py`** - Creates regular trivia from messages
3. **`generate_savage_trivia.py`** - Creates SAVAGE questions with curse words
4. **`fetch_general_trivia.py`** - Fetches external trivia questions
5. **`combine_all_questions.py`** - Combines everything into mixed packs

### OpenAI Bot (Advanced)
- **Location:** `openai_agent/trivia_bot.py`
- **Usage:** `python trivia_bot.py --num 10 --difficulty medium --display`
- **Features:** AI-powered savage questions based on your chats

---

## 📊 Current Stats

### Your Group Chat Data
- **Messages Analyzed:** 5,360
- **People:** Benny, Lauren, Ian, Gina, Shan, Jackson
- **Conversations:**
  - Lauren-Benny: 1,952 messages
  - Lauren-Gina: 889 messages
  - Lauren-Ian: 618 messages
  - Lauren-Shan: 491 messages
  - OG 1280 group: 583 messages
  - 1280 Gang Bang: 495 messages
  - Just a Bowl: 189 messages
  - It's Only Gay If You Push Back: 64 messages

### Savage Highlights
- **Biggest Potty Mouth:** Benny (104 curse words!)
- **Most "fuck"s:** Benny (32 times)
- **Night Owl:** Benny (116 messages 12am-6am)
- **Emoji Queen:** Lauren (270 emojis)
- **Dog Mom:** Lauren (47 mentions of Cranberry/Bentley)
- **Kroger Hater:** Benny

---

## 🚀 Quick Start Guide

### To Use in Your Trivia Game:

1. **Choose a pack** based on your audience:
   - Friends who can take savage roasts? → `pack_savage_mode.csv`
   - Mixed audience? → `pack_balanced.csv`
   - Playing it safe? → `pack_mild_roast.csv`

2. **Import into your game:**
   - All CSVs use the same format
   - Columns: `question`, `correct_answer`, `explanation`, `difficulty`, `category`, `option_A/B/C/D`

3. **Test it out!**

### To Generate Fresh Questions:

```bash
# Get more general trivia (free)
python3 fetch_general_trivia.py

# Generate savage questions from your messages
python3 generate_savage_trivia.py

# Combine everything into new packs
python3 combine_all_questions.py
```

---

## 🔄 Workflow for Adding New Conversations

Want to add more people or groups to your trivia?

1. **Export new conversations:**
   ```bash
   cd imessage-analyze-and-export
   python3 imessage.py           # For 1-on-1
   python3 group_export.py        # For groups
   ```

2. **Regenerate questions:**
   ```bash
   cd ..
   python3 generate_savage_trivia.py
   ```

3. **Combine with general trivia:**
   ```bash
   python3 combine_all_questions.py
   ```

---

## 💡 Pro Tips

1. **Rate Limiting:** Open Trivia DB limits requests. If you get errors, wait 5 minutes and try again.

2. **OpenAI Costs:** If you use the AI bot, it costs ~$0.01-0.05 per 10 questions (very cheap with gpt-4o-mini).

3. **Question Quality:** The savage questions get better with more message data. Export more conversations!

4. **Customization:** Edit the scripts to:
   - Change difficulty ratios
   - Filter by specific keywords
   - Adjust savage level
   - Focus on specific topics

---

## 📝 CSV Format

All question files use this format:

```csv
question,correct_answer,explanation,difficulty,category,option_A,option_B,option_C,option_D
"Who curses the most?",A,"Benny dropped 104 curse words!",easy,Savage Stats,Benny,Lauren,Ian,Gina
```

- **correct_answer:** Letter A, B, C, or D
- **difficulty:** easy, medium, or hard
- **category:** Any string (Stats, Who Said It, Pop Culture, etc.)
- **explanation:** Shows after answering (optional)

---

## ❓ Troubleshooting

### "No questions fetched from API"
→ Open Trivia DB might be rate limiting. Wait 5-10 minutes.

### "OpenAI API error"
→ Check your `.env` file has a valid API key:
```bash
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

### "Not enough messages for analysis"
→ Export more conversations from iMessage using the export tools.

### "CSV format doesn't match game"
→ All CSVs follow the same format. Check your game's import function.

---

## 🎉 You're All Set!

You now have:
- ✅ 34 savage group chat questions
- ✅ 10 general trivia questions
- ✅ 4 ready-to-use mixed packs
- ✅ Tools to generate unlimited new questions
- ✅ Scripts to fetch free trivia anytime

**Happy trivia-ing! 🎊**

---

Generated: October 29, 2025
Total Questions Available: 44+
Ready for Maximum Chaos! 🔥
