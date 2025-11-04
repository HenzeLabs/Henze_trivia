# Quick Install - Trivia Auto-Tester

## 1. Install Tampermonkey

**Chrome/Edge:** https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo

**Firefox:** https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/

## 2. Install the Script

1. Click Tampermonkey icon → **"Create a new script"**
2. Delete all existing content
3. Copy **ALL** content from `trivia-game-auto-tester.user.js`
4. Paste into editor
5. Press **Ctrl+S** (or **Cmd+S**) to save
6. Close the editor tab

## 3. Test It

1. Go to: https://henze-trivia.onrender.com
2. You should see a **green control panel** in the top-right
3. The bot will automatically:
   - ✓ Join the game
   - ✓ Start the game
   - ✓ Answer all questions

## 4. Multi-Player Testing

Open 2-4 browser tabs with the same URL. Each tab gets a unique `AutoBot_XXXX` name.

## Control Panel

```
🤖 AUTO-TESTER
Name: AutoBot_1234
Joined: ✓
Started: ✓
Questions: 5
Correct: 2
[Join: ON] [Start: ON] [Answer: ON]
```

Click buttons to toggle features.

## Console Commands

Press **F12** to open console, then:

```javascript
// Get stats
window.triviaAutoTester.getStats()
// { questionsAnswered: 5, correctAnswers: 2, accuracy: "40.0%" }

// Force actions
window.triviaAutoTester.forceJoin()
window.triviaAutoTester.forceStart()
window.triviaAutoTester.forceAnswer()

// Change config
window.triviaAutoTester.config.ANSWER_DELAY = 2000  // 2 second delay
```

## Troubleshooting

### Script Not Working?

1. Check Tampermonkey icon is **green** (enabled)
2. Refresh page: **Ctrl+Shift+R** (or **Cmd+Shift+R**)
3. Check console (F12) for errors

### Bot Not Joining?

```javascript
// Manually trigger join
window.triviaAutoTester.forceJoin()
```

### Clear Cache

If you see old bugs:

```javascript
caches.keys().then(k => Promise.all(k.map(n => caches.delete(n)))).then(() => location.reload(true))
```

## Full Documentation

See [TESTING-GUIDE.md](TESTING-GUIDE.md) for:
- Detailed test scenarios
- Performance testing
- Reporting bugs
- Advanced usage

---

**Ready to test!** Load the page and watch the bot play automatically.
